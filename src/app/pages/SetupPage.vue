<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatNumber, langName, resolveUiLang, t } from '@/shared/i18n'
import { DEFAULT_SETTINGS } from '@/shared/types'
import LanguageFields from '../LanguageFields.vue'
import ProviderFields from '../ProviderFields.vue'
import VocabLevelField from '../VocabLevelField.vue'
import { useSettings } from '../settings'

const { settings } = useSettings()

// Most users read translations best in the language of the interface. While the translation
// language is the default and the user did not pick one here, it follows the interface language
// (not when that is the study language).
let follow = settings.value.nativeLang === DEFAULT_SETTINGS.nativeLang
watch(
  () => settings.value.uiLang,
  (pref) => {
    const lang = resolveUiLang(pref)
    if (follow && lang !== settings.value.studyLang) settings.value.nativeLang = lang
  },
  { immediate: true },
)
watch(
  () => settings.value.nativeLang,
  (lang) => lang !== resolveUiLang(settings.value.uiLang) && (follow = false),
)

const steps = computed(() => [
  t('setup.stepLanguages'),
  t('setup.stepVocab'),
  t('setup.stepAi'),
  t('setup.stepDone'),
])
const step = ref(0)

const hint = 'text-sm text-neutral-400'
const btn = 'rounded border border-transparent px-5 py-2 text-sm font-medium'
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 py-6">
    <div class="flex items-center gap-3">
      <img src="/icons/icon.svg" alt="" class="size-10" />
      <div>
        <h1 class="text-2xl font-semibold">{{ t('setup.welcome') }}</h1>
        <p :class="hint">{{ t('setup.intro') }}</p>
      </div>
    </div>

    <ol class="flex gap-2">
      <li v-for="(name, i) in steps" :key="i" class="flex-1">
        <div :class="['h-1 rounded', i <= step ? 'bg-accent' : 'bg-fg/10']" />
        <span :class="['mt-1 block text-xs', i === step ? 'text-fg' : 'text-neutral-500']">
          {{ formatNumber(i + 1) }}. {{ name }}
        </span>
      </li>
    </ol>

    <section class="space-y-4 rounded-lg bg-panel p-6">
      <template v-if="step === 0">
        <h2 class="text-lg font-medium">{{ t('setup.langTitle') }}</h2>
        <p :class="hint">{{ t('setup.langHint') }}</p>
        <LanguageFields />
      </template>

      <template v-else-if="step === 1">
        <h2 class="text-lg font-medium">{{ t('setup.vocabTitle') }}</h2>
        <p :class="hint">{{ t('setup.vocabHint') }}</p>
        <VocabLevelField />
      </template>

      <template v-else-if="step === 2">
        <h2 class="text-lg font-medium">{{ t('setup.aiTitle') }}</h2>
        <p :class="hint">{{ t('setup.aiHint') }}</p>
        <ProviderFields />
      </template>

      <template v-else>
        <h2 class="text-lg font-medium">{{ t('setup.readyTitle') }}</h2>
        <p :class="hint">{{ t('setup.readyHint', { lang: langName(settings.studyLang) }) }}</p>
        <div class="flex flex-wrap gap-3">
          <a
            href="https://www.youtube.com"
            target="_blank"
            :class="[btn, 'bg-accent text-white hover:brightness-110']"
          >
            {{ t('setup.openYoutube') }}
          </a>
          <RouterLink to="/media" :class="[btn, 'border border-fg/20 hover:bg-fg/10']">
            {{ t('setup.browseMedia') }}
          </RouterLink>
        </div>
      </template>
    </section>

    <div v-if="step < steps.length - 1" class="flex items-center gap-3">
      <button
        v-if="step > 0"
        type="button"
        :class="[btn, 'border border-fg/20 hover:bg-fg/10']"
        @click="step--"
      >
        {{ t('setup.back') }}
      </button>
      <RouterLink to="/media" class="ms-auto text-sm text-neutral-400 hover:text-fg">
        {{ t('setup.skip') }}
      </RouterLink>
      <button
        type="button"
        :class="[btn, 'bg-accent text-white hover:brightness-110']"
        @click="step++"
      >
        {{ t('setup.next') }}
      </button>
    </div>
  </div>
</template>
