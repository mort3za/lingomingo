<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { dirOf } from '@/shared/types'
import type { YoutubeSession } from './session'
import WordText from './WordText.vue'

const props = defineProps<{
  s: YoutubeSession
  selected: { word: string; idx: number } | null
  /** Shown next to the video, not on it. */
  docked: boolean
}>()
const emit = defineEmits<{
  close: []
  word: [word: string, el: HTMLElement, idx: number]
  mark: [word: string, idx: number]
}>()

// Scroll the list only, never the page: no scrollIntoView.
const list = ref<HTMLElement>()
const rows = new Map<number, HTMLElement>()
// Where the current sentence is, if it is out of the visible part of the list.
const away = ref<'above' | 'below' | null>(null)

const box = (el: HTMLElement | undefined) => el?.getBoundingClientRect()
function inView(i: number) {
  const r = box(rows.get(i))
  const l = box(list.value)
  return !!r && !!l && r.bottom > l.top && r.top < l.bottom
}
function updateAway() {
  const r = box(rows.get(props.s.activeIdx.value))
  const l = box(list.value)
  away.value = !r || !l ? null : r.bottom <= l.top ? 'above' : r.top >= l.bottom ? 'below' : null
}
function scrollToTop(i: number) {
  const el = rows.get(i)
  // The rows sit 8px (p-2) below the top of the list.
  if (el && list.value) list.value.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' })
}

// The next sentence starts below the visible part: move it to the top. If the user scrolled
// away from the current sentence, do not move the list.
watch(
  () => props.s.activeIdx.value,
  async (i, prev) => {
    await nextTick()
    const below = (box(rows.get(i))?.bottom ?? 0) > (box(list.value)?.bottom ?? Infinity)
    if (i === prev + 1 && inView(prev) && below) scrollToTop(i)
    updateAway()
  },
)
</script>

<template>
  <div
    :class="
      docked
        ? 'h-full w-full overflow-hidden rounded-xl bg-surface'
        : 'absolute top-0 right-0 bottom-14 w-[340px] bg-surface/95'
    "
    class="pointer-events-auto flex flex-col font-sans text-white"
  >
    <div class="flex items-center justify-between border-b border-white/10 px-3 py-2">
      <div class="border-b-2 border-accent pb-1 text-sm font-medium">Subtitles</div>
      <button class="text-white/60 hover:text-white" @click="emit('close')">✕</button>
    </div>
    <div class="relative min-h-0 flex-1">
      <button
        v-if="away"
        class="absolute top-2 right-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-medium shadow-lg hover:brightness-110"
        title="Scroll to the current sentence"
        @click="scrollToTop(s.activeIdx.value)"
      >
        {{ away === 'above' ? '↑' : '↓' }} Current
      </button>
      <div ref="list" class="relative h-full space-y-1 overflow-y-auto p-2" @scroll="updateAway">
        <div v-if="s.status.value !== 'ready'" class="p-2 text-sm text-neutral-400">
          {{ s.message.value || 'Loading…' }}
        </div>
        <div
          v-for="(c, i) in s.cues.value"
          :key="i"
          :ref="(el) => el && rows.set(i, el as HTMLElement)"
          :class="
            'flex cursor-pointer gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/10 ' +
            (i === s.activeIdx.value ? 'bg-accent/40' : 'bg-panel')
          "
          @click="s.goTo(i)"
        >
          <div class="flex-1">
            <div :dir="dirOf(s.settings.value.studyLang)">
              <WordText
                :text="c.text"
                :lang="s.settings.value.studyLang"
                :vocab="s.vocab.value"
                :selected="selected?.idx === i ? selected.word : null"
                @word="(w, el) => emit('word', w, el, i)"
                @mark="(w) => emit('mark', w, i)"
              />
            </div>
            <div
              v-if="s.translationOf(i)"
              class="text-xs text-neutral-400"
              :dir="dirOf(s.settings.value.nativeLang)"
            >
              {{ s.translationOf(i) }}
            </div>
          </div>
          <button
            :class="
              s.savedPhraseIds.value.has(s.phraseKey(i)) ? 'text-yellow-300' : 'text-white/40'
            "
            @click.stop="s.togglePhrase(i)"
          >
            {{ s.savedPhraseIds.value.has(s.phraseKey(i)) ? '★' : '☆' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
