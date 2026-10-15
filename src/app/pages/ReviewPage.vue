<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Rating, type Grade } from 'ts-fsrs'
import {
  answer,
  dueAt,
  formatSpan,
  GRADES,
  isDue,
  learningWords,
  needsExtras,
  preview,
} from '@/shared/review'
import { getSavedItems, getSettings, onStorageKey, setReview, setStage } from '@/shared/storage'
import {
  DEFAULT_SETTINGS,
  dirOf,
  type ReviewCard,
  type SavedItem,
  type SavedWord,
  type Settings,
  type Stage,
} from '@/shared/types'
import { fetchExtras } from '../extras'
import { ignoreKey } from '../shortcuts'
import WordCard from '../WordCard.vue'

const items = ref<SavedItem[]>([])
const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
/** Items and settings are loaded. Before, `lang` is the default and not the user's. */
const ready = ref(false)
const now = ref(Date.now())
const revealed = ref(false)
const busy = ref(false)
/** State of the last answered word, for undo. */
const last = ref<{ id: string; text: string; review?: ReviewCard; stage: Stage } | null>(null)
/** After undo, show this word first, also when other words are due sooner. */
const pinned = ref<string | null>(null)

const refreshItems = async () => (items.value = await getSavedItems())
const refreshSettings = async () => (settings.value = await getSettings())
const stops: (() => void)[] = []
onMounted(async () => {
  stops.push(onStorageKey('savedItems', refreshItems), onStorageKey('settings', refreshSettings))
  const timer = setInterval(() => (now.value = Date.now()), 30_000)
  stops.push(() => clearInterval(timer))
  window.addEventListener('keydown', onKeydown)
  stops.push(() => window.removeEventListener('keydown', onKeydown))
  await Promise.all([refreshItems(), refreshSettings()])
  ready.value = true
})
onBeforeUnmount(() => stops.forEach((s) => s()))

const lang = computed(() => settings.value.studyLang)
const words = computed(() => learningWords(items.value, lang.value))
const queue = computed(() => words.value.filter((w) => isDue(w, now.value)))
const current = computed(
  () => queue.value.find((w) => w.id === pinned.value) ?? queue.value[0] ?? null,
)
const due = computed(() => (current.value ? preview(current.value, now.value) : null))
watch(
  () => current.value?.id,
  () => (revealed.value = false),
)

// Missing translations and the example sentences come from the AI, for all words of the
// review, soonest due first. They are saved on the word, so each word is asked only once.
const BATCH = 8
/** Words asked on this page: a word that the model leaves out is not asked again. */
const asked = new Set<string>()
const loading = ref(new Set<string>())
const extrasError = ref('')
let fetching = false
async function prefetch() {
  if (fetching || !ready.value) return
  fetching = true
  try {
    for (;;) {
      const todo = words.value.filter((w) => needsExtras(w) && !asked.has(w.id))
      // One request per translation language.
      const batch = todo.filter((w) => w.translationLang === todo[0]?.translationLang)
      batch.splice(BATCH)
      if (!batch.length) break
      batch.forEach((w) => asked.add(w.id))
      loading.value = new Set(batch.map((w) => w.id))
      await fetchExtras(batch)
    }
  } catch (e) {
    extrasError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = new Set()
    fetching = false
  }
}
watch([ready, words], () => void prefetch())

function retry() {
  extrasError.value = ''
  asked.clear()
  void prefetch()
}

const remember = (w: SavedWord) => {
  last.value = { id: w.id, text: w.text, review: w.review, stage: w.stage }
  pinned.value = null
}

async function rate(grade: Grade) {
  const w = current.value
  if (!w || busy.value) return
  busy.value = true
  try {
    remember(w)
    await setReview(w.id, answer(w, Date.now(), grade))
    now.value = Date.now()
    revealed.value = false
  } finally {
    busy.value = false
  }
}

async function learned() {
  const w = current.value
  if (!w || busy.value) return
  busy.value = true
  try {
    remember(w)
    await setStage([w.id], 'KNOWN')
  } finally {
    busy.value = false
  }
}

async function undo() {
  const u = last.value
  if (!u || busy.value) return
  busy.value = true
  try {
    await setReview(u.id, u.review)
    await setStage([u.id], u.stage)
    last.value = null
    pinned.value = u.id
  } finally {
    busy.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (ignoreKey(e)) return
  const key = e.key.toLowerCase()
  if (key === 'z' && last.value) {
    void undo()
  } else if (!current.value) {
    return
  } else if (!revealed.value) {
    if (key !== ' ' && key !== 'enter') return
    revealed.value = true
  } else if (key === ' ' || key === 'enter') {
    void rate(Rating.Good)
  } else if (key === 'k') {
    void learned()
  } else {
    const g = GRADES.find((x) => x.key === key)
    if (!g) return
    void rate(g.grade)
  }
  e.preventDefault()
}

const nextIn = (ms: number) => (ms <= now.value ? 'Due' : `in ${formatSpan(ms - now.value)}`)

// Icons: SVG path data in the Lucide style (24×24, stroke), as in the sidebar.
const icons = {
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11'],
  check: ['M20 6 9 17l-5-5'],
}
const iconAttrs = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const

const gradeColor: Record<number, string> = {
  1: 'bg-red-500/70 text-white hover:bg-red-500',
  2: 'bg-orange-500/70 text-white hover:bg-orange-500',
  3: 'bg-emerald-600/70 text-white hover:bg-emerald-600',
  4: 'bg-sky-600/70 text-white hover:bg-sky-600',
}
const btn =
  'flex h-full flex-col items-center justify-center gap-1 rounded-lg text-[15px] font-semibold transition-colors disabled:opacity-50 '
const kbd = 'rounded border border-current/40 px-1 font-sans text-[11px] leading-4 font-medium'
const chip = 'rounded-full bg-fg/5 px-2.5 py-0.5 text-sm tabular-nums'
const skeleton = 'animate-pulse rounded bg-fg/10'
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-semibold">Review</h1>
      <span :class="[chip, queue.length ? 'text-orange-300' : 'text-neutral-400']">
        {{ queue.length }} due
      </span>
      <span :class="[chip, 'text-neutral-400']">{{ words.length }} learning</span>
      <!-- Always in the layout, so it does not move the header when it shows. -->
      <button
        class="ml-auto flex items-center gap-2 rounded-md border border-fg/15 py-1.5 ps-2.5 pe-2 text-sm text-neutral-300 transition-colors hover:border-fg/30 hover:bg-fg/5 hover:text-fg disabled:opacity-50"
        :class="{ invisible: !last }"
        :disabled="busy || !last"
        :title="last ? `Undo the answer for “${last.text}”` : ''"
        @click="undo"
      >
        <svg v-bind="iconAttrs" class="size-4">
          <path v-for="d in icons.undo" :key="d" :d="d" />
        </svg>
        Undo
        <span v-if="last" class="max-w-32 truncate text-neutral-500" :dir="dirOf(lang)">
          {{ last.text }}
        </span>
        <kbd :class="kbd + ' text-neutral-400'">Z</kbd>
      </button>
    </div>

    <template v-if="current">
      <WordCard
        :key="current.id"
        :word="current"
        :revealed="revealed"
        :waiting="loading.has(current.id)"
        :error="extrasError"
        @retry="retry"
      />

      <!-- Same height for both states, so the buttons do not jump. -->
      <div class="h-34 sm:h-16">
        <button
          v-if="!revealed"
          :class="btn + 'w-full flex-row gap-2 bg-accent text-white hover:brightness-110'"
          @click="revealed = true"
        >
          Show answer <kbd :class="kbd + ' opacity-70'">Space</kbd>
        </button>
        <div v-else class="grid h-full grid-cols-3 gap-2 sm:grid-cols-5">
          <button
            v-for="g in GRADES"
            :key="g.grade"
            :class="btn + gradeColor[g.grade]"
            :disabled="busy"
            @click="rate(g.grade)"
          >
            {{ g.label }}
            <span class="flex items-center gap-1.5 text-xs font-normal tabular-nums opacity-85">
              {{ due ? formatSpan(due[g.grade] - now) : '' }}
              <kbd :class="kbd">{{ g.grade === Rating.Good ? `${g.key} / Space` : g.key }}</kbd>
            </span>
          </button>
          <button
            :class="btn + 'border border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10'"
            :disabled="busy"
            title="Move to Known. It leaves the review."
            @click="learned"
          >
            <span class="flex items-center gap-1">
              <svg v-bind="iconAttrs" class="size-4"><path :d="icons.check[0]" /></svg>
              Learned
            </span>
            <kbd :class="kbd + ' opacity-85'">K</kbd>
          </button>
        </div>
      </div>
    </template>

    <section v-else class="rounded-xl bg-panel p-8 text-center text-neutral-400">
      <template v-if="words.length">
        All done for now. Next review {{ nextIn(dueAt(words[0]!)) }}.
      </template>
      <template v-else>
        No words to review. Click a word in the YouTube subtitles and choose “Learn”.
      </template>
    </section>

    <section v-if="words.length" class="space-y-2 pt-2">
      <h2 class="text-lg font-semibold">Words</h2>
      <table class="w-full text-left text-sm">
        <thead class="text-xs text-neutral-500 uppercase">
          <tr>
            <th class="p-2 font-medium">Word</th>
            <th class="p-2 font-medium">Translation</th>
            <th class="p-2 font-medium">Next review</th>
            <th class="hidden p-2 text-right font-medium sm:table-cell">Reviews</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in words" :key="w.id" class="border-t border-fg/5 hover:bg-fg/5">
            <td class="p-2 text-start text-[15px] text-orange-300" :dir="dirOf(w.langCode)">
              {{ w.text }}
            </td>
            <td class="p-2 text-start text-neutral-300" :dir="dirOf(w.translationLang)">
              <template v-if="w.translations.length">{{ w.translations.join(', ') }}</template>
              <span v-else-if="loading.has(w.id)" :class="skeleton + ' inline-block h-3 w-24'" />
            </td>
            <td
              class="p-2 tabular-nums"
              :class="dueAt(w) <= now ? 'text-orange-300' : 'text-neutral-400'"
            >
              {{ w.review ? nextIn(dueAt(w)) : 'New' }}
            </td>
            <td class="hidden p-2 text-right text-neutral-400 tabular-nums sm:table-cell">
              {{ w.review?.reps ?? 0 }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
