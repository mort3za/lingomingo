<script setup lang="ts">
import { ref } from 'vue'
import type { SubtitleFormat } from '@/shared/export'
import type { YoutubeSession } from './session'

const props = defineProps<{ s: YoutubeSession }>()
const emit = defineEmits<{ close: [] }>()

const FORMATS: { value: SubtitleFormat; label: string }[] = [
  { value: 'srt', label: 'SRT' },
  { value: 'vtt', label: 'VTT' },
  { value: 'csv', label: 'CSV' },
]
const format = ref<SubtitleFormat>('srt')
const withTranslation = ref(true)

function start() {
  void props.s.exportSubtitles(format.value, withTranslation.value)
  emit('close')
}
</script>

<template>
  <!-- Covers the list only: the video keeps playing. -->
  <div
    class="absolute inset-0 z-20 grid place-items-center bg-black/50 p-3"
    @click.self="emit('close')"
    @keydown.esc.stop="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lm-export-title"
      class="w-full space-y-4 rounded-lg bg-panel p-4 text-[14px] shadow-xl"
    >
      <div class="flex items-center justify-between">
        <h2 id="lm-export-title" class="text-[15px] font-medium">Export subtitles</h2>
        <button class="text-fg/60 hover:text-fg" title="Close" @click="emit('close')">✕</button>
      </div>
      <div class="space-y-1.5">
        <div class="text-[13px] text-neutral-400">Format</div>
        <div class="flex gap-1.5" role="radiogroup" aria-label="Format">
          <button
            v-for="f in FORMATS"
            :key="f.value"
            role="radio"
            :aria-checked="format === f.value"
            :class="
              'flex-1 rounded border px-2 py-1 font-medium ' +
              (format === f.value
                ? 'border-accent bg-accent text-white'
                : 'border-fg/20 hover:bg-fg/10')
            "
            @click="format = f.value"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <label v-if="s.translates.value" class="flex cursor-pointer items-center gap-2">
        <input v-model="withTranslation" type="checkbox" />
        Include translation
      </label>
      <p
        v-if="s.translates.value && withTranslation && s.exportLeft.value"
        class="text-[13px] text-neutral-400"
      >
        Lines without a translation are translated first with your AI provider. You can keep
        watching while it runs.
      </p>
      <div class="flex justify-end gap-2">
        <button class="rounded border border-fg/20 px-3 py-1 hover:bg-fg/10" @click="emit('close')">
          Cancel
        </button>
        <button
          class="rounded bg-accent px-3 py-1 font-medium text-white hover:brightness-110"
          @click="start"
        >
          Export
        </button>
      </div>
    </div>
  </div>
</template>
