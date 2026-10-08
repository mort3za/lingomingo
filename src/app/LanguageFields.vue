<script setup lang="ts">
import { LANGUAGES } from '@/shared/types'
import { INPUT, LABEL, useSettings } from './settings'

const { settings } = useSettings()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <label :class="LABEL" for="study">Study language</label>
      <select id="study" v-model="settings.studyLang" :class="INPUT">
        <option v-for="(name, code) in LANGUAGES" :key="code" :value="code">{{ name }}</option>
      </select>
    </div>
    <div>
      <label :class="LABEL" for="native">Translation language</label>
      <select id="native" v-model="settings.nativeLang" :class="INPUT">
        <option v-for="(name, code) in LANGUAGES" :key="code" :value="code">{{ name }}</option>
      </select>
    </div>
  </div>
</template>
