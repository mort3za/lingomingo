<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { download } from '@/shared/download'
import { subtitleFile, type SubtitleContent, type SubtitleFormat } from '@/shared/subtitle-export'
import { LANGUAGES } from '@/shared/types'
import { zip } from '@/shared/zip'
import type { YoutubeSession } from './session'

const props = defineProps<{ s: YoutubeSession }>()

const FORMATS: { value: SubtitleFormat; hint: string }[] = [
  { value: 'srt', hint: 'For most video players' },
  { value: 'vtt', hint: 'For web video players' },
  { value: 'csv', hint: 'For spreadsheets, a column for each language' },
]

// `waiting`: for the subtitles to load (an ad delays them). `working`: translating.
// `both`: a file for each language, in one zip file. A browser asks before a page saves a
// second file, so the two files go in one download.
type Choice = SubtitleContent | 'both'
type Phase = 'idle' | 'waiting' | 'working' | 'paused' | 'error' | 'saved'

const open = ref(false)
const content = ref<Choice>('both')
const format = ref<SubtitleFormat>('srt')
const phase = ref<Phase>('idle')
// The error, or the name of the saved file.
const note = ref('')
let ctrl: AbortController | null = null

const name = (code: string) => LANGUAGES[code] ?? code
const study = computed(() => props.s.lang.value)
const native = computed(() => props.s.settings.value.nativeLang)
const choices = computed(() => [
  { value: 'original' as const, label: name(study.value) },
  { value: 'translation' as const, label: name(native.value) },
  {
    value: 'both' as const,
    label: `${name(study.value)} and ${name(native.value)}, in a zip file`,
  },
])
// A video in the translation language has no translation: only its own subtitles.
const what = computed<Choice>(() => (props.s.translates.value ? content.value : 'original'))
const needsTranslation = computed(() => what.value !== 'original')

const total = computed(() => props.s.cues.value.length)
const translated = computed(
  () => props.s.cues.value.filter((_, i) => props.s.translationOf(i) !== null).length,
)
const share = computed(() => (total.value ? translated.value / total.value : 0))
// Lines the AI translates first. A human track can miss some lines: they stay empty.
const missing = computed(() =>
  needsTranslation.value && !props.s.humanTranslation.value ? total.value - translated.value : 0,
)
const busy = computed(() => phase.value === 'waiting' || phase.value === 'working')

const status = computed(() => {
  if (phase.value === 'error' || phase.value === 'saved') return note.value
  if (phase.value === 'waiting') return 'Waiting for the subtitles… An ad can delay them.'
  if (props.s.status.value !== 'ready') return 'The subtitles are not loaded yet.'
  if (!needsTranslation.value) return `${total.value} lines`
  const count = `${translated.value} / ${total.value} lines translated`
  if (phase.value === 'working') return `Translating… ${count}`
  if (phase.value === 'paused') return `Paused. ${count}`
  return count
})
const action = computed(() => {
  if (phase.value === 'waiting') return 'Cancel'
  if (phase.value === 'working') return 'Pause'
  if (phase.value === 'error') return 'Try again'
  if (!missing.value) return 'Download'
  return phase.value === 'paused' ? 'Continue' : 'Translate and download'
})

/** Resolves when the subtitles are loaded, or on `signal`. Rejects when the video has none. */
function subtitlesLoaded(signal: AbortSignal): Promise<void> {
  const s = props.s
  return new Promise((resolve, reject) => {
    let stop = () => {}
    const check = () => {
      const st = s.status.value
      if (st === 'no-subs' || st === 'error') {
        reject(new Error(s.message.value || 'This video has no subtitles.'))
      } else if (st === 'ready' || signal.aborted) resolve()
      else return
      stop()
      signal.removeEventListener('abort', check)
    }
    stop = watch(s.status, check)
    signal.addEventListener('abort', check)
    check()
  })
}

async function run() {
  if (busy.value) return ctrl?.abort()
  const s = props.s
  const id = s.videoId.value
  if (!id) return
  const mine = (ctrl = new AbortController())
  try {
    if (s.status.value !== 'ready') {
      phase.value = 'waiting'
      await subtitlesLoaded(mine.signal)
      if (ctrl !== mine) return
      if (mine.signal.aborted) return void (phase.value = 'idle')
    }
    phase.value = 'working'
    // AI translation exists only for the parts the user watched: translate the rest first.
    if (needsTranslation.value) await s.translateAll(mine.signal)
    if (ctrl !== mine) return
    if (mine.signal.aborted) return void (phase.value = 'paused')
    const lines = s.cues.value.map((c, i) => ({ ...c, translation: s.translationOf(i) }))
    const { make, type } = subtitleFile[format.value]
    const fileOf = (part: SubtitleContent) => ({
      name: `${id}.${part === 'original' ? study.value : native.value}.${format.value}`,
      text: make(lines, part),
    })
    let name: string
    if (what.value === 'both') {
      name = `${id}.${study.value}-${native.value}.zip`
      download(name, zip([fileOf('original'), fileOf('translation')]), 'application/zip')
    } else {
      const file = fileOf(what.value)
      name = file.name
      download(name, file.text, type)
    }
    note.value = `Saved as ${name}`
    phase.value = 'saved'
  } catch (e) {
    if (ctrl !== mine) return
    note.value = e instanceof Error ? e.message : String(e)
    phase.value = 'error'
  }
}

// A new choice clears the last result. A translation that runs keeps running.
watch([content, format], () => !busy.value && (phase.value = 'idle'))
// Another video: stop and start again.
watch(
  () => props.s.videoId.value,
  () => {
    ctrl?.abort()
    ctrl = null
    phase.value = 'idle'
  },
)

// A click out of the popover closes it. It is in a shadow root: check the event path.
const root = ref<HTMLElement>()
const onPointerDown = (e: PointerEvent) => {
  if (root.value && !e.composedPath().includes(root.value)) open.value = false
}
onMounted(() => window.addEventListener('pointerdown', onPointerDown, true))
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerDown, true)
  ctrl?.abort()
})

// Progress circle: r = 9, so the line is 2πr long.
const LENGTH = 2 * Math.PI * 9
</script>

<template>
  <!-- Not `relative`: the popover is placed in the panel header, so it is as wide as the panel. -->
  <div ref="root" class="flex">
    <button
      :class="
        'flex size-5 items-center justify-center ' + (open ? 'text-fg' : 'text-fg/60 hover:text-fg')
      "
      title="Download the subtitles"
      @click="open = !open"
    >
      <svg v-if="busy" class="size-4 -rotate-90" viewBox="0 0 24 24" fill="none" stroke-width="3">
        <circle cx="12" cy="12" r="9" class="stroke-fg/20" />
        <circle
          cx="12"
          cy="12"
          r="9"
          class="stroke-accent transition-[stroke-dashoffset]"
          stroke-linecap="round"
          :stroke-dasharray="LENGTH"
          :stroke-dashoffset="LENGTH * (1 - share)"
        />
      </svg>
      <svg
        v-else
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute inset-x-2 top-full z-20 mt-1 rounded-lg border border-fg/10 bg-surface p-3 text-[13px] shadow-lg"
    >
      <div class="mb-3 text-[15px] font-medium">Download subtitles</div>

      <template v-if="s.translates.value">
        <div class="mb-1 text-[11px] font-medium tracking-wide text-fg/50 uppercase">Text</div>
        <div class="mb-3 space-y-0.5">
          <label
            v-for="c in choices"
            :key="c.value"
            class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-fg/10"
          >
            <input v-model="content" type="radio" :value="c.value" class="accent-accent" />
            <span class="truncate">{{ c.label }}</span>
          </label>
        </div>
      </template>

      <div class="mb-1 text-[11px] font-medium tracking-wide text-fg/50 uppercase">Format</div>
      <div class="flex gap-1">
        <button
          v-for="f in FORMATS"
          :key="f.value"
          :class="
            'flex-1 rounded px-2 py-1 font-medium uppercase ' +
            (format === f.value ? 'bg-accent text-white' : 'bg-fg/10 hover:bg-fg/20')
          "
          @click="format = f.value"
        >
          {{ f.value }}
        </button>
      </div>
      <div class="mt-1 mb-3 text-[12px] text-fg/50">
        {{ FORMATS.find((f) => f.value === format)?.hint }}
      </div>

      <div class="border-t border-fg/10 pt-3">
        <!-- Always there, so the popover does not change its height. -->
        <div
          class="h-1 overflow-hidden rounded-full bg-fg/10"
          :class="!needsTranslation && 'invisible'"
        >
          <div class="h-full bg-accent transition-[width]" :style="{ width: `${share * 100}%` }" />
        </div>
        <div
          :class="
            'mt-1.5 mb-2 truncate ' +
            (phase === 'error'
              ? 'text-red-300'
              : phase === 'saved'
                ? 'text-emerald-300'
                : 'text-fg/60')
          "
          :title="status"
        >
          {{ status }}
        </div>
        <button
          :class="
            'w-full rounded px-3 py-1.5 font-medium ' +
            (busy ? 'bg-fg/10 hover:bg-fg/20' : 'bg-accent text-white hover:brightness-110')
          "
          @click="run"
        >
          {{ action }}
        </button>
      </div>
    </div>
  </div>
</template>
