<script setup lang="ts">
import { ref } from 'vue'
import { LANGUAGES } from '@/shared/types'
import LanguageFields from '../LanguageFields.vue'
import ProviderFields from '../ProviderFields.vue'
import VocabLevelField from '../VocabLevelField.vue'
import { useSettings } from '../settings'

const { settings } = useSettings()

const steps = ['Languages', 'Vocabulary', 'AI translation', 'Done']
const step = ref(0)

const hint = 'text-sm text-neutral-400'
const btn = 'rounded border border-transparent px-5 py-2 text-sm font-medium'
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 py-6">
    <div class="flex items-center gap-3">
      <img src="/icons/icon.svg" alt="" class="size-10" />
      <div>
        <h1 class="text-2xl font-semibold">Welcome to LingoMingo</h1>
        <p :class="hint">Set up the basics in a minute. You can change all of it later.</p>
      </div>
    </div>

    <ol class="flex gap-2">
      <li v-for="(name, i) in steps" :key="name" class="flex-1">
        <div :class="['h-1 rounded', i <= step ? 'bg-accent' : 'bg-white/10']" />
        <span :class="['mt-1 block text-xs', i === step ? 'text-white' : 'text-neutral-500']">
          {{ i + 1 }}. {{ name }}
        </span>
      </li>
    </ol>

    <section class="space-y-4 rounded-lg bg-panel p-6">
      <template v-if="step === 0">
        <h2 class="text-lg font-medium">Which languages?</h2>
        <p :class="hint">
          Pick the language you learn, and the language you know well. Translations show in the
          second one.
        </p>
        <LanguageFields />
      </template>

      <template v-else-if="step === 1">
        <h2 class="text-lg font-medium">How many words do you know?</h2>
        <p :class="hint">
          LingoMingo shows the words you probably know in green, so new words stand out. Optional.
        </p>
        <VocabLevelField />
      </template>

      <template v-else-if="step === 2">
        <h2 class="text-lg font-medium">AI translation</h2>
        <p :class="hint">
          When YouTube has no human-made subtitles in your language, an AI model translates them. It
          also explains words in the word popup. You need an API key or a local model. Optional.
        </p>
        <ProviderFields />
      </template>

      <template v-else>
        <h2 class="text-lg font-medium">You are ready</h2>
        <p :class="hint">
          Open a YouTube video with {{ LANGUAGES[settings.studyLang] }} subtitles. The LingoMingo
          subtitle bar shows on the video. Click a word to see its meaning and save it.
        </p>
        <div class="flex flex-wrap gap-3">
          <a
            href="https://www.youtube.com"
            target="_blank"
            :class="[btn, 'bg-accent hover:brightness-110']"
          >
            Open YouTube
          </a>
          <RouterLink to="/media" :class="[btn, 'border border-white/20 hover:bg-white/10']">
            Browse media
          </RouterLink>
        </div>
      </template>
    </section>

    <div v-if="step < steps.length - 1" class="flex items-center gap-3">
      <button
        v-if="step > 0"
        type="button"
        :class="[btn, 'border border-white/20 hover:bg-white/10']"
        @click="step--"
      >
        Back
      </button>
      <RouterLink to="/media" class="ml-auto text-sm text-neutral-400 hover:text-white">
        Skip setup
      </RouterLink>
      <button type="button" :class="[btn, 'bg-accent hover:brightness-110']" @click="step++">
        Next
      </button>
    </div>
  </div>
</template>
