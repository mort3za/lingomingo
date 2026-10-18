<script setup lang="ts">
import { computed } from 'vue'
import SpeakButton from '@/shared/SpeakButton.vue'
import { subtitleStyles } from '@/shared/subtitle-style'
import { dirOf } from '@/shared/types'
import type { YoutubeSession } from './session'
import WordText from './WordText.vue'

const props = defineProps<{ s: YoutubeSession; selected: string | null }>()
const emit = defineEmits<{
  word: [word: string, el: HTMLElement]
  mark: [word: string]
}>()

const idx = computed(() => props.s.activeIdx.value)
const cue = computed(() => props.s.cues.value[idx.value])
const translation = computed(() => props.s.translationOf(idx.value))
const shown = computed(
  () => props.s.status.value === 'ready' && !!cue.value && props.s.cueVisible.value,
)
const isSaved = computed(() => props.s.savedPhraseIds.value.has(props.s.phraseKey(idx.value)))
const st = computed(() => subtitleStyles(props.s.settings.value))
// See-through bar: the buttons sit on a glass capsule (`-m-1 p-1` keeps the layout), and fade
// until the pointer is on the bar.
const controls = computed(
  () =>
    '-m-1 p-1 transition-opacity ' +
    (st.value.dimControls
      ? 'opacity-40 group-hover/bar:opacity-100 group-focus-within/bar:opacity-100 '
      : ''),
)

const round = 'grid size-8 place-items-center rounded-full bg-fg/10 text-fg hover:bg-fg/25 '
</script>

<template>
  <div
    :class="
      s.settings.value.subtitlesOnTop ? 'top-14' : s.onShorts.value ? 'bottom-36' : 'bottom-16'
    "
    class="group/bar pointer-events-auto absolute left-1/2 flex w-[min(90%,900px)] -translate-x-1/2 items-stretch gap-3 rounded-lg px-3 py-2 font-sans text-fg"
    :style="st.bar"
  >
    <div
      v-if="!s.settings.value.hideSubtitleButtons"
      :class="controls + 'flex flex-col justify-center gap-1 self-center rounded-full'"
      :style="st.controls"
    >
      <button :class="round" title="Next (D)" @click="s.next()">›</button>
      <button :class="round" title="Repeat (S)" @click="s.repeat()">↻</button>
      <button :class="round" title="Previous (A)" @click="s.prev()">‹</button>
    </div>

    <div
      class="flex min-h-20 flex-1 flex-col justify-center text-center"
      :style="[st.font, st.text]"
    >
      <template v-if="s.status.value === 'ready'">
        <template v-if="cue && s.cueVisible.value">
          <div class="leading-snug font-medium" :style="st.barSentence" :dir="dirOf(s.lang.value)">
            <WordText
              :text="cue.text"
              :lang="s.lang.value"
              :vocab="s.vocab.value"
              :selected="selected"
              @word="(w, el) => emit('word', w, el)"
              @mark="(w) => emit('mark', w)"
            />
          </div>
          <template v-if="s.translates.value && !s.settings.value.hideTranslation">
            <hr class="my-1 border-fg/20" />
            <div
              v-if="translation"
              class="leading-snug text-neutral-400"
              :style="st.barTranslation"
              :dir="dirOf(s.settings.value.nativeLang)"
            >
              {{ translation }}
            </div>
            <div v-else-if="s.translationError.value" class="text-sm text-red-300">
              {{ s.translationError.value }}
            </div>
            <div v-else class="text-sm text-neutral-500">Translating…</div>
          </template>
        </template>
        <div v-else class="text-sm text-neutral-500">&nbsp;</div>
      </template>
      <div v-else-if="s.status.value === 'loading'" class="text-sm text-neutral-400">
        Loading subtitles…
      </div>
      <div v-else class="text-sm text-neutral-300">{{ s.message.value }}</div>
    </div>

    <div
      v-if="!s.settings.value.hideSubtitleButtons"
      :class="controls + 'flex flex-col items-center justify-between gap-1 rounded-2xl'"
      :style="st.controls"
    >
      <button
        :class="round + (isSaved ? 'text-yellow-300' : '')"
        title="Save sentence (R)"
        @click="s.togglePhrase(idx)"
      >
        {{ isSaved ? '★' : '☆' }}
      </button>
      <!-- Invisible with no sentence: it keeps its space. -->
      <SpeakButton
        round
        :class="!shown && 'invisible'"
        :text="cue?.text ?? ''"
        :lang="s.lang.value"
        @play="s.pauseWhile"
      />
      <button
        :class="round"
        :title="
          s.settings.value.subtitlesOnTop ? 'Move subtitles to bottom' : 'Move subtitles to top'
        "
        @click="s.toggleSubtitlesOnTop()"
      >
        {{ s.settings.value.subtitlesOnTop ? '↓' : '↑' }}
      </button>
    </div>
  </div>
</template>
