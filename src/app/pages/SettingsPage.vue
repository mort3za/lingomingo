<script setup lang="ts">
import { computed } from 'vue'
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
    title: 'Known words',
    on: 'green',
    style: 'KNOWN',
    hint: 'Words below your level, and words you marked as Known.',
    needsLevel: false,
  },
  {
    key: 'showSuggested',
    title: 'Suggested words',
    on: 'orange',
    style: 'SUGGESTED',
    hint: 'The next 1,000 common words above your level. Learn these next.',
    needsLevel: true,
  },
  {
    key: 'darkenRare',
    title: 'Rare words',
    on: 'darker',
    style: 'RARE',
    hint: 'Words far above your level, or not in the word list. Skip them for now. Recommended.',
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
        <h1 class="text-2xl font-semibold">Settings</h1>
        <span v-if="saved" class="text-sm text-emerald-400">Saved</span>
      </div>
      <p :class="hint">
        Changes save automatically. Want help step by step? Open the
        <RouterLink to="/setup" class="underline hover:text-fg">setup guide</RouterLink>.
      </p>
    </div>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">Languages</h2>
        <p :class="hint">The language you learn, and the language for translations.</p>
      </div>
      <LanguageFields />
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">Vocabulary highlighting</h2>
        <p :class="hint">Colors in subtitles and texts show which words you know.</p>
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
              {{ opt.title }}
              <span
                class="rounded bg-surface-deep px-1.5 text-xs"
                :class="settings[opt.key] ? WORD_STYLE[opt.style] : 'text-neutral-500'"
                >{{ settings[opt.key] ? opt.on : 'off' }}</span
              >
            </span>
            <span class="block text-xs text-neutral-500">{{ opt.hint }}</span>
          </span>
        </label>
      </div>
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">Subtitles</h2>
        <p :class="hint">How the subtitle bar works on videos.</p>
      </div>
      <div class="space-y-2">
        <label :class="check">
          <input v-model="settings.autoPause" type="checkbox" />
          Auto-pause after each subtitle
        </label>
        <label :class="check">
          <input v-model="settings.hideTranslation" type="checkbox" />
          Hide translation line
        </label>
        <label class="flex cursor-pointer items-start gap-2">
          <input v-model="settings.hideSubtitleButtons" type="checkbox" class="mt-1" />
          <span class="flex-1">
            <span class="block text-sm">Hide buttons on the subtitle bar</span>
            <span class="block text-xs text-neutral-500">
              The keyboard shortcuts still work: A previous, S repeat, D next, R save sentence, Q
              auto-pause.
            </span>
          </span>
        </label>
        <label class="flex cursor-pointer items-start gap-2">
          <input v-model="settings.nativeVideosLikeOthers" type="checkbox" class="mt-1" />
          <span class="flex-1">
            <span class="block text-sm">Treat videos in your translation language like others</span>
            <span class="block text-xs text-neutral-500">
              Off: these videos start with the subtitles and the list off. You can turn them on in
              the player, but that choice is not saved for the next videos.
            </span>
          </span>
        </label>
      </div>
      <SubtitleAppearanceFields />
    </section>

    <section id="ai" :class="card">
      <div>
        <h2 class="text-lg font-medium">AI translation</h2>
        <p :class="hint">
          Translates the subtitles when YouTube has no subtitles in your translation language. Also
          used for the word popup, and for translations and example sentences on the Review and
          Saved pages. LingoMingo never uses YouTube's automatic translation. It can use YouTube's
          auto-generated subtitles.
        </p>
      </div>
      <ProviderFields />
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">Voice</h2>
        <p :class="hint">
          Reads words and example sentences aloud when you click a play button, in the word popup
          and on the Review and Saved pages.
        </p>
      </div>
      <VoiceFields />
    </section>
  </div>
</template>
