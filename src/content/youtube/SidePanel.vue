<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import SpeakButton from '@/shared/SpeakButton.vue'
import { subtitleStyles } from '@/shared/subtitle-style'
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

const st = computed(() => subtitleStyles(props.s.settings.value))

// Index of the row whose text was just copied, to show a check mark for a short time.
const copied = ref<number | null>(null)
async function copy(i: number) {
  await navigator.clipboard.writeText(props.s.cues.value[i]?.text ?? '')
  copied.value = i
  setTimeout(() => copied.value === i && (copied.value = null), 1000)
}

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

// The wheel over the panel must not scroll the page or go to the next Short. The list stops it
// at its ends (`overscroll-contain`); stop it here on the rest of the panel.
function onWheel(e: WheelEvent) {
  if (!list.value?.contains(e.target as Node)) e.preventDefault()
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
        : 'absolute top-0 right-0 bottom-14 w-[374px] bg-surface/95'
    "
    class="pointer-events-auto flex flex-col font-sans text-fg"
    @wheel="onWheel"
  >
    <div class="flex items-center justify-between border-b border-fg/10 px-3 py-2">
      <div class="border-b-2 border-accent pb-1 text-[15px] font-medium">Subtitles</div>
      <button class="text-fg/60 hover:text-fg" @click="emit('close')">✕</button>
    </div>
    <div class="relative min-h-0 flex-1">
      <!-- Scrollbar shows only on hover. Its space is always kept, so the rows do not move. -->
      <div
        ref="list"
        class="relative h-full [scrollbar-color:transparent_transparent] [scrollbar-gutter:stable] space-y-1 overflow-y-auto overscroll-contain p-2 pr-1 hover:[scrollbar-color:color-mix(in_srgb,var(--color-fg)_30%,transparent)_transparent]"
        @scroll="updateAway"
      >
        <!-- Sticky in the list, so it lines up with the rows whatever the scrollbar width is.
             No height, so the rows do not move. -->
        <div v-if="away" class="sticky top-0 z-10 mb-0 flex h-0 items-start justify-end">
          <button
            class="rounded-full bg-accent px-3 py-1 text-[13px] font-medium text-white shadow-lg hover:brightness-110"
            title="Scroll to the current sentence"
            @click="scrollToTop(s.activeIdx.value)"
          >
            {{ away === 'above' ? '↑' : '↓' }} Current
          </button>
        </div>
        <div v-if="s.status.value !== 'ready'" class="p-2 text-[15px] text-neutral-400">
          {{ s.message.value || 'Loading…' }}
        </div>
        <div
          v-for="(c, i) in s.cues.value"
          :key="i"
          :ref="(el) => el && rows.set(i, el as HTMLElement)"
          :class="
            'group flex cursor-pointer gap-2 rounded px-2 py-1.5 text-[15px] hover:bg-fg/10 ' +
            (i === s.activeIdx.value ? 'bg-accent/40' : 'bg-panel')
          "
          @click="s.goTo(i)"
        >
          <div class="flex-1" :style="st.font">
            <div :style="st.listSentence" :dir="dirOf(s.lang.value)">
              <WordText
                :text="c.text"
                :lang="s.lang.value"
                :vocab="s.vocab.value"
                :selected="selected?.idx === i ? selected.word : null"
                @word="(w, el) => emit('word', w, el, i)"
                @mark="(w) => emit('mark', w, i)"
              />
            </div>
            <div
              v-if="s.translationOf(i)"
              class="text-neutral-400"
              :style="st.listTranslation"
              :dir="dirOf(s.settings.value.nativeLang)"
            >
              {{ s.translationOf(i) }}
            </div>
          </div>
          <!-- In one line, so the buttons do not make a short row taller. -->
          <div class="flex items-center gap-1.5 self-start">
            <SpeakButton
              class="-m-1"
              :text="c.text"
              :lang="s.lang.value"
              on-hover
              @click.stop
              @play="s.pauseWhile"
            />
            <!-- Fixed width: the check mark must not move the star. -->
            <button
              class="flex w-3.5 justify-center text-fg/40 opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
              title="Copy"
              @click.stop="copy(i)"
            >
              <span v-if="copied === i">✓</span>
              <svg
                v-else
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              :class="
                s.savedPhraseIds.value.has(s.phraseKey(i))
                  ? 'text-yellow-300 hover:text-yellow-100'
                  : 'text-fg/40 opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100'
              "
              @click.stop="s.togglePhrase(i)"
            >
              {{ s.savedPhraseIds.value.has(s.phraseKey(i)) ? '★' : '☆' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
