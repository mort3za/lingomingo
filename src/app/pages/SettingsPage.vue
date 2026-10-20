<script setup lang="ts">
import { computed } from 'vue'
import { T, t } from '@/shared/i18n'
import { LEVEL_LANGS, WORD_STYLE } from '@/shared/vocab'
import LanguageFields from '../LanguageFields.vue'
import ProviderFields from '../ProviderFields.vue'
import SubtitleAppearanceFields from '../SubtitleAppearanceFields.vue'
import VocabLevelField from '../VocabLevelField.vue'
import VoiceFields from '../VoiceFields.vue'
import { useSettings } from '../settings'

const { settings, saved } = useSettings()

const hasLevel = computed(
  () =>
    LEVEL_LANGS.includes(settings.value.studyLang) &&
    settings.value.vocabLevels[settings.value.studyLang] !== undefined,
)
const colorOptions = [
  {
    key: 'showKnownGreen',
    title: 'settings.knownWords',
    on: 'settings.knownOn',
    style: 'KNOWN',
    hint: 'settings.knownHint',
    needsLevel: false,
  },
  {
    key: 'showSuggested',
    title: 'settings.suggested',
    on: 'settings.suggestedOn',
    style: 'SUGGESTED',
    hint: 'settings.suggestedHint',
    needsLevel: true,
  },
  {
    key: 'darkenRare',
    title: 'settings.rare',
    on: 'settings.rareOn',
    style: 'RARE',
    hint: 'settings.rareHint',
    needsLevel: true,
  },
] as const

const card = 'space-y-4 rounded-lg bg-panel p-5'
const hint = 'text-sm text-neutral-400'
const check = 'flex items-center gap-2 text-sm'
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-semibold">{{ t('nav.settings') }}</h1>
        <span v-if="saved" class="text-sm text-emerald-400">{{ t('common.saved') }}</span>
      </div>
      <p :class="hint">
        <T k="settings.intro">
          <template #link>
            <RouterLink to="/setup" class="underline hover:text-fg">{{
              t('settings.setupGuide')
            }}</RouterLink>
          </template>
        </T>
      </p>
    </div>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">{{ t('settings.languages') }}</h2>
        <p :class="hint">{{ t('settings.languagesHint') }}</p>
      </div>
      <LanguageFields />
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">{{ t('settings.vocab') }}</h2>
        <p :class="hint">{{ t('settings.vocabHint') }}</p>
      </div>
      <VocabLevelField />
      <div class="space-y-3">
        <label
          v-for="opt in colorOptions"
          :key="opt.key"
          class="flex items-start gap-3"
          :class="opt.needsLevel && !hasLevel ? 'opacity-50' : 'cursor-pointer'"
        >
          <input
            v-model="settings[opt.key]"
            type="checkbox"
            class="mt-1"
            :disabled="opt.needsLevel && !hasLevel"
          />
          <span class="flex-1">
            <span class="flex items-center gap-2 text-sm">
              {{ t(opt.title) }}
              <span
                class="rounded bg-surface-deep px-1.5 text-xs"
                :class="settings[opt.key] ? WORD_STYLE[opt.style] : 'text-neutral-500'"
                >{{ settings[opt.key] ? t(opt.on) : t('settings.off') }}</span
              >
            </span>
            <span class="block text-xs text-neutral-500">{{ t(opt.hint) }}</span>
          </span>
        </label>
      </div>
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">{{ t('settings.subtitles') }}</h2>
        <p :class="hint">{{ t('settings.subtitlesHint') }}</p>
      </div>
      <div class="space-y-2">
        <label :class="check">
          <input v-model="settings.autoPause" type="checkbox" />
          {{ t('settings.autoPause') }}
        </label>
        <label :class="check">
          <input v-model="settings.hideTranslation" type="checkbox" />
          {{ t('settings.hideTranslation') }}
        </label>
        <label class="flex cursor-pointer items-start gap-2">
          <input v-model="settings.hideSubtitleButtons" type="checkbox" class="mt-1" />
          <span class="flex-1">
            <span class="block text-sm">{{ t('settings.hideButtons') }}</span>
            <span class="block text-xs text-neutral-500">{{ t('settings.hideButtonsHint') }}</span>
          </span>
        </label>
        <label class="flex cursor-pointer items-start gap-2">
          <input v-model="settings.nativeVideosLikeOthers" type="checkbox" class="mt-1" />
          <span class="flex-1">
            <span class="block text-sm">{{ t('settings.nativeLikeOthers') }}</span>
            <span class="block text-xs text-neutral-500">
              {{ t('settings.nativeLikeOthersHint') }}
            </span>
          </span>
        </label>
      </div>
      <SubtitleAppearanceFields />
    </section>

    <section id="ai" :class="card">
      <div>
        <h2 class="text-lg font-medium">{{ t('settings.ai') }}</h2>
        <p :class="hint">{{ t('settings.aiHint') }}</p>
      </div>
      <ProviderFields />
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">{{ t('settings.voice') }}</h2>
        <p :class="hint">{{ t('settings.voiceHint') }}</p>
      </div>
      <VoiceFields />
    </section>
  </div>
</template>
