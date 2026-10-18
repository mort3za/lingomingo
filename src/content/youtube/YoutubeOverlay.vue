<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import type { Phrase, WordInfo } from '@/shared/messages'
import { tokenize } from '@/shared/tokenize'
import { EXPRESSION_TAG, type Example, type Stage } from '@/shared/types'
import { shadowHost } from '../mount'
import { hintLabels } from './hints'
import { currentPlayer, fullBleedRow, relatedColumn, shortsReel } from './page'
import SidePanel from './SidePanel.vue'
import SubtitleBar from './SubtitleBar.vue'
import { useYoutubeSession } from './session'
import { ICONS, usePlayerToggles } from './toolbar'
import WordPopup from './WordPopup.vue'

const s = useYoutubeSession()
// `inDock`: the word is in the docked subtitles list. The player clips its children, so the popup
// for such a word shows outside the player (see `popupHost`).
const selected = ref<{ word: string; idx: number; rect: DOMRect; inDock: boolean } | null>(null)
// No subtitles on the video: hide our toggles too. A click would only show an empty bar and
// change the saved choice for the next videos.
const active = computed(() => s.status.value !== 'idle' && s.status.value !== 'no-subs')
watch(s.videoId, () => (selected.value = null))
watch(s.showSubs, () => (selected.value = null))
const popup = ref<InstanceType<typeof WordPopup>>()

// Word hints (E): a letter on each word of the current sentence, in the subtitle bar or,
// with the bar off, in the list. The letter opens the word. `resume`: the video played before.
const hint = ref<{
  idx: number
  inBar: boolean
  words: string[]
  labels: string[]
  typed: string
  resume: boolean
} | null>(null)
const root = ref<HTMLElement>()
watch([s.videoId, s.activeIdx, s.showSubs, s.showPanel], () => (hint.value = null))

function startHints() {
  const inBar = s.showSubs.value
  const idx = s.activeIdx.value
  const text = s.cues.value[idx]?.text
  if (!text || (inBar && !s.cueVisible.value)) return
  const words = tokenize(text, s.lang.value)
    .filter((t) => t.isWord)
    .map((t) => t.text)
  if (!words.length) return
  const v = s.video()
  const resume = !!v && !v.paused
  v?.pause()
  selected.value = null
  hint.value = { idx, inBar, words, labels: hintLabels(words.length), typed: '', resume }
}
function endHints(resume: boolean) {
  hint.value = null
  if (resume) void s.video()?.play()
}
// All keys are for the hints while they show.
function onHintKey(e: KeyboardEvent) {
  const h = hint.value!
  e.preventDefault()
  e.stopImmediatePropagation()
  const key = e.key.toUpperCase()
  if (e.key === 'Escape' || key === 'E') return endHints(h.resume)
  if (e.key === 'Backspace') return void (h.typed = h.typed.slice(0, -1))
  if (key.length !== 1) return
  const typed = h.typed + key
  const n = h.labels.findIndex((l) => l.startsWith(typed))
  if (n < 0) return
  if (h.labels[n] !== typed) return void (h.typed = typed)
  const word = h.words[n]!
  // Shift = mark as Learning with no popup, as a right-click does.
  if (e.shiftKey) {
    void markLearning(word, h.idx)
    return endHints(h.resume)
  }
  const sel = `[data-lm-hint="${typed}"]`
  const el = root.value?.querySelector<HTMLElement>(sel) ?? dock.querySelector<HTMLElement>(sel)
  hint.value = null
  if (el) openWord(word, el, h.idx)
}

usePlayerToggles(
  [
    { label: 'LingoMingo subtitles (Shift+C)', icon: ICONS.subtitles, on: s.showSubs },
    { label: 'LingoMingo subtitles list (Shift+S)', icon: ICONS.sidebar, on: s.showPanel },
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

// The subtitles list goes on the right of the video, as high as the video: over the related
// videos column, or (in theater mode, fullscreen and narrow windows) next to the player, which
// then gets narrower. On Shorts it goes on the right of the like, comment and share buttons, and
// the Shorts video moves to the left (as when YouTube shows its comments). If there is no space
// for it, or if YouTube shows its own panel on Shorts, it stays on the video.
const BESIDE_WIDTH = 398 // 374px list + 12px padding on each side
const MIN_VIDEO_WIDTH = 480
const SHORTS_ACTIONS_WIDTH = 72 // the like, comment and share buttons
const { host: dockHost, root: dock } = shadowHost()
dock.style.height = '100%'
const docked = ref(false)
// The popup for a word in the docked list. Not in the dock: on Shorts the dock is in the reel,
// which moves `position: fixed` children and cuts them off.
const { host: popupHost, root: popupRoot } = shadowHost()
popupHost.style.cssText = 'position:fixed;top:0;left:0;z-index:2300;'
document.documentElement.append(popupHost)
// The list moved or closed: a popup for one of its words must not stay alone on the page.
watch([docked, s.showPanel], () => (selected.value = null))
// Out of fullscreen, make the row only as high as the narrower video needs.
const squeezeStyle = document.createElement('style')
squeezeStyle.textContent =
  'ytd-watch-flexy:not([fullscreen]) #full-bleed-container[lm-squeezed] {' +
  ` height: max(calc((100vw - ${BESIDE_WIDTH}px) * 9 / 16), ${MIN_VIDEO_WIDTH}px) !important;` +
  ' min-height: 0 !important; }' +
  // Center the Shorts video, its buttons and the list together.
  ` [lm-shifted] { right: ${(SHORTS_ACTIONS_WIDTH + BESIDE_WIDTH) / 2}px !important;` +
  ' transition: right 0.3s linear; }'
document.documentElement.append(squeezeStyle)
let squeezed = false
let shiftedReel: HTMLElement | null = null
function placeDock() {
  const column = relatedColumn()
  const row = column ? null : fullBleedRow()
  const beside = row && row.clientWidth >= BESIDE_WIDTH + MIN_VIDEO_WIDTH ? row : null
  const reel = shortsReel()
  const player = currentPlayer()
  // In some YouTube layouts the reel is as wide as the page, so measure the player.
  const besideReel =
    reel &&
    player &&
    !document.querySelector('ytd-shorts[is-watch-while-mode]') &&
    (reel.closest('#shorts-container')?.clientWidth ?? 0) >=
      player.offsetWidth + SHORTS_ACTIONS_WIDTH + BESIDE_WIDTH
      ? reel
      : null
  docked.value = !!(column || beside || besideReel)
  if (column && dockHost.parentElement !== column) column.prepend(dockHost)
  if (beside && dockHost.parentElement !== beside) beside.append(dockHost)
  if (besideReel && dockHost.parentElement !== besideReel) besideReel.append(dockHost)
  const show = docked.value && s.showPanel.value
  if (column) {
    const height = Math.min(currentPlayer()?.offsetHeight ?? 0, innerHeight - 80)
    dockHost.style.cssText =
      `display:${show ? 'block' : 'none'};height:${height}px;` +
      'position:relative;z-index:100;margin-bottom:12px;'
  } else if (besideReel) {
    const r = besideReel.getBoundingClientRect()
    const p = player!.getBoundingClientRect()
    dockHost.style.cssText =
      `display:${show ? 'block' : 'none'};position:absolute;top:${p.top - r.top}px;` +
      `left:${p.right - r.left + SHORTS_ACTIONS_WIDTH}px;width:${BESIDE_WIDTH}px;` +
      `height:${p.height}px;padding:0 12px;box-sizing:border-box;z-index:100;`
  } else {
    dockHost.style.cssText =
      `display:${show ? 'block' : 'none'};flex:none;width:${BESIDE_WIDTH}px;` +
      'padding:12px;box-sizing:border-box;'
  }
  // The player sets the size of its video on window resize only.
  const squeeze = !!beside && show
  document.querySelector('#full-bleed-container')?.toggleAttribute('lm-squeezed', squeeze)
  if (squeeze !== squeezed) {
    squeezed = squeeze
    window.dispatchEvent(new Event('resize'))
  }
  // Move the thumbnail behind the video too: it shows while the video loads.
  const shift =
    besideReel && show
      ? (besideReel.closest<HTMLElement>('.reel-video-in-sequence-new') ?? besideReel)
      : null
  if (shift !== shiftedReel) {
    shiftedReel?.removeAttribute('lm-shifted')
    shift?.setAttribute('lm-shifted', '')
    shiftedReel = shift
  }
}
let dockTimer = 0

// Close the popup on a click anywhere outside it. `closedEl`: the word of the popup this click
// closed. A click on that word only closes its popup, it does not open it again.
let selectedEl: HTMLElement | null = null
let closedEl: HTMLElement | null = null
function onPointerDown(e: PointerEvent) {
  hint.value = null
  closedEl = null
  if (!selected.value) return
  const inPopup = e.composedPath().some((n) => n instanceof HTMLElement && 'lmPopup' in n.dataset)
  if (inPopup) return
  closedEl = selectedEl
  selected.value = null
}

function openWord(word: string, el: HTMLElement, idx = s.activeIdx.value) {
  if (el === closedEl) return
  selectedEl = el
  s.video()?.pause()
  const inDock = el.getRootNode() === dock.getRootNode()
  selected.value = { word, idx, rect: el.getBoundingClientRect(), inDock }
}

const savedItem = computed(() =>
  selected.value ? (s.savedWordOf(selected.value.word) ?? null) : null,
)

async function setStage(stage: Stage, translations: string[], examples: Example[], info: WordInfo) {
  if (!selected.value) return
  await s.markWord(selected.value.word, selected.value.idx, stage, translations, examples, info)
}

async function savePhrase(p: Phrase) {
  if (!selected.value) return
  await s.markWord(p.text, selected.value.idx, 'LEARNING', [p.translation], [], {}, [
    EXPRESSION_TAG,
  ])
}
const stageOf = (text: string) => s.savedWordOf(text)?.stage

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
  if (hint.value) return onHintKey(e)
  // Shift+C / Shift+S: the same as a click on our toggles in the player bar.
  const toggle =
    e.shiftKey && active.value && { c: s.showSubs, s: s.showPanel }[e.key.toLowerCase()]
  if (toggle) {
    e.preventDefault()
    e.stopImmediatePropagation()
    toggle.value = !toggle.value
    return
  }
  if (s.status.value !== 'ready' || !s.studying()) return
  if (popup.value?.onKey(e)) {
    e.preventDefault()
    e.stopImmediatePropagation()
    return
  }
  const actions: Record<string, () => void> = {
    a: s.prev,
    s: s.repeat,
    d: s.next,
    q: s.toggleAutoPause,
    r: () => s.togglePhrase(s.activeIdx.value),
    e: startHints,
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
  popupHost.remove()
  document.querySelector('#full-bleed-container')?.removeAttribute('lm-squeezed')
  shiftedReel?.removeAttribute('lm-shifted')
  squeezeStyle.remove()
  hideNative.remove()
})
</script>

<template>
  <div v-if="active" ref="root" class="pointer-events-none absolute inset-0 z-[60]">
    <div
      v-if="hint"
      class="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-panel/90 px-3 py-1 font-sans text-xs whitespace-nowrap text-fg shadow-lg shadow-black/40"
    >
      Type a letter to open the word · Shift+letter: Learn · E or Esc: exit
    </div>
    <SubtitleBar
      v-if="s.showSubs.value"
      :s="s"
      :selected="selected?.idx === s.activeIdx.value ? selected.word : null"
      :hints="hint?.inBar ? hint : null"
      @word="(w, el) => openWord(w, el)"
      @mark="(w) => markLearning(w)"
    />
    <Teleport :to="dock" :disabled="!docked">
      <!-- While the page loads, YouTube adds the related videos column late. Do not show the list
           on the video first and then move it into the column. -->
      <SidePanel
        v-if="s.showPanel.value && (docked || s.status.value !== 'loading')"
        :s="s"
        :selected="selected"
        :docked="docked"
        :hints="hint && !hint.inBar ? hint : null"
        @close="s.showPanel.value = false"
        @word="openWord"
        @mark="markLearning"
      />
    </Teleport>
    <Teleport :to="popupRoot" :disabled="!selected?.inDock">
      <WordPopup
        v-if="selected"
        ref="popup"
        :key="selected.word + selected.idx"
        class="pointer-events-auto"
        :word="selected.word"
        :sentence="s.cues.value[selected.idx]?.text ?? ''"
        :before="s.cues.value[selected.idx - 1]?.text"
        :after="s.cues.value[selected.idx + 1]?.text"
        :rect="selected.rect"
        :study-lang="s.lang.value"
        :native-lang="s.settings.value.nativeLang"
        :saved-item="savedItem"
        :stage-of="stageOf"
        @stage="setStage"
        @remove="s.unmarkWord(selected.word)"
        @save-phrase="savePhrase"
        @remove-phrase="s.unmarkWord"
        @close="selected = null"
      />
    </Teleport>
  </div>
</template>
