<script lang="ts">
// Word translations of this tab, so a second click on the same word sends no new request.
const cache = new Map<string, string[]>()
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { send } from '@/shared/messages'
import { dirOf, type SavedItem, type Stage } from '@/shared/types'

const props = defineProps<{
  word: string
  sentence: string
  rect: DOMRect
  studyLang: string
  nativeLang: string
  savedItem: SavedItem | null
}>()
const emit = defineEmits<{
  stage: [stage: Stage, translations: string[]]
  remove: []
  close: []
}>()

const translations = ref<string[]>(
  props.savedItem?.itemType === 'WORD' ? props.savedItem.translations : [],
)
const loading = ref(false)
const error = ref('')

const cacheKey = `${props.studyLang}:${props.nativeLang}:${props.word}`
onMounted(async () => {
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
})

const stage = computed(() => props.savedItem?.stage)
// A click on the active stage button removes the word from the saved items.
function pick(s: Stage) {
  if (stage.value === s) emit('remove')
  else emit('stage', s, translations.value)
}
// Show above the word (below it near the top of the screen); centered on it, kept inside the screen.
const below = props.rect.top < 240
const center = props.rect.left + props.rect.width / 2
const x = Math.min(Math.max(center, 138), innerWidth - 138)
const style = computed(() => {
  const y = below ? props.rect.bottom + 10 : props.rect.top - 10
  return { left: `${x}px`, top: `${y}px` }
})
// The arrow points at the word, also when the popup is pushed in from the screen edge.
const arrowLeft = `calc(50% + ${Math.min(Math.max(center - x, -112), 112)}px)`
// A little lighter than the side panel, so the popup stands out on it.
const bg = 'bg-[color-mix(in_srgb,white_5%,var(--color-panel))]'

const btn =
  'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white/40 '
// Hover only on inactive buttons, so it does not hide the active color.
const off = 'text-white/60 hover:bg-white/10 hover:text-white'
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
    class="fixed z-10 w-64 -translate-x-1/2 rounded-xl border border-t-2 border-white/10 border-t-accent font-sans text-white shadow-2xl shadow-black/60"
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
          : '-bottom-1.5 border-r border-b border-white/10',
      ]"
      :style="{ left: arrowLeft }"
    />
    <div class="flex items-start justify-between gap-2 px-4 pt-3">
      <div class="min-w-0 text-lg leading-snug font-semibold break-words" :dir="dirOf(studyLang)">
        {{ word }}
      </div>
      <button
        class="-mr-1.5 shrink-0 rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
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
          <div class="h-3.5 w-2/3 rounded bg-white/10" />
        </div>
        <div class="mt-1 flex h-5 items-center"><div class="h-3 w-1/2 rounded bg-white/10" /></div>
      </div>
      <div v-else-if="error" class="text-xs text-red-300">{{ error }}</div>
      <div v-else :dir="dirOf(nativeLang)">
        <div class="text-[15px] leading-[22px] font-medium text-white/95">
          {{ translations[0] }}
        </div>
        <div v-if="translations.length > 1" class="mt-1 text-sm text-white/50">
          {{ translations.slice(1).join(' · ') }}
        </div>
      </div>
    </div>
    <div class="flex gap-1 border-t border-white/10 p-1.5">
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
