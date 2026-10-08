<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Grade } from 'ts-fsrs'
import { answer, dueAt, formatSpan, GRADES, isDue, learningWords, preview } from '@/shared/review'
import { getSavedItems, getSettings, onStorageKey, setReview, setStage } from '@/shared/storage'
import { tokenize, wordKey } from '@/shared/tokenize'
import { DEFAULT_SETTINGS, dirOf, LANGUAGES, type SavedItem, type Settings } from '@/shared/types'

const items = ref<SavedItem[]>([])
const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const now = ref(Date.now())
const revealed = ref(false)
const busy = ref(false)

const refreshItems = async () => (items.value = await getSavedItems())
const refreshSettings = async () => (settings.value = await getSettings())
const stops: (() => void)[] = []
onMounted(() => {
  void refreshItems()
  void refreshSettings()
  stops.push(onStorageKey('savedItems', refreshItems), onStorageKey('settings', refreshSettings))
  const timer = setInterval(() => (now.value = Date.now()), 30_000)
  stops.push(() => clearInterval(timer))
  window.addEventListener('keydown', onKeydown)
  stops.push(() => window.removeEventListener('keydown', onKeydown))
})
onBeforeUnmount(() => stops.forEach((s) => s()))

const lang = computed(() => settings.value.studyLang)
const words = computed(() => learningWords(items.value, lang.value))
const queue = computed(() => words.value.filter((w) => isDue(w, now.value)))
const current = computed(() => queue.value[0] ?? null)
const due = computed(() => (current.value ? preview(current.value, now.value) : null))
watch(
  () => current.value?.id,
  () => (revealed.value = false),
)

/** Context sentence split in tokens, with the reviewed word marked. */
const example = computed(() => {
  const w = current.value
  if (!w?.context) return null
  return tokenize(w.context.sentence, w.langCode).map((t) => ({
    text: t.text,
    hit: t.isWord && wordKey(t.text) === wordKey(w.text),
  }))
})

async function rate(grade: Grade) {
  const w = current.value
  if (!w || busy.value) return
  busy.value = true
  try {
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
    await setStage([w.id], 'KNOWN')
  } finally {
    busy.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el?.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
  if (!current.value) return
  const key = e.key.toLowerCase()
  if (!revealed.value) {
    if (key !== ' ' && key !== 'enter') return
    revealed.value = true
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
const watchUrl = (w: { source: { videoId: string; startMs: number } | null }) =>
  w.source
    ? `https://www.youtube.com/watch?v=${w.source.videoId}&t=${Math.floor(w.source.startMs / 1000)}s`
    : ''

const gradeColor: Record<number, string> = {
  1: 'bg-red-500/70 hover:bg-red-500',
  2: 'bg-orange-500/70 hover:bg-orange-500',
  3: 'bg-emerald-600/70 hover:bg-emerald-600',
  4: 'bg-sky-600/70 hover:bg-sky-600',
}
const btn = 'rounded px-3 py-2 text-sm font-medium disabled:opacity-50 '
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="flex items-baseline gap-3">
      <h1 class="text-2xl font-semibold">Review</h1>
      <span class="text-sm text-neutral-400">
        {{ LANGUAGES[lang] ?? lang }} · {{ queue.length }} due · {{ words.length }} learning
      </span>
    </div>

    <section v-if="current" class="space-y-6 rounded-lg bg-panel p-6">
      <div class="text-center">
        <div class="text-4xl font-semibold text-orange-300" :dir="dirOf(current.langCode)">
          {{ current.text }}
        </div>
        <p v-if="example" class="mt-4 text-lg text-neutral-200" :dir="dirOf(current.langCode)">
          <template v-for="(t, i) in example" :key="i">
            <mark
              v-if="t.hit"
              class="rounded bg-transparent px-px text-orange-300 outline outline-1 outline-orange-300/70"
              >{{ t.text }}</mark
            >
            <template v-else>{{ t.text }}</template>
          </template>
        </p>
      </div>

      <div v-if="!revealed" class="text-center">
        <button :class="btn + 'bg-accent px-6'" @click="revealed = true">
          Show answer <span class="opacity-60">(Space)</span>
        </button>
      </div>

      <template v-else>
        <div class="space-y-2 border-t border-white/10 pt-4 text-center">
          <div class="text-xl" :dir="dirOf(current.translationLang)">
            {{ current.translations.join(', ') || '—' }}
          </div>
          <div
            v-if="current.context?.translation"
            class="text-neutral-400"
            :dir="dirOf(current.translationLang)"
          >
            {{ current.context.translation }}
          </div>
          <a
            v-if="current.source"
            :href="watchUrl(current)"
            target="_blank"
            class="text-xs text-accent hover:underline"
            >{{ current.source.title || 'YouTube' }}</a
          >
        </div>

        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="g in GRADES"
            :key="g.grade"
            :class="btn + gradeColor[g.grade] + ' min-w-24'"
            :disabled="busy"
            @click="rate(g.grade)"
          >
            {{ g.label }}
            <div class="text-xs font-normal opacity-80">
              {{ due ? formatSpan(due[g.grade] - now) : '' }} · {{ g.key }}
            </div>
          </button>
          <button
            :class="
              btn + 'min-w-24 border border-emerald-400/60 text-emerald-300 hover:bg-white/10'
            "
            :disabled="busy"
            title="Move to Known. It leaves the review."
            @click="learned"
          >
            ✓ Learned
            <div class="text-xs font-normal opacity-80">K</div>
          </button>
        </div>
      </template>
    </section>

    <section v-else class="rounded-lg bg-panel p-6 text-center text-neutral-400">
      <template v-if="words.length">
        All done for now. Next review {{ nextIn(dueAt(words[0]!)) }}.
      </template>
      <template v-else>
        No words to review. Click a word in the YouTube subtitles and choose “Learn”.
      </template>
    </section>

    <section v-if="words.length" class="space-y-2">
      <h2 class="text-lg font-medium">Words</h2>
      <table class="w-full text-left text-sm">
        <thead class="text-xs text-neutral-400 uppercase">
          <tr>
            <th class="p-2">Word</th>
            <th class="p-2">Translation</th>
            <th class="p-2">Next review</th>
            <th class="p-2 text-right">Reviews</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in words" :key="w.id" class="border-t border-white/5 hover:bg-white/5">
            <td class="p-2 text-start text-orange-300" :dir="dirOf(w.langCode)">{{ w.text }}</td>
            <td class="p-2 text-start text-neutral-300" :dir="dirOf(w.translationLang)">
              {{ w.translations.join(', ') }}
            </td>
            <td class="p-2" :class="dueAt(w) <= now ? 'text-orange-300' : 'text-neutral-400'">
              {{ w.review ? nextIn(dueAt(w)) : 'New' }}
            </td>
            <td class="p-2 text-right text-neutral-400">{{ w.review?.reps ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
