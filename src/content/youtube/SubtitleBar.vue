<script setup lang="ts">
import { computed } from 'vue'
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
const isSaved = computed(() => props.s.savedPhraseIds.value.has(props.s.phraseKey(idx.value)))

const round =
  'grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 '
</script>

<template>
  <div
    class="pointer-events-auto absolute bottom-16 left-1/2 flex w-[min(90%,900px)] -translate-x-1/2 items-stretch gap-3 rounded-lg bg-black/80 px-3 py-2 font-sans text-white"
  >
    <div class="flex flex-col justify-center gap-1">
      <button :class="round" title="Next (D)" @click="s.next()">›</button>
      <button :class="round" title="Repeat (S)" @click="s.repeat()">↻</button>
      <button :class="round" title="Previous (A)" @click="s.prev()">‹</button>
    </div>

    <div class="flex min-h-20 flex-1 flex-col justify-center text-center">
      <template v-if="s.status.value === 'ready'">
        <template v-if="cue && s.cueVisible.value">
          <div class="text-[28px] leading-snug font-medium">
            <WordText
              :text="cue.text"
              :lang="s.settings.value.studyLang"
              :stages="s.stageByWord.value"
              :selected="selected"
              @word="(w, el) => emit('word', w, el)"
              @mark="(w) => emit('mark', w)"
            />
          </div>
          <template v-if="!s.settings.value.hideTranslation">
            <hr class="my-1 border-white/20" />
            <div v-if="translation" class="text-[22px] leading-snug text-neutral-400">
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

    <div class="flex flex-col items-center justify-between gap-1">
      <button
        :class="round + (isSaved ? 'text-yellow-300' : '')"
        title="Save phrase (R)"
        @click="s.togglePhrase(idx)"
      >
        {{ isSaved ? '★' : '☆' }}
      </button>
      <button
        :class="
          'rounded-full px-2 py-1 text-xs font-bold ' +
          (s.settings.value.autoPause ? 'bg-emerald-500 text-black' : 'bg-white/10')
        "
        title="Auto-pause (Q)"
        @click="s.toggleAutoPause()"
      >
        AP
      </button>
    </div>
  </div>
</template>
