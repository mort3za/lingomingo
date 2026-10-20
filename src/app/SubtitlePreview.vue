<script setup lang="ts">
import { computed } from 'vue'
import { t, uiDir } from '@/shared/i18n'
import { subtitleStyles } from '@/shared/subtitle-style'
import { useSettings } from './settings'

const { settings } = useSettings()
const st = computed(() => subtitleStyles(settings.value))

// The bar is always on the video, so it is always dark: plain white, not `fg`, which turns dark
// in the light theme. White/65 is the dark-theme neutral-400 of the real translation line.
const round = 'grid size-8 place-items-center rounded-full bg-white/10'
const controls = computed(() => '-m-1 p-1 ' + (st.value.dimControls ? 'opacity-40 ' : ''))
</script>

<template>
  <!-- A picture, not controls: hidden from screen readers and from the pointer. -->
  <div
    class="pointer-events-none flex overflow-hidden rounded-xl shadow-2xl ring-1 ring-fg/10"
    aria-hidden="true"
  >
    <!-- A bright, busy "video", so the background opacity and text shadow are easy to see. -->
    <div
      class="flex min-h-48 flex-1 items-end justify-center bg-linear-to-br from-sky-400 via-orange-100 to-lime-600 p-4"
    >
      <div class="flex w-full items-stretch gap-3 rounded-lg px-3 py-2 text-white" :style="st.bar">
        <div
          v-if="!settings.hideSubtitleButtons"
          :class="controls + 'flex flex-col justify-center gap-1 self-center rounded-full'"
          :style="st.controls"
        >
          <span :class="round">›</span>
          <span :class="round">↻</span>
          <span :class="round">‹</span>
        </div>
        <div class="flex flex-1 flex-col justify-center text-center" :style="[st.font, st.text]">
          <div class="leading-snug font-medium" :style="st.barSentence" :dir="uiDir()">
            {{ t('look.sample') }}
          </div>
          <hr class="my-1 border-white/20" />
          <div class="leading-snug text-white/65" :style="st.barTranslation" :dir="uiDir()">
            {{ t('look.sampleTranslation') }}
          </div>
        </div>
        <div
          v-if="!settings.hideSubtitleButtons"
          :class="controls + 'flex flex-col items-center justify-between gap-1 rounded-2xl'"
          :style="st.controls"
        >
          <span :class="round">☆</span>
          <span class="rounded-full bg-white/10 px-2 py-1 text-xs font-bold">AP</span>
          <span :class="round">↑</span>
        </div>
      </div>
    </div>
    <!-- One row of the subtitle list, as it looks next to the video. -->
    <div class="hidden w-56 bg-surface p-2 sm:block" :dir="uiDir()">
      <div class="text-xs font-medium tracking-wide text-neutral-400 uppercase">
        {{ t('look.list') }}
      </div>
      <div class="mt-2 rounded bg-accent/40 px-2 py-1.5" :style="st.font">
        <div :style="st.listSentence">{{ t('look.sample') }}</div>
        <div class="text-neutral-400" :style="st.listTranslation">
          {{ t('look.sampleTranslation') }}
        </div>
      </div>
    </div>
  </div>
</template>
