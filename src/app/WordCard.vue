<script setup lang="ts">
import { computed, ref } from 'vue'
import { sentenceParts } from '@/shared/review'
import { dirOf, type SavedWord } from '@/shared/types'
import { fetchExtras } from './extras'

const props = defineProps<{
  word: SavedWord
  /** False hides the translations, but keeps their space. */
  revealed: boolean
  /** The missing extras of the word are on the way. */
  waiting?: boolean
  /** Error of the request for the missing extras. */
  error?: string
}>()
const emit = defineEmits<{ retry: [] }>()

/** The sentence from the video first, then the AI examples. */
const sentences = computed(() => {
  const w = props.word
  const list = w.context ? [{ ...w.context, video: true }] : []
  for (const e of w.examples ?? []) list.push({ ...e, video: false })
  return list.map((s) => ({ ...s, parts: sentenceParts(s.sentence, w.text, w.langCode) }))
})

// "More" asks the AI for more translations and examples, and adds them to the word.
const busy = ref(false)
const moreError = ref('')
async function more() {
  if (busy.value) return
  busy.value = true
  moreError.value = ''
  const w = props.word
  const count = (x: Partial<SavedWord>) => (x.translations?.length ?? 0) + (x.examples?.length ?? 0)
  try {
    const p = (await fetchExtras([w], true))[w.id]
    // The model can answer with only repeats: say so, else the click seems to do nothing.
    if (!p || count(p) <= count(w)) moreError.value = 'The AI gave nothing new.'
  } catch (e) {
    moreError.value = `No AI examples: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    busy.value = false
  }
}
const error = computed(
  () => moreError.value || (props.error ? `No AI examples: ${props.error}` : ''),
)
const retry = () => (moreError.value ? void more() : emit('retry'))

const loading = computed(() => busy.value || props.waiting)
/** Places for the AI examples that are still on the way. */
const skeletons = computed(() =>
  busy.value ? 3 : props.waiting ? Math.max(0, 2 - (props.word.examples?.length ?? 0)) : 0,
)

const watchUrl = (w: SavedWord) =>
  w.source
    ? `https://www.youtube.com/watch?v=${w.source.videoId}&t=${Math.floor(w.source.startMs / 1000)}s`
    : ''

// Icons: SVG path data in the Lucide style (24×24, stroke), as in the sidebar.
const icons = {
  video: [
    'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0',
    'M10 8.5v7a.5.5 0 0 0 .76.43l5.5-3.5a.5.5 0 0 0 0-.86l-5.5-3.5A.5.5 0 0 0 10 8.5z',
  ],
  ai: [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    'M20 3v4',
    'M22 5h-4',
  ],
}
const iconAttrs = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const
const skeleton = 'animate-pulse rounded bg-white/10'
/** Hidden answer: blurred, so its place shows, but it cannot be read. */
const hide = computed(() =>
  props.revealed ? 'transition-[filter]' : 'blur-[6px] opacity-60 select-none transition-[filter]',
)
</script>

<template>
  <section class="overflow-hidden rounded-xl bg-panel">
    <div class="px-8 pt-8 pb-6 text-center">
      <div
        class="text-5xl leading-tight font-semibold tracking-tight break-words text-orange-300"
        :dir="dirOf(word.langCode)"
      >
        {{ word.text }}
      </div>
      <!-- Before the answer shows, the text is blurred: nothing moves on reveal. -->
      <div
        class="mt-2 flex min-h-8 items-center justify-center text-xl text-neutral-100"
        :dir="dirOf(word.translationLang)"
      >
        <span v-if="loading && !word.translations.length" :class="skeleton + ' h-5 w-40'" />
        <span v-else :class="hide" :aria-hidden="!revealed">
          {{ word.translations.join(', ') || '—' }}
        </span>
      </div>
    </div>

    <ol
      v-if="sentences.length || skeletons"
      class="divide-y divide-white/5 border-t border-white/5"
    >
      <li v-for="(s, i) in sentences" :key="i" class="flex gap-4 px-8 py-3">
        <svg
          v-bind="iconAttrs"
          class="mt-1.5 size-4 shrink-0"
          :class="s.video ? 'text-accent' : 'text-neutral-500'"
          :aria-label="s.video ? 'From the video' : 'Example by AI'"
        >
          <title>{{ s.video ? 'From the video' : 'Example by AI' }}</title>
          <path v-for="d in s.video ? icons.video : icons.ai" :key="d" :d="d" />
        </svg>
        <div class="min-w-0 flex-1 text-start">
          <p class="text-lg leading-relaxed text-neutral-100" :dir="dirOf(word.langCode)">
            <template v-for="(t, j) in s.parts" :key="j">
              <mark
                v-if="t.hit"
                class="rounded-sm bg-orange-300/15 px-0.5 font-medium text-orange-300"
                >{{ t.text }}</mark
              >
              <template v-else>{{ t.text }}</template>
            </template>
          </p>
          <p
            class="min-h-6 text-[15px] leading-6 text-neutral-400"
            :dir="dirOf(word.translationLang)"
          >
            <span v-if="s.translation" :class="hide" :aria-hidden="!revealed">
              {{ s.translation }}
            </span>
            <span v-else-if="loading" :class="skeleton + ' inline-block h-3.5 w-2/3'" />
          </p>
          <a
            v-if="s.video && word.source"
            :href="watchUrl(word)"
            target="_blank"
            class="mt-0.5 inline-block max-w-full truncate text-xs text-neutral-500 hover:text-white hover:underline"
            >{{ word.source.title || 'YouTube' }}</a
          >
        </div>
      </li>
      <li v-for="i in skeletons" :key="`s${i}`" class="flex gap-4 px-8 py-3" aria-hidden="true">
        <svg v-bind="iconAttrs" class="mt-1.5 size-4 shrink-0 animate-pulse text-neutral-600">
          <path v-for="d in icons.ai" :key="d" :d="d" />
        </svg>
        <div class="flex-1 space-y-2.5 py-1.5">
          <div :class="skeleton + ' h-4 w-4/5'" />
          <div :class="skeleton + ' h-3.5 w-1/2 opacity-60'" />
        </div>
      </li>
    </ol>

    <!-- Always shown, so the card does not grow when an error comes. -->
    <div class="flex h-11 items-center gap-4 border-t border-white/5 px-8 text-sm text-neutral-400">
      <template v-if="error">
        <svg v-bind="iconAttrs" class="size-4 shrink-0 text-neutral-500">
          <path v-for="d in icons.ai" :key="d" :d="d" />
        </svg>
        <span class="min-w-0 flex-1 truncate" :title="error">{{ error }}</span>
        <button class="shrink-0 text-white hover:underline" @click="retry">Retry</button>
      </template>
      <button
        v-else
        class="flex items-center gap-4 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-50"
        :disabled="loading"
        @click="more"
      >
        <svg v-bind="iconAttrs" class="size-4 shrink-0" :class="{ 'animate-pulse': busy }">
          <path v-for="d in icons.ai" :key="d" :d="d" />
        </svg>
        More examples and translations
      </button>
    </div>
  </section>
</template>
