<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatNumber, langLabel, langName, T, t } from '@/shared/i18n'
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
        {{ t('vocab.levelFor', { lang: langLabel(settings.studyLang) }) }}
      </div>
      <div v-if="level === undefined" class="text-sm text-neutral-300">
        {{ t('vocab.notSet') }}
      </div>
      <div v-else class="text-sm">
        <T k="vocab.youKnow">
          <template #n>
            <span class="font-semibold tabular-nums">{{ formatNumber(level) }}</span>
          </template>
        </T>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <button
        v-if="level !== undefined"
        type="button"
        class="text-sm text-neutral-400 underline hover:text-fg"
        @click="setLevel(undefined)"
      >
        {{ t('vocab.turnOff') }}
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
        {{ level === undefined ? t('vocab.setLevel') : t('vocab.changeLevel') }}
      </button>
    </div>
  </div>
  <p v-else class="text-sm text-neutral-400">
    {{ t('vocab.notAvailable', { lang: langName(settings.studyLang) }) }}
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
