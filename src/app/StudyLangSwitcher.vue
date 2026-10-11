<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { getSavedItems, onStorageKey } from '@/shared/storage'
import { LANGUAGES } from '@/shared/types'
import { useSettings } from './settings'

const { settings } = useSettings()
const current = computed(() => settings.value.studyLang)

/** Words in the Learning stage, by language. */
const counts = ref<Record<string, number>>({})
async function refreshCounts() {
  const c: Record<string, number> = {}
  for (const i of await getSavedItems()) {
    if (i.itemType === 'WORD' && i.stage === 'LEARNING') c[i.langCode] = (c[i.langCode] ?? 0) + 1
  }
  counts.value = c
}
let stop = () => {}
onMounted(() => {
  void refreshCounts()
  stop = onStorageKey('savedItems', refreshCounts)
})
onBeforeUnmount(() => stop())

// Languages with words to learn first, so the usual switch is one short move.
const codes = Object.keys(LANGUAGES)
const groups = computed(() => {
  const mine = codes.filter((c) => counts.value[c] || c === current.value)
  return [
    { title: 'Your languages', codes: mine },
    { title: 'More languages', codes: codes.filter((c) => !mine.includes(c)) },
  ].filter((g) => g.codes.length)
})

const menu = useTemplateRef<HTMLElement>('menu')
const options = () => [...(menu.value?.querySelectorAll<HTMLElement>('[role=option]') ?? [])]

function pick(code: string) {
  settings.value.studyLang = code
  menu.value?.hidePopover()
  // Page keys (Space on the review page) must not open the menu again.
  ;(document.activeElement as HTMLElement | null)?.blur()
}

function onToggle(e: Event) {
  if ((e as ToggleEvent).newState !== 'open') return
  options()
    .find((o) => o.ariaSelected === 'true')
    ?.focus({ preventScroll: false })
}

// Arrow keys move between the languages. Keys stay in the menu, away from the page shortcuts.
function onMenuKeydown(e: KeyboardEvent) {
  e.stopPropagation()
  const list = options()
  const i = list.indexOf(document.activeElement as HTMLElement)
  const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key]
  if (to === undefined) return
  e.preventDefault()
  list[(to + list.length) % list.length]?.focus()
}

const badge = 'grid shrink-0 place-items-center rounded-md font-semibold uppercase'
</script>

<template>
  <button
    popovertarget="study-lang-menu"
    aria-haspopup="listbox"
    class="group mb-2 flex w-full items-center gap-3 rounded-lg border border-white/5 bg-panel/50 px-2.5 py-2 text-start transition-colors [anchor-name:--study-lang] hover:border-white/15 hover:bg-panel focus-visible:border-accent focus-visible:outline-none"
    title="Change the study language"
    @keydown.enter.space.stop
  >
    <span :class="badge + ' size-9 bg-accent text-sm text-white'">{{ current }}</span>
    <span class="min-w-0 flex-1 leading-tight">
      <span class="block text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
        Studying
      </span>
      <span class="block truncate text-[15px] font-medium text-white">
        {{ LANGUAGES[current] ?? current }}
      </span>
    </span>
    <svg
      class="size-4 shrink-0 text-neutral-500 transition-colors group-hover:text-neutral-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  </button>

  <div
    id="study-lang-menu"
    ref="menu"
    popover
    role="listbox"
    aria-label="Study language"
    class="top-[anchor(bottom)] right-auto bottom-auto left-[anchor(left)] m-0 mt-1.5 max-h-[min(70vh,30rem)] w-[anchor-size(width)] -translate-y-1 [scrollbar-width:thin] overflow-y-auto rounded-lg border border-white/10 bg-panel p-1.5 text-white [color-scheme:dark] opacity-0 shadow-xl shadow-black/40 transition-[opacity,translate,display,overlay] transition-discrete duration-150 [position-anchor:--study-lang] open:translate-y-0 open:opacity-100 starting:open:-translate-y-1 starting:open:opacity-0"
    @toggle="onToggle"
    @keydown="onMenuKeydown"
  >
    <template v-for="g in groups" :key="g.title">
      <div class="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
        {{ g.title }}
      </div>
      <button
        v-for="code in g.codes"
        :key="code"
        role="option"
        :aria-selected="code === current"
        class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-start text-sm outline-none"
        :class="
          code === current
            ? 'bg-white/5 text-white'
            : 'text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white'
        "
        @click="pick(code)"
      >
        <span
          :class="[
            badge,
            'size-6 text-[10px]',
            code === current ? 'bg-accent text-white' : 'bg-white/10 text-neutral-300',
          ]"
          >{{ code }}</span
        >
        <span class="min-w-0 flex-1 truncate">{{ LANGUAGES[code] }}</span>
        <span
          v-if="counts[code]"
          class="text-xs text-neutral-500 tabular-nums"
          :title="`${counts[code]} words to learn`"
          >{{ counts[code] }}</span
        >
        <svg
          v-if="code === current"
          class="size-4 shrink-0 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
    </template>
  </div>
</template>
