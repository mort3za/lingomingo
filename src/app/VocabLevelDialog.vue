<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { tokenize } from '@/shared/tokenize'
import { dirOf } from '@/shared/types'
import {
  LEVEL_ROWS,
  WORD_STYLE,
  loadWordList,
  wordClass,
  type Vocab,
  type WordList,
} from '@/shared/vocab'
import { VOCAB_SAMPLES } from './vocab-samples'

const props = defineProps<{ lang: string; level: number | undefined; showSuggested: boolean }>()
const showKnownGreen = defineModel<boolean>('showKnownGreen', { required: true })
const darkenRare = defineModel<boolean>('darkenRare', { required: true })
const emit = defineEmits<{ set: [level: number]; close: [] }>()

const list = shallowRef<WordList | null>(null)
const error = ref('')
onMounted(async () => {
  try {
    list.value = await loadWordList(props.lang)
  } catch {
    error.value = 'Could not load the word list.'
  }
})

const picked = ref(props.level ?? 0)

// Six sample words per row, spread over the ranks between the previous row and this row.
const rows = computed(() => {
  const words = list.value ? [...list.value.ranks.keys()] : []
  return LEVEL_ROWS.map((rank, i) => {
    const from = LEVEL_ROWS[i - 1] ?? rank
    const sample = Array.from(
      { length: 6 },
      (_, k) => words[from + Math.floor(((rank - from) * k) / 6)],
    )
    return { rank, words: sample.filter((w) => w !== undefined) }
  }).filter((row) => row.rank <= words.length) // Lemma lists have fewer than 20,000 words.
})

const vocab = computed<Vocab>(() => ({
  stages: new Map(),
  list: list.value,
  level: picked.value,
  showKnownGreen: showKnownGreen.value,
  showSuggested: props.showSuggested,
  darkenRare: darkenRare.value,
}))
const style = (word: string) => WORD_STYLE[wordClass(word, vocab.value)]
const sample = computed(() => tokenize(VOCAB_SAMPLES[props.lang] ?? '', props.lang))
</script>

<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 sm:p-6"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-full w-full max-w-5xl flex-col gap-4 rounded-lg bg-panel p-4 shadow-xl sm:p-6"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">Set Vocabulary Level</h2>
        <button class="text-xl text-white/60 hover:text-white" title="Close" @click="emit('close')">
          ✕
        </button>
      </div>

      <div class="grid min-h-0 flex-1 gap-6 md:grid-cols-2">
        <div class="flex min-h-0 flex-col gap-3">
          <p class="text-sm text-neutral-300">
            Below are words of increasing difficulty. Please click on the last row where you can
            understand all the words (scroll to see all).
          </p>
          <div v-if="error" class="text-sm text-red-300">{{ error }}</div>
          <div class="max-h-[55vh] overflow-y-auto rounded bg-surface-deep">
            <button
              v-for="row in rows"
              :key="row.rank"
              :class="
                'flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 ' +
                (row.rank === picked
                  ? 'border-b-2 border-dashed border-emerald-300'
                  : 'border-b border-white/5')
              "
              @click="picked = row.rank"
            >
              <span class="w-12 shrink-0 text-xs text-neutral-500 tabular-nums">{{
                row.rank
              }}</span>
              <span v-if="row.rank === 0" class="flex-1 text-center text-neutral-300">
                I don't know any words yet.
              </span>
              <span v-else class="flex flex-1 flex-wrap gap-x-4 gap-y-0.5" :dir="dirOf(lang)">
                <span v-for="w in row.words" :key="w" class="whitespace-nowrap" :class="style(w)">{{
                  w
                }}</span>
              </span>
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-col gap-3">
          <h3 class="text-center font-medium">Example Text:</h3>
          <div
            class="max-h-[40vh] overflow-y-auto rounded border border-white/10 p-4 leading-relaxed"
            :dir="dirOf(lang)"
          >
            <template v-for="(t, i) in sample" :key="i">
              <span v-if="t.isWord" :class="style(t.text)">{{ t.text }}</span>
              <template v-else>{{ t.text }}</template>
            </template>
          </div>
          <label class="flex items-center gap-2 text-sm text-emerald-300">
            <input v-model="showKnownGreen" type="checkbox" />
            Show Known words in green
          </label>
          <label class="flex items-center gap-2 text-sm text-white/45">
            <input v-model="darkenRare" type="checkbox" />
            Darken rare words
          </label>
          <p class="mt-auto text-xs text-neutral-500">
            Word lists:
            <a
              href="https://github.com/hermitdave/FrequencyWords"
              target="_blank"
              class="underline hover:text-white"
              >FrequencyWords</a
            >
            (OpenSubtitles), CC BY-SA 4.0.
          </p>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          class="rounded bg-accent px-6 py-2 font-medium tracking-wide uppercase hover:brightness-110 disabled:opacity-50"
          :disabled="!list"
          @click="emit('set', picked)"
        >
          Set vocabulary level
        </button>
      </div>
    </div>
  </div>
</template>
