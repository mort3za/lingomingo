<script setup lang="ts">
// Open source code and data that ship in the extension.
const software = [
  {
    name: 'Vue',
    url: 'https://vuejs.org',
    license: 'MIT',
    copyright: 'Copyright (c) 2018-present, Yuxi (Evan) You',
  },
  {
    name: 'Vue Router',
    url: 'https://router.vuejs.org',
    license: 'MIT',
    copyright: 'Copyright (c) 2019-present Eduardo San Martin Morote',
  },
  {
    name: 'ts-fsrs',
    url: 'https://github.com/open-spaced-repetition/ts-fsrs',
    license: 'MIT',
    copyright: 'Copyright (c) 2026 Open Spaced Repetition',
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    license: 'MIT',
    copyright: 'Copyright (c) Tailwind Labs, Inc.',
  },
]

const data = [
  {
    name: 'FrequencyWords',
    url: 'https://github.com/hermitdave/FrequencyWords',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    copyright: 'By Hermit Dave, made from OpenSubtitles 2018 (opus.nlpl.eu).',
    use: 'Word frequency lists for the vocabulary level. Changed: only the 20,000 most frequent words, lowercased.',
  },
  {
    name: 'Lemmatization Lists',
    url: 'https://github.com/michmech/lemmatization-lists',
    license: 'ODbL 1.0',
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    copyright: 'By Michal Měchura.',
    use: 'Word forms and their dictionary forms (German, English, Spanish, French, Italian, Portuguese, Russian, Swedish). Changed: only frequent forms, lowercased. The changed lists are in the freq folder of the extension, under the same license.',
  },
]
</script>

<template>
  <div class="max-w-2xl space-y-8">
    <h1 class="text-2xl font-semibold">Credits</h1>
    <p class="text-sm text-neutral-400">LingoMingo uses these open source projects. Thank you!</p>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">Software</h2>
      <div v-for="item in software" :key="item.name" class="rounded bg-panel p-3 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <a :href="item.url" target="_blank" class="font-medium hover:underline">{{
            item.name
          }}</a>
          <span class="text-xs text-neutral-400">{{ item.license }} License</span>
        </div>
        <div class="text-neutral-400">{{ item.copyright }}</div>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">Data</h2>
      <div v-for="item in data" :key="item.name" class="space-y-1 rounded bg-panel p-3 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <a :href="item.url" target="_blank" class="font-medium hover:underline">{{
            item.name
          }}</a>
          <a
            :href="item.licenseUrl"
            target="_blank"
            class="text-xs text-neutral-400 hover:underline"
          >
            {{ item.license }}
          </a>
        </div>
        <div class="text-neutral-400">{{ item.copyright }}</div>
        <div class="text-neutral-300">{{ item.use }}</div>
      </div>
    </section>
  </div>
</template>
