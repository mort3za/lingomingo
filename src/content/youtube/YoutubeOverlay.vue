<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { wordId } from '@/shared/storage'
import type { Stage } from '@/shared/types'
import SidePanel from './SidePanel.vue'
import SubtitleBar from './SubtitleBar.vue'
import { useYoutubeSession } from './session'
import WordPopup from './WordPopup.vue'

const s = useYoutubeSession()
const panelOpen = ref(false)
const selected = ref<{ word: string; idx: number; rect: DOMRect } | null>(null)
const active = computed(() => s.status.value !== 'idle')
watch(s.videoId, () => (selected.value = null))

// Hide the native captions while our bar shows subtitles (or loads them).
// If this video has no usable subtitles for us, the native ones stay visible.
const hideNative = document.createElement('style')
hideNative.textContent = '.ytp-caption-window-container { display: none !important; }'
document.documentElement.append(hideNative)
watchEffect(() => {
  hideNative.disabled = s.status.value !== 'loading' && s.status.value !== 'ready'
})

// Close the popup on a click anywhere outside it.
function onPointerDown(e: PointerEvent) {
  if (!selected.value) return
  const inPopup = e.composedPath().some((n) => n instanceof HTMLElement && 'lmPopup' in n.dataset)
  if (!inPopup) selected.value = null
}

function openWord(word: string, el: HTMLElement) {
  s.video()?.pause()
  selected.value = { word, idx: s.activeIdx.value, rect: el.getBoundingClientRect() }
}

const savedItem = computed(() =>
  selected.value
    ? (s.saved.value.find(
        (i) => i.id === wordId(s.settings.value.studyLang, selected.value!.word),
      ) ?? null)
    : null,
)

async function setStage(stage: Stage, translations: string[]) {
  if (!selected.value) return
  await s.markWord(selected.value.word, selected.value.idx, stage, translations)
}

// Right-click = mark as Learning without a popup.
const markLearning = (word: string) => s.markWord(word, s.activeIdx.value, 'LEARNING', [])

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (
    el?.matches('input, textarea, select') ||
    el?.isContentEditable ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey
  )
    return
  if (s.status.value !== 'ready') return
  const actions: Record<string, () => void> = {
    a: s.prev,
    arrowleft: s.prev,
    s: s.repeat,
    arrowdown: s.repeat,
    d: s.next,
    arrowright: s.next,
    q: s.toggleAutoPause,
    r: () => s.togglePhrase(s.activeIdx.value),
    w: s.togglePlay,
  }
  const run = actions[e.key.toLowerCase()]
  if (!run) return
  e.preventDefault()
  e.stopImmediatePropagation()
  selected.value = null
  run()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('pointerdown', onPointerDown, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('pointerdown', onPointerDown, true)
  hideNative.remove()
})
</script>

<template>
  <div v-if="active" class="pointer-events-none absolute inset-0 z-[60]">
    <SubtitleBar :s="s" :selected="selected?.word ?? null" @word="openWord" @mark="markLearning" />
    <button
      v-if="!panelOpen"
      class="pointer-events-auto absolute top-3 right-3 grid size-9 place-items-center rounded bg-black/60 text-white hover:bg-black/80"
      title="Subtitles list"
      @click="panelOpen = true"
    >
      ☰
    </button>
    <SidePanel v-if="panelOpen" :s="s" @close="panelOpen = false" />
    <WordPopup
      v-if="selected"
      :key="selected.word + selected.idx"
      class="pointer-events-auto"
      :word="selected.word"
      :sentence="s.cues.value[selected.idx]?.text ?? ''"
      :rect="selected.rect"
      :study-lang="s.settings.value.studyLang"
      :native-lang="s.settings.value.nativeLang"
      :saved-item="savedItem"
      @stage="setStage"
      @remove="s.unmarkWord(selected.word)"
      @close="selected = null"
    />
  </div>
</template>
