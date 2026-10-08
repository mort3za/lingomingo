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
const style = computed(() => {
  const x = Math.min(Math.max(props.rect.left + props.rect.width / 2, 130), innerWidth - 130)
  const y = below ? props.rect.bottom + 8 : props.rect.top - 8
  return { left: `${x}px`, top: `${y}px` }
})

const btn = 'flex-1 rounded px-2 py-1 text-xs font-medium '
// Hover only on inactive buttons, so it does not hide the active color.
const off = 'bg-white/10 hover:bg-white/20'
</script>

<template>
  <div
    data-lm-popup
    class="fixed z-10 w-60 -translate-x-1/2 rounded-lg bg-[#1565a0] p-3 font-sans text-white shadow-xl"
    :class="below ? '' : '-translate-y-full'"
    :style="style"
    @click.stop
  >
    <div class="mb-2 flex items-start justify-between gap-2">
      <div class="text-base font-semibold" :dir="dirOf(studyLang)">{{ word }}</div>
      <button class="text-white/60 hover:text-white" @click="emit('close')">✕</button>
    </div>
    <div v-if="loading" class="text-sm text-white/70">…</div>
    <div v-else-if="error" class="text-xs text-red-200">{{ error }}</div>
    <ol v-else class="text-sm" :dir="dirOf(nativeLang)">
      <li
        v-for="(t, i) in translations"
        :key="i"
        :class="i === 0 ? 'font-semibold' : i === 1 ? 'opacity-80' : 'opacity-60'"
      >
        {{ t }}
      </li>
    </ol>
    <div class="mt-3 flex gap-1">
      <button :class="btn + (stage === 'KNOWN' ? 'bg-emerald-500/60' : off)" @click="pick('KNOWN')">
        ✓ Known
      </button>
      <button
        :class="btn + (stage === 'LEARNING' ? 'bg-orange-500/70' : off)"
        @click="pick('LEARNING')"
      >
        Learn
      </button>
      <button
        :class="btn + (stage === 'SKIPPED' ? 'bg-violet-500/60' : off)"
        @click="pick('SKIPPED')"
      >
        ⊘ Skip
      </button>
    </div>
  </div>
</template>
