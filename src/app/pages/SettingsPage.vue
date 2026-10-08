<script setup lang="ts">
import LanguageFields from '../LanguageFields.vue'
import ProviderFields from '../ProviderFields.vue'
import VocabLevelField from '../VocabLevelField.vue'
import { useSettings } from '../settings'

const { settings, saved } = useSettings()

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
        <RouterLink to="/setup" class="text-accent hover:underline">setup guide</RouterLink>.
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
      <div class="space-y-2 border-t border-white/10 pt-4">
        <label :class="[check, 'text-emerald-300']">
          <input v-model="settings.showKnownGreen" type="checkbox" class="accent-accent" />
          Show known words in green
        </label>
        <label :class="[check, 'text-orange-200']">
          <input v-model="settings.showSuggested" type="checkbox" class="accent-accent" />
          Show suggested words in orange color
        </label>
        <label :class="[check, 'text-white/45']">
          <input v-model="settings.darkenRare" type="checkbox" class="accent-accent" />
          Darken rare words (recommended)
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
          <input v-model="settings.autoPause" type="checkbox" class="accent-accent" />
          Auto-pause after each subtitle
        </label>
        <label :class="check">
          <input v-model="settings.hideTranslation" type="checkbox" class="accent-accent" />
          Hide translation line
        </label>
      </div>
    </section>

    <section :class="card">
      <div>
        <h2 class="text-lg font-medium">AI translation</h2>
        <p :class="hint">
          Used when YouTube has no human-made subtitles in your translation language, and for the
          word popup. Auto-generated YouTube subtitles are never used.
        </p>
      </div>
      <ProviderFields />
    </section>
  </div>
</template>
