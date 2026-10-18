<script lang="ts">
// Word translations and examples of this tab, so a second click on the same word sends no new
// request. Translations by word and sentence: the expression depends on the sentence.
const cache = new Map<string, WordTranslation>()
const exampleCache = new Map<string, Example[]>()
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { send, type Phrase, type WordInfo, type WordTranslation } from '@/shared/messages'
import { dirOf, type Example, type SavedItem, type Stage } from '@/shared/types'
import SpeakButton from '@/shared/SpeakButton.vue'

const props = defineProps<{
  word: string
  sentence: string
  /** Subtitle lines around the sentence, for the word translation. */
  before?: string
  after?: string
  rect: DOMRect
  studyLang: string
  nativeLang: string
  savedItem: SavedItem | null
  /** Stage of a saved item with this text, for the expression. */
  stageOf: (text: string) => Stage | undefined
}>()
const emit = defineEmits<{
  stage: [stage: Stage, translations: string[], examples: Example[], info: WordInfo]
  remove: []
  savePhrase: [phrase: Phrase]
  removePhrase: [text: string]
  close: []
}>()

// Saved translations and examples only when they are in the current translation language.
const savedWord =
  props.savedItem?.itemType === 'WORD' && props.savedItem.translationLang === props.nativeLang
    ? props.savedItem
    : null
const translations = ref<string[]>(savedWord?.translations ?? [])
const phrase = ref<Phrase | null>(null)
// Facts of the study language: kept also when the translation language changed.
const old = props.savedItem?.itemType === 'WORD' ? props.savedItem : null
const info = ref<WordInfo>({
  headword: old?.headword ?? null,
  plural: old?.plural ?? null,
  ipa: old?.ipa ?? null,
})
const loading = ref(false)
const error = ref('')
const examples = ref<Example[]>(savedWord?.examples ?? [])
const examplesLoading = ref(false)
const examplesError = ref('')

const cacheKey = `${props.studyLang}:${props.nativeLang}:${props.word}`
onMounted(loadTranslations)
onMounted(loadExamples)

// A saved word shows its saved translations at once. The request then only looks for the
// expression and missing facts, and an error stays hidden.
async function loadTranslations() {
  const key = `${cacheKey}:${props.before}\n${props.sentence}\n${props.after}`
  const show = (r: WordTranslation) => {
    if (!translations.value.length) translations.value = r.translations
    phrase.value = r.phrase
    const i = info.value
    info.value = {
      headword: i.headword ?? r.headword,
      plural: i.plural ?? r.plural,
      ipa: i.ipa ?? r.ipa,
    }
  }
  const cached = cache.get(key)
  if (cached) return show(cached)
  loading.value = !translations.value.length
  try {
    const r = await send({
      type: 'translate-word',
      word: props.word,
      sentence: props.sentence,
      before: props.before,
      after: props.after,
      studyLang: props.studyLang,
      nativeLang: props.nativeLang,
    })
    cache.set(key, r)
    show(r)
  } catch (e) {
    if (!translations.value.length) error.value = e instanceof Error ? e.message : String(e)
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
  else emit('stage', s, translations.value, examples.value, info.value)
}
// The noun with its article, the article lighter: "die Arbeit" → "die " + "Arbeit", "l'eau" →
// "l'" + "eau".
const title = computed(() => {
  const m = info.value.headword?.match(/^(\S+?['’]|\S+\s+)(.+)$/)
  return m ? { article: m[1], text: m[2] } : { article: '', text: props.word }
})
// The play button sits right after the last word, in one inline-flex box with it, so the button
// never goes to a new line alone. Chrome breaks before a button even in a nowrap span.
const lastWord = (s = '') => {
  const i = s.search(/\S+$/)
  return { head: s.slice(0, i), last: s.slice(i) }
}
// The expression has one button: save it as Learning, or remove it.
const phraseStage = computed(() => phrase.value && props.stageOf(phrase.value.text))
function togglePhrase() {
  if (!phrase.value) return
  if (phraseStage.value) emit('removePhrase', phrase.value.text)
  else emit('savePhrase', { ...phrase.value })
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

const btnBase =
  'flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg/40 '
const btn = 'flex-1 ' + btnBase
// Hover only on inactive buttons, so it does not hide the active color.
const off = 'text-fg/60 hover:bg-fg/10 hover:text-fg'
const on: Record<Stage, string> = {
  KNOWN: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40 ring-inset',
  LEARNING: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/40 ring-inset',
  SKIPPED: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/40 ring-inset',
}
// Icon paths: Lucide check, graduation-cap and ban, the same set as the close icon.
const stages: { stage: Stage; label: string; icon: string }[] = [
  { stage: 'KNOWN', label: 'Known', icon: 'M20 6 9 17l-5-5' },
  {
    stage: 'LEARNING',
    label: 'Learn',
    icon: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5',
  },
  {
    stage: 'SKIPPED',
    label: 'Skip',
    icon: 'M4.929 4.929 19.07 19.071M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  },
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
      <div class="min-w-0">
        <div class="min-w-0 text-lg leading-snug font-semibold break-words" :dir="dirOf(studyLang)">
          <span v-if="title.article" class="font-normal text-fg/50">{{ title.article }}</span
          >{{ lastWord(title.text).head
          }}<span class="inline-flex max-w-full items-center"
            ><span class="min-w-0">{{ lastWord(title.text).last }}</span
            ><SpeakButton class="-my-1 ms-1" :text="info.headword ?? word" :lang="studyLang"
          /></span>
        </div>
        <div v-if="info.ipa" class="text-xs leading-4 text-fg/50" dir="ltr">/{{ info.ipa }}/</div>
        <div v-else-if="loading" class="flex h-4 animate-pulse items-center">
          <div class="h-2.5 w-16 rounded bg-fg/10" />
        </div>
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
    <div v-if="phrase" class="flex items-center gap-2 border-t border-fg/10 px-4 py-2.5">
      <div class="min-w-0 flex-1">
        <div class="text-[10px] font-medium tracking-wide text-fg/40 uppercase">Expression</div>
        <div class="text-sm leading-5 font-semibold break-words" :dir="dirOf(studyLang)">
          {{ lastWord(phrase.text).head
          }}<span class="inline-flex max-w-full items-center"
            ><span class="min-w-0">{{ lastWord(phrase.text).last }}</span
            ><SpeakButton class="-my-1 ms-1" :text="phrase.text" :lang="studyLang"
          /></span>
        </div>
        <div class="text-sm leading-5 text-fg/60" :dir="dirOf(nativeLang)">
          {{ phrase.translation }}
        </div>
      </div>
      <button
        :class="'shrink-0 ' + btnBase + (phraseStage ? on[phraseStage] : off)"
        :title="phraseStage ? 'Remove the expression from saved items' : 'Save the expression'"
        @click="togglePhrase"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="stages[1]!.icon" />
        </svg>
        Learn
      </button>
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
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="b.icon" />
        </svg>
        {{ b.label }}
      </button>
    </div>
  </div>
</template>
