<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import type { Stage } from '@/shared/types'
import { shadowHost } from '../mount'
import { currentPlayer, relatedColumn } from './page'
import SidePanel from './SidePanel.vue'
import SubtitleBar from './SubtitleBar.vue'
import { useYoutubeSession } from './session'
import { ICONS, usePlayerToggles } from './toolbar'
import WordPopup from './WordPopup.vue'

const s = useYoutubeSession()
// `inDock`: the word is in the docked subtitles list. The player clips its children, so the popup
// for such a word must show in the dock too.
const selected = ref<{ word: string; idx: number; rect: DOMRect; inDock: boolean } | null>(null)
const active = computed(() => s.status.value !== 'idle')
watch(s.videoId, () => (selected.value = null))
watch(s.showSubs, () => (selected.value = null))

usePlayerToggles(
  [
    { label: 'LingoMingo subtitles', icon: ICONS.subtitles, on: s.showSubs },
    { label: 'LingoMingo subtitles list', icon: ICONS.sidebar, on: s.showPanel },
  ],
  () => active.value,
)

// Hide the native captions while our bar shows subtitles (or loads them).
// If our bar is off, or this video has no usable subtitles for us, the native ones stay visible.
const hideNative = document.createElement('style')
hideNative.textContent = '.ytp-caption-window-container { display: none !important; }'
document.documentElement.append(hideNative)
watchEffect(() => {
  hideNative.disabled =
    !s.showSubs.value || (s.status.value !== 'loading' && s.status.value !== 'ready')
})

// The subtitles list goes over the related videos, next to the video, as high as the video.
// In fullscreen, on Shorts, or in narrow windows there is no such column: it stays on the video.
const { host: dockHost, root: dock } = shadowHost()
dock.style.height = '100%'
const docked = ref(false)
function placeDock() {
  const column = relatedColumn()
  docked.value = !!column
  if (column && dockHost.parentElement !== column) column.prepend(dockHost)
  const height = Math.min(currentPlayer()?.offsetHeight ?? 0, innerHeight - 80)
  dockHost.style.cssText =
    `display:${docked.value && s.showPanel.value ? 'block' : 'none'};height:${height}px;` +
    'position:sticky;top:72px;z-index:100;margin-bottom:12px;'
}
let dockTimer = 0

// Close the popup on a click anywhere outside it.
function onPointerDown(e: PointerEvent) {
  if (!selected.value) return
  const inPopup = e.composedPath().some((n) => n instanceof HTMLElement && 'lmPopup' in n.dataset)
  if (!inPopup) selected.value = null
}

function openWord(word: string, el: HTMLElement, idx = s.activeIdx.value) {
  s.video()?.pause()
  const inDock = el.getRootNode() === dock.getRootNode()
  selected.value = { word, idx, rect: el.getBoundingClientRect(), inDock }
}

const savedItem = computed(() =>
  selected.value ? (s.savedWordOf(selected.value.word) ?? null) : null,
)

async function setStage(stage: Stage, translations: string[]) {
  if (!selected.value) return
  await s.markWord(selected.value.word, selected.value.idx, stage, translations)
}

// Right-click = mark as Learning without a popup.
const markLearning = (word: string, idx = s.activeIdx.value) =>
  s.markWord(word, idx, 'LEARNING', [])

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
  if (s.status.value !== 'ready' || !s.studying()) return
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
  document.addEventListener('fullscreenchange', placeDock)
  placeDock()
  dockTimer = window.setInterval(placeDock, 500)
})
watch(s.showPanel, placeDock)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('fullscreenchange', placeDock)
  clearInterval(dockTimer)
  dockHost.remove()
  hideNative.remove()
})
</script>

<template>
  <div v-if="active" class="pointer-events-none absolute inset-0 z-[60]">
    <SubtitleBar
      v-if="s.showSubs.value"
      :s="s"
      :selected="selected?.idx === s.activeIdx.value ? selected.word : null"
      @word="(w, el) => openWord(w, el)"
      @mark="(w) => markLearning(w)"
    />
    <Teleport :to="dock" :disabled="!docked">
      <SidePanel
        v-if="s.showPanel.value"
        :s="s"
        :selected="selected"
        :docked="docked"
        @close="s.showPanel.value = false"
        @word="openWord"
        @mark="markLearning"
      />
    </Teleport>
    <Teleport :to="dock" :disabled="!selected?.inDock">
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
    </Teleport>
  </div>
</template>
