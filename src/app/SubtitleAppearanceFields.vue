<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatNumber, t } from '@/shared/i18n'
import { DEFAULT_SETTINGS } from '@/shared/types'
import FontField from './FontField.vue'
import SubtitlePreview from './SubtitlePreview.vue'
import { LABEL, useSettings } from './settings'

const { settings } = useSettings()

const sliders = [
  { key: 'subtitleBgOpacity', label: 'look.barBg', min: 0, max: 100, step: 10, unit: '%' },
  { key: 'subtitleTextSize', label: 'look.barSize', min: 18, max: 44, step: 2, unit: 'px' },
  { key: 'listTextSize', label: 'look.listSize', min: 12, max: 22, step: 1, unit: 'px' },
] as const
const KEYS = ['subtitleFont', ...sliders.map((s) => s.key)] as const

const isDefault = computed(() => KEYS.every((k) => settings.value[k] === DEFAULT_SETTINGS[k]))
function reset() {
  Object.assign(settings.value, Object.fromEntries(KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])))
  showPreview()
}

// The preview floats over the page while the user changes these settings, so nothing moves.
// It shows at the top of the screen when the fields are in the lower half, and the other way.
const root = ref<HTMLElement>()
const preview = ref<{ top: boolean; left: number; width: number } | null>(null)
let holding = false
let timer: ReturnType<typeof setTimeout> | undefined
function showPreview() {
  const r = root.value?.getBoundingClientRect()
  if (!r) return
  preview.value = { top: r.top + r.height / 2 > innerHeight / 2, left: r.left, width: r.width }
  clearTimeout(timer)
  if (!holding) timer = setTimeout(() => (preview.value = null), 2000)
}
function hold() {
  holding = true
  showPreview()
}
function release() {
  if (!holding) return
  holding = false
  showPreview()
}
onMounted(() => addEventListener('pointerup', release))
onBeforeUnmount(() => {
  removeEventListener('pointerup', release)
  clearTimeout(timer)
})
</script>

<template>
  <div ref="root" class="space-y-3 border-t border-fg/10 pt-4" @input="showPreview">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-medium">{{ t('look.title') }}</h3>
      <!-- Hidden, not removed, with the default look: the heading does not move. -->
      <button
        type="button"
        class="text-sm text-neutral-400 underline hover:text-fg"
        :class="isDefault && 'invisible'"
        @click="reset"
      >
        {{ t('look.reset') }}
      </button>
    </div>
    <FontField @pick="showPreview" />
    <div class="grid gap-4 sm:grid-cols-3">
      <div v-for="opt in sliders" :key="opt.key">
        <label :class="LABEL" :for="opt.key">
          {{ t(opt.label) }}
          <span class="text-fg tabular-nums" dir="ltr"
            >{{ formatNumber(settings[opt.key]) }}{{ opt.unit }}</span
          >
        </label>
        <input
          :id="opt.key"
          v-model.number="settings[opt.key]"
          type="range"
          :min="opt.min"
          :max="opt.max"
          :step="opt.step"
          :list="`${opt.key}-default`"
          class="w-full accent-accent"
          @pointerdown="hold"
        />
        <!-- A tick mark at the default value. -->
        <datalist :id="`${opt.key}-default`">
          <option :value="DEFAULT_SETTINGS[opt.key]" />
        </datalist>
      </div>
    </div>
  </div>
  <!-- In <body>: as a sibling here, it takes part in the section's spacing and moves the page. -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="preview"
        class="fixed z-40 font-sans text-fg"
        :class="preview.top ? 'top-4' : 'bottom-4'"
        :style="{ left: `${preview.left}px`, width: `${preview.width}px` }"
      >
        <SubtitlePreview />
      </div>
    </Transition>
  </Teleport>
</template>
