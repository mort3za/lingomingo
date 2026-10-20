<script setup lang="ts">
import { t, type Key } from '@/shared/i18n'

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
  {
    name: 'Vazirmatn',
    url: 'https://github.com/rastikerdar/vazirmatn',
    license: 'OFL 1.1',
    copyright: 'Copyright 2015 The Vazirmatn Project Authors',
  },
  {
    name: 'Noto Sans Hebrew, Noto Sans Devanagari',
    url: 'https://notofonts.github.io',
    license: 'OFL 1.1',
    copyright: 'Copyright 2022-2024 The Noto Project Authors',
  },
]

// Copyright lines stay in English: they are legal text.
const data: {
  name: string
  url: string
  license: string
  licenseUrl: string
  copyright: Key
  use: Key
}[] = [
  {
    name: 'FrequencyWords',
    url: 'https://github.com/hermitdave/FrequencyWords',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    copyright: 'credits.freqBy',
    use: 'credits.freqUse',
  },
  {
    name: 'Lemmatization Lists',
    url: 'https://github.com/michmech/lemmatization-lists',
    license: 'ODbL 1.0',
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    copyright: 'credits.lemmaBy',
    use: 'credits.lemmaUse',
  },
]
</script>

<template>
  <div class="max-w-2xl space-y-8">
    <h1 class="text-2xl font-semibold">{{ t('nav.credits') }}</h1>
    <p class="text-sm text-neutral-400">{{ t('credits.intro') }}</p>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('credits.software') }}</h2>
      <div v-for="item in software" :key="item.name" class="rounded bg-panel p-3 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <a :href="item.url" target="_blank" class="font-medium hover:underline">{{
            item.name
          }}</a>
          <span class="text-xs text-neutral-400">{{
            t('credits.license', { license: item.license })
          }}</span>
        </div>
        <div class="text-neutral-400">{{ item.copyright }}</div>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('credits.data') }}</h2>
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
        <div class="text-neutral-400">{{ t(item.copyright) }}</div>
        <div class="text-neutral-300">{{ t(item.use) }}</div>
      </div>
    </section>
  </div>
</template>
