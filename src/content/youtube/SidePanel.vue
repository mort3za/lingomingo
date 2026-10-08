<script setup lang="ts">
import { dirOf } from '@/shared/types'
import type { YoutubeSession } from './session'
import WordText from './WordText.vue'

defineProps<{
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
    <div class="flex-1 space-y-1 overflow-y-auto p-2">
      <div v-if="s.status.value !== 'ready'" class="p-2 text-sm text-neutral-400">
        {{ s.message.value || 'Loading…' }}
      </div>
      <div
        v-for="(c, i) in s.cues.value"
        :key="i"
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
          :class="s.savedPhraseIds.value.has(s.phraseKey(i)) ? 'text-yellow-300' : 'text-white/40'"
          @click.stop="s.togglePhrase(i)"
        >
          {{ s.savedPhraseIds.value.has(s.phraseKey(i)) ? '★' : '☆' }}
        </button>
      </div>
    </div>
  </div>
</template>
