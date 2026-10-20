<script setup lang="ts">
import { computed } from 'vue'
import { langLabel, nativeName, resolveUiLang, sortedLangs, t } from '@/shared/i18n'
import { LANGUAGES } from '@/shared/types'
import { INPUT, LABEL, useSettings } from './settings'

const { settings } = useSettings()

// Interface languages by their own name, so each user finds theirs in any interface language.
const uiLangs = Object.keys(LANGUAGES).sort((a, b) => nativeName(a).localeCompare(nativeName(b)))
const langs = computed(() => sortedLangs())
</script>

<template>
  <!-- The interface language has its own row: it is about LingoMingo, the other two about
       learning. -->
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <label :class="LABEL" for="ui-lang">{{ t('lang.interface') }}</label>
      <select id="ui-lang" v-model="settings.uiLang" :class="INPUT">
        <option value="">{{ t('lang.browser', { name: nativeName(resolveUiLang('')) }) }}</option>
        <option v-for="code in uiLangs" :key="code" :value="code" :lang="code">
          {{ nativeName(code) }}
        </option>
      </select>
    </div>
    <div class="hidden sm:block" />
    <div>
      <label :class="LABEL" for="study">{{ t('lang.study') }}</label>
      <select id="study" v-model="settings.studyLang" :class="INPUT">
        <option v-for="code in langs" :key="code" :value="code">{{ langLabel(code) }}</option>
      </select>
    </div>
    <div>
      <label :class="LABEL" for="native">{{ t('lang.translation') }}</label>
      <select id="native" v-model="settings.nativeLang" :class="INPUT">
        <option v-for="code in langs" :key="code" :value="code">{{ langLabel(code) }}</option>
      </select>
    </div>
  </div>
</template>
