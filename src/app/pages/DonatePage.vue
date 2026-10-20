<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { t, type Key } from '@/shared/i18n'

const repo = 'https://github.com/mort3za/lingomingo'

// Icons: SVG path data in the Lucide style (24×24, stroke).
const heart =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
const githubIcon = [
  'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
  'M9 18c-4.51 2-5-2-7-2',
]
const bitcoinIcon = [
  'M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727',
]

const helps: { label: Key; icon: string[] }[] = [
  {
    label: 'donate.features',
    icon: [
      'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
      'M20 2v4',
      'M22 4h-4',
      'M2 20a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    ],
  },
  {
    label: 'donate.languages',
    icon: ['m5 8 6 6', 'm4 14 6-6 2-3', 'M2 5h12', 'M7 2h1', 'm22 22-5-10-5 10', 'M14 18h6'],
  },
  {
    label: 'donate.bugs',
    icon: [
      'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z',
    ],
  },
]

const starIcon = [
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
]
const bugIcon = [
  'M12 20v-9',
  'M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z',
  'M14.12 3.88 16 2',
  'M21 21a4 4 0 0 0-3.81-4',
  'M21 5a4 4 0 0 1-3.55 3.97',
  'M22 13h-4',
  'M3 21a4 4 0 0 1 3.81-4',
  'M3 5a4 4 0 0 0 3.55 3.97',
  'M6 13H2',
  'm8 2 1.88 1.88',
  'M9 7.13V6a3 3 0 1 1 6 0v1.13',
]
const linkIcon = [
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
]

const iconAttrs = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const
const tileClass =
  'group flex flex-col gap-2 rounded-lg bg-panel p-4 text-start text-sm transition-colors hover:bg-fg/10'

const copied = ref(false)
async function copyLink() {
  await navigator.clipboard.writeText(repo)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// The NOWPayments widget loads only when the dialog opens: no third-party request before.
const cryptoOpen = ref(false)
function onKeydown(e: KeyboardEvent) {
  if (cryptoOpen.value && e.key === 'Escape') cryptoOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="max-w-2xl space-y-10">
    <section
      class="relative overflow-hidden rounded-xl border border-accent/25 bg-linear-to-br from-accent/20 via-accent/5 to-transparent p-5 sm:p-8"
    >
      <svg
        v-bind="iconAttrs"
        class="pointer-events-none absolute -end-6 -top-6 size-48 rotate-12 text-accent/10"
        fill="currentColor"
        stroke="none"
      >
        <path :d="heart" />
      </svg>
      <div class="relative space-y-4">
        <h1 class="text-3xl font-semibold">{{ t('donate.title') }}</h1>
        <p class="max-w-md text-neutral-300">{{ t('donate.intro') }}</p>
        <div class="flex flex-wrap items-center gap-4 pt-2">
          <a
            href="https://github.com/sponsors/mort3za"
            target="_blank"
            class="group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
          >
            <svg
              v-bind="iconAttrs"
              class="size-5 transition-transform group-hover:scale-125"
              fill="currentColor"
              stroke="none"
            >
              <path :d="heart" />
            </svg>
            {{ t('donate.sponsor') }}
          </a>
          <button
            class="group inline-flex items-center gap-2 rounded-lg border border-fg/20 px-5 py-2.5 font-medium text-fg transition hover:border-fg/40 hover:bg-fg/5"
            @click="cryptoOpen = true"
          >
            <svg
              v-bind="iconAttrs"
              class="size-5 text-amber-400 transition-transform group-hover:rotate-12"
            >
              <path v-for="d in bitcoinIcon" :key="d" :d="d" />
            </svg>
            {{ t('donate.crypto') }}
          </button>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-400">
          <span class="flex items-center gap-1.5">
            <svg v-bind="iconAttrs" class="size-4">
              <path v-for="d in githubIcon" :key="d" :d="d" />
            </svg>
            {{ t('donate.monthly') }}
          </span>
          <span class="flex items-center gap-1.5">
            <svg v-bind="iconAttrs" class="size-4">
              <path v-for="d in bitcoinIcon" :key="d" :d="d" />
            </svg>
            {{ t('donate.anyCoin') }}
          </span>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('donate.paysFor') }}</h2>
      <div class="grid gap-3 sm:grid-cols-3">
        <div
          v-for="item in helps"
          :key="item.label"
          class="flex items-center gap-3 rounded-lg bg-panel p-4 text-sm"
        >
          <span
            class="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
          >
            <svg v-bind="iconAttrs" class="size-5">
              <path v-for="d in item.icon" :key="d" :d="d" />
            </svg>
          </span>
          {{ t(item.label) }}
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('donate.otherWays') }}</h2>
      <p class="text-sm text-neutral-400">{{ t('donate.noMoney') }}</p>
      <div class="grid gap-3 sm:grid-cols-3">
        <a :href="repo" target="_blank" :class="tileClass">
          <svg
            v-bind="iconAttrs"
            class="size-5 text-neutral-400 transition-colors group-hover:text-yellow-400"
          >
            <path v-for="d in starIcon" :key="d" :d="d" />
          </svg>
          <span class="font-medium">{{ t('donate.star') }}</span>
          <span class="text-neutral-400">{{ t('donate.starHint') }}</span>
        </a>
        <a :href="`${repo}/issues/new`" target="_blank" :class="tileClass">
          <svg
            v-bind="iconAttrs"
            class="size-5 text-neutral-400 transition-colors group-hover:text-fg"
          >
            <path v-for="d in bugIcon" :key="d" :d="d" />
          </svg>
          <span class="font-medium">{{ t('donate.report') }}</span>
          <span class="text-neutral-400">{{ t('donate.reportHint') }}</span>
        </a>
        <button :class="tileClass" @click="copyLink">
          <svg
            v-bind="iconAttrs"
            class="size-5 text-neutral-400 transition-colors group-hover:text-fg"
          >
            <path v-for="d in linkIcon" :key="d" :d="d" />
          </svg>
          <span class="font-medium">{{ t('donate.tell') }}</span>
          <span :class="copied ? 'text-green-400' : 'text-neutral-400'">
            {{ copied ? t('donate.copied') : t('donate.copy') }}
          </span>
        </button>
      </div>
    </section>
    <div
      v-if="cryptoOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 sm:p-6"
      @click.self="cryptoOpen = false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crypto-title"
        class="flex max-h-full max-w-full flex-col gap-4 overflow-auto rounded-lg bg-panel p-4 shadow-xl sm:p-6"
      >
        <div class="flex items-center justify-between">
          <h2 id="crypto-title" class="text-xl font-semibold">{{ t('donate.crypto') }}</h2>
          <button
            class="text-xl text-fg/60 hover:text-fg"
            :title="t('common.closeEsc')"
            @click="cryptoOpen = false"
          >
            ✕
          </button>
        </div>
        <div
          class="relative grid h-[623px] w-[346px] shrink-0 place-items-center rounded-lg bg-surface text-sm text-neutral-500"
        >
          {{ t('common.loading') }}
          <iframe
            src="https://nowpayments.io/embeds/donation-widget?api_key=178365c4-60b0-47ba-a1af-1c06f0841cbd"
            :title="t('donate.widget')"
            class="absolute inset-0 size-full rounded-lg border-0"
            scrolling="no"
          />
        </div>
      </div>
    </div>
  </div>
</template>
