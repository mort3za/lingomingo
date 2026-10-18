<script lang="ts">
// Word translations and examples of this tab, so a second click on the same word sends no new
// request.
const cache = new Map<string, string[]>()
const exampleCache = new Map<string, Example[]>()
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { send } from '@/shared/messages'
import { dirOf, type Example, type SavedItem, type Stage } from '@/shared/types'
import SpeakButton from '@/shared/SpeakButton.vue'

const props = defineProps<{
  word: string
  sentence: string
  rect: DOMRect
  studyLang: string
  nativeLang: string
  savedItem: SavedItem | null
}>()
const emit = defineEmits<{
  stage: [stage: Stage, translations: string[], examples: Example[]]
  remove: []
  close: []
}>()

// Saved translations and examples only when they are in the current translation language.
const savedWord =
  props.savedItem?.itemType === 'WORD' && props.savedItem.translationLang === props.nativeLang
    ? props.savedItem
    : null
const translations = ref<string[]>(savedWord?.translations ?? [])
const loading = ref(false)
const error = ref('')
const examples = ref<Example[]>(savedWord?.examples ?? [])
const examplesLoading = ref(false)
const examplesError = ref('')

const cacheKey = `${props.studyLang}:${props.nativeLang}:${props.word}`
onMounted(loadTranslations)
onMounted(loadExamples)

async function loadTranslations() {
  if (translations.value.length) return
  const cached = cache.get(cacheKey)
  if (cached) {
    translations.value = cached
    return
  }
  loading.value = true
  try {
    translations.value = await send({
      type: 'translate-word',
      word: props.word,
      sentence: props.sentence,
      studyLang: props.studyLang,
      nativeLang: props.nativeLang,
    })
    cache.set(cacheKey, translations.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// A separate request, so the translations show before the slower examples.
async function loadExamples() {
  if (examples.value.length) return
  const cached = exampleCache.get(cacheKey)
  if (cached) {
    examples.value = cached
    return
  }
  examplesLoading.value = true
  try {
    const [r] = await send({
      type: 'word-extras',
      words: [{ word: props.word, sentence: props.sentence }],
      studyLang: props.studyLang,
      nativeLang: props.nativeLang,
      examples: 3,
    })
    examples.value = r?.examples ?? []
    exampleCache.set(cacheKey, examples.value)
  } catch (e) {
    examplesError.value = e instanceof Error ? e.message : String(e)
  } finally {
    examplesLoading.value = false
  }
}

// The AI marks the word in an example with `*`.
const parts = (sentence: string) =>
  sentence
    .split(/\*([^*]+)\*/)
    .map((text, i) => ({ text, hit: i % 2 === 1 }))
    .filter((p) => p.text)

const stage = computed(() => props.savedItem?.stage)
// A click on the active stage button removes the word from the saved items.
function pick(s: Stage) {
  if (stage.value === s) emit('remove')
  else emit('stage', s, translations.value, examples.value)
}
// Show on the side of the word with more room; centered on it, kept inside the screen.
const below = props.rect.top < innerHeight - props.rect.bottom
const center = props.rect.left + props.rect.width / 2
const x = Math.min(Math.max(center, 170), innerWidth - 170)
const style = computed(() => {
  const y = below ? props.rect.bottom + 10 : props.rect.top - 10
  return { left: `${x}px`, top: `${y}px` }
})
// The arrow points at the word, also when the popup is pushed in from the screen edge.
const arrowLeft = `calc(50% + ${Math.min(Math.max(center - x, -144), 144)}px)`
// A little lighter than the side panel, so the popup stands out on it.
const bg = 'bg-[color-mix(in_srgb,white_5%,var(--color-panel))]'

const btn =
  'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg/40 '
// Hover only on inactive buttons, so it does not hide the active color.
const off = 'text-fg/60 hover:bg-fg/10 hover:text-fg'
const on: Record<Stage, string> = {
  KNOWN: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40 ring-inset',
  LEARNING: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/40 ring-inset',
  SKIPPED: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/40 ring-inset',
}
const stages: { stage: Stage; label: string }[] = [
  { stage: 'KNOWN', label: '✓ Known' },
  { stage: 'LEARNING', label: 'Learn' },
  { stage: 'SKIPPED', label: '⊘ Skip' },
]
</script>

<template>
  <div
    data-lm-popup
    class="fixed z-10 w-80 -translate-x-1/2 rounded-xl border border-t-2 border-fg/10 border-t-accent font-sans text-fg shadow-2xl shadow-black/60"
    :class="[bg, below ? '' : '-translate-y-full']"
    :style="style"
    @click.stop
  >
    <!-- Arrow: behind the content, it covers the card border where it joins the card. -->
    <div
      class="absolute -z-10 size-3 -translate-x-1/2 rotate-45"
      :class="[
        bg,
        below
          ? '-top-1.5 border-t-2 border-l-2 border-accent'
          : '-bottom-1.5 border-r border-b border-fg/10',
      ]"
      :style="{ left: arrowLeft }"
    />
    <div class="flex items-start justify-between gap-2 px-4 pt-3">
      <div class="flex min-w-0 items-start gap-1">
        <div class="min-w-0 text-lg leading-snug font-semibold break-words" :dir="dirOf(studyLang)">
          {{ word }}
        </div>
        <SpeakButton :text="word" :lang="studyLang" />
      </div>
      <button
        class="-mr-1.5 shrink-0 rounded-md p-1 text-fg/40 hover:bg-fg/10 hover:text-fg"
        title="Close"
        @click="emit('close')"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div class="px-4 pt-1 pb-3">
      <!-- Same height as one result, so the popup does not jump when it loads. -->
      <div v-if="loading" class="animate-pulse">
        <div class="flex h-[22px] items-center">
          <div class="h-3.5 w-2/3 rounded bg-fg/10" />
        </div>
        <div class="mt-1 flex h-5 items-center"><div class="h-3 w-1/2 rounded bg-fg/10" /></div>
      </div>
      <div v-else-if="error" class="text-xs text-red-300">{{ error }}</div>
      <div v-else :dir="dirOf(nativeLang)">
        <div class="text-[15px] leading-[22px] font-medium text-fg/95">
          {{ translations[0] }}
        </div>
        <div v-if="translations.length > 1" class="mt-1 text-sm text-fg/50">
          {{ translations.slice(1).join(' · ') }}
        </div>
      </div>
    </div>
    <div v-if="examplesError" class="border-t border-fg/10 px-4 py-3 text-xs text-red-300">
      {{ examplesError }}
    </div>
    <ol
      v-else-if="examplesLoading || examples.length"
      class="space-y-2.5 border-t border-fg/10 px-4 py-3"
    >
      <template v-if="examplesLoading">
        <li v-for="i in 3" :key="i" class="animate-pulse" aria-hidden="true">
          <div class="flex h-5 items-center"><div class="h-3 w-5/6 rounded bg-fg/10" /></div>
          <div class="mt-0.5 flex h-4 items-center">
            <div class="h-2.5 w-2/3 rounded bg-fg/10" />
          </div>
        </li>
      </template>
      <li v-for="(e, i) in examples" v-else :key="i" class="group flex items-start gap-1">
        <div class="min-w-0 flex-1">
          <p class="text-sm leading-5 text-fg/90" :dir="dirOf(studyLang)">
            <template v-for="(t, j) in parts(e.sentence)" :key="j">
              <mark
                v-if="t.hit"
                class="rounded-sm bg-orange-300/15 px-0.5 font-medium text-orange-300"
                >{{ t.text }}</mark
              >
              <template v-else>{{ t.text }}</template>
            </template>
          </p>
          <p class="mt-0.5 text-xs leading-4 text-fg/50" :dir="dirOf(nativeLang)">
            {{ e.translation }}
          </p>
        </div>
        <SpeakButton class="-mt-0.5 -mr-1.5" :text="e.sentence" :lang="studyLang" on-hover />
      </li>
    </ol>
    <div class="flex gap-1 border-t border-fg/10 p-1.5">
      <button
        v-for="b in stages"
        :key="b.stage"
        :class="btn + (stage === b.stage ? on[b.stage] : off)"
        @click="pick(b.stage)"
      >
        {{ b.label }}
      </button>
    </div>
  </div>
</template>
