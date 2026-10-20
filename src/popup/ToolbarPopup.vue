<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { footerLinks, iconAttrs, mainLinks } from '@/app/nav'
import { saveNow, useSettings } from '@/app/settings'
import StudyLangSwitcher from '@/app/StudyLangSwitcher.vue'
import { formatNumber, t } from '@/shared/i18n'
import { ratingDone, REVIEW_URL } from '@/shared/rating'
import { isDue, learningWords } from '@/shared/review'
import { getSavedItems, onStorageKey } from '@/shared/storage'
import { aiConfigured, type SavedItem } from '@/shared/types'

const props = defineProps<{ rating: boolean }>()

const { settings, loaded } = useSettings()
// Wait for the stored settings: the defaults have no API key and would show the warning.
const ready = ref(false)
void loaded.then(() => (ready.value = true))
const aiMissing = computed(() => ready.value && !aiConfigured(settings.value))
// The popup closes on any click outside it, before the usual save delay ends: save at once.
watch(settings, () => void saveNow(), { deep: true, flush: 'post' })
const on = computed(() => settings.value.enabled)

const links = [...mainLinks, ...footerLinks.filter((l) => l.to === '/settings')]

/** Words of the study language to review now. */
const items = ref<SavedItem[]>([])
const due = computed(() => {
  const now = Date.now()
  return learningWords(items.value, settings.value.studyLang).filter((w) => isDue(w, now)).length
})
const refreshItems = async () => (items.value = await getSavedItems())
let stop = () => {}
onMounted(() => {
  void refreshItems()
  stop = onStorageKey('savedItems', refreshItems)
})
onBeforeUnmount(() => stop())

const APP_URL = chrome.runtime.getURL('src/app/index.html')

/** Show the page in an app tab that is open already (in this window first), else in a new tab. */
async function openPage(path: string) {
  await saveNow()
  const url = `${APP_URL}#${path}`
  const [win, contexts] = await Promise.all([
    chrome.windows.getCurrent(),
    chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.TAB] }),
  ])
  const tabs = contexts.filter((c) => c.documentUrl?.startsWith(APP_URL))
  const tab = tabs.find((c) => c.windowId === win.id) ?? tabs[0]
  if (tab) {
    await chrome.tabs.update(tab.tabId, { active: true, url })
    await chrome.windows.update(tab.windowId, { focused: true })
  } else {
    await chrome.tabs.create({ url })
  }
  window.close()
}

const rating = ref(props.rating)
const starIcon =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

async function rate() {
  await ratingDone()
  await chrome.tabs.create({ url: REVIEW_URL })
  window.close()
}

function closeRating() {
  rating.value = false
  void ratingDone()
}
</script>

<template>
  <div class="w-80 p-3 font-sans">
    <header class="mb-3 flex items-center gap-3 px-1">
      <img
        src="/icons/icon.svg"
        alt=""
        class="size-9 shrink-0 transition-[filter,opacity] duration-200"
        :class="!on && 'opacity-50 grayscale'"
      />
      <div class="min-w-0 flex-1 leading-tight">
        <div class="text-[15px] font-semibold">LingoMingo</div>
        <div class="truncate text-xs text-neutral-400">
          {{ on ? t('popup.on') : t('popup.off') }}
        </div>
      </div>
      <button
        role="switch"
        :aria-checked="on"
        :aria-label="t('popup.switch')"
        :title="on ? t('popup.turnOff') : t('popup.turnOn')"
        class="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 outline-none hover:ring-2 hover:ring-fg/15 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        :class="on ? 'bg-accent' : 'bg-fg/15'"
        @click="settings.enabled = !on"
      >
        <span
          class="absolute start-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm shadow-black/30 transition-transform duration-200"
          :class="on && 'translate-x-5 rtl:-translate-x-5'"
        />
      </button>
    </header>

    <StudyLangSwitcher inline field="nativeLang" />

    <a
      v-if="aiMissing"
      :href="`${APP_URL}#/settings#ai`"
      class="mb-2 flex items-start gap-3 rounded-lg border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-yellow-300 outline-none hover:border-yellow-300/40 focus-visible:border-yellow-300/60"
      @click.prevent="openPage('/settings#ai')"
    >
      <svg v-bind="iconAttrs" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span class="min-w-0 flex-1 leading-tight">
        <span class="block text-sm font-medium">{{ t('popup.aiMissing') }}</span>
        <span class="block text-xs text-yellow-300/70">{{ t('popup.aiMissingHint') }}</span>
      </span>
    </a>

    <nav class="flex flex-col gap-0.5">
      <template v-for="link in links" :key="link.to">
        <hr v-if="link.to === '/settings'" class="my-1.5 border-panel" />
        <a
          :href="`${APP_URL}#${link.to}`"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-300 outline-none hover:bg-panel hover:text-fg focus-visible:bg-panel focus-visible:text-fg"
          @click.prevent="openPage(link.to)"
        >
          <svg v-bind="iconAttrs">
            <path v-for="d in link.icon" :key="d" :d="d" />
          </svg>
          <span class="flex-1">{{ t(link.label) }}</span>
          <span
            v-if="link.to === '/review' && due"
            class="rounded-full bg-accent px-2 py-px text-xs font-semibold text-white tabular-nums"
            :title="t('popup.due', { n: due })"
            >{{ formatNumber(due) }}</span
          >
        </a>
      </template>
    </nav>

    <div v-if="rating" class="rating relative mt-2">
      <a
        :href="REVIEW_URL"
        class="block rounded-lg border border-accent/25 bg-accent/10 py-2.5 pr-9 pl-3 outline-none hover:border-accent/50 focus-visible:border-accent"
        @click.prevent="rate"
      >
        <span class="mb-1 flex gap-0.5 text-accent" aria-hidden="true">
          <svg
            v-for="i in 5"
            :key="i"
            class="star size-3.5"
            :style="{ '--i': i }"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path :d="starIcon" />
          </svg>
        </span>
        <span class="block text-sm font-medium">{{ t('popup.rate') }}</span>
        <span class="block text-xs text-neutral-400">{{ t('popup.rateHint') }}</span>
      </a>
      <button
        :aria-label="t('common.close')"
        :title="t('common.close')"
        class="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-md text-neutral-400 outline-none hover:bg-fg/10 hover:text-fg focus-visible:bg-fg/10 focus-visible:text-fg"
        @click="closeRating"
      >
        <svg v-bind="iconAttrs" class="size-4" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* The stars fill one after another when the banner opens, and lift in a wave on hover.
   Only transform, translate and opacity change: no layout work. The hover uses `translate`,
   not the animation, so the open animation does not play again when the pointer leaves. */
.star {
  animation: star-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i) * 70ms + 150ms);
  transition: translate 200ms ease-out;
  transition-delay: calc(var(--i) * 40ms);
}
.rating:hover .star {
  translate: 0 -2px;
}
@keyframes star-in {
  from {
    opacity: 0;
    transform: scale(0.3) rotate(-30deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .star {
    animation: none;
    transition: none;
  }
}
</style>
