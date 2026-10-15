<script setup lang="ts">
import { computed, ref } from 'vue'
import { LANGUAGES } from '@/shared/types'
import { LEVEL_LANGS } from '@/shared/vocab'
import { useSettings } from './settings'
import VocabLevelDialog from './VocabLevelDialog.vue'

const { settings } = useSettings()

const levelOpen = ref(false)
const level = computed(() => settings.value.vocabLevels[settings.value.studyLang])
function setLevel(value: number | undefined) {
  const levels = { ...settings.value.vocabLevels }
  if (value === undefined) delete levels[settings.value.studyLang]
  else levels[settings.value.studyLang] = value
  settings.value.vocabLevels = levels
  levelOpen.value = false
}
</script>

<template>
  <div
    v-if="LEVEL_LANGS.includes(settings.studyLang)"
    class="flex flex-wrap items-center justify-between gap-3 rounded border border-fg/10 bg-surface-deep px-4 py-3"
  >
    <div>
      <div class="text-xs font-medium tracking-wide text-neutral-400 uppercase">
        Vocabulary level · {{ LANGUAGES[settings.studyLang] }}
      </div>
      <div v-if="level === undefined" class="text-sm text-neutral-300">
        Not set. Set it to see the words you know in color.
      </div>
      <div v-else class="text-sm">
        You know the
        <span class="font-semibold tabular-nums">{{ level.toLocaleString('en') }}</span> most common
        words
      </div>
    </div>
    <div class="flex items-center gap-4">
      <button
        v-if="level !== undefined"
        type="button"
        class="text-sm text-neutral-400 underline hover:text-fg"
        @click="setLevel(undefined)"
      >
        Turn off
      </button>
      <button
        type="button"
        class="rounded px-4 py-2 text-sm font-medium"
        :class="
          level === undefined
            ? 'border border-transparent bg-accent text-white hover:brightness-110'
            : 'border border-fg/20 hover:bg-fg/10'
        "
        @click="levelOpen = true"
      >
        {{ level === undefined ? 'Set level' : 'Change level' }}
      </button>
    </div>
  </div>
  <p v-else class="text-sm text-neutral-400">
    Vocabulary level is not available for {{ LANGUAGES[settings.studyLang] }} yet.
  </p>
  <VocabLevelDialog
    v-if="levelOpen"
    v-model:show-known-green="settings.showKnownGreen"
    v-model:darken-rare="settings.darkenRare"
    :lang="settings.studyLang"
    :level="level"
    :show-suggested="settings.showSuggested"
    @set="setLevel"
    @close="levelOpen = false"
  />
</template>
