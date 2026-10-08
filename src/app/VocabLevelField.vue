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
  <div v-if="LEVEL_LANGS.includes(settings.studyLang)" class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      class="rounded border border-white/30 px-4 py-2 text-sm font-medium tracking-wide uppercase hover:bg-white/10"
      @click="levelOpen = true"
    >
      Set vocabulary level
    </button>
    <span class="text-sm text-neutral-400">
      {{ level === undefined ? 'Not set' : `You know the ${level} most common words` }}
    </span>
    <button
      v-if="level !== undefined"
      type="button"
      class="text-sm text-neutral-400 underline hover:text-white"
      @click="setLevel(undefined)"
    >
      Turn off
    </button>
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
