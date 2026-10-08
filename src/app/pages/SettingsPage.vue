<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getSettings, onStorageKey, patchSettings } from '@/shared/storage'
import { DEFAULT_SETTINGS, LANGUAGES, type Settings } from '@/shared/types'
import { LEVEL_LANGS } from '@/shared/vocab'
import VocabLevelDialog from '../VocabLevelDialog.vue'

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const savedAt = ref(false)

// Last value known to be in storage. Other pages (the video overlay) can change settings too,
// so we reload on change, and save only real edits made on this page.
let stored = ''
async function refresh() {
  const value = await getSettings()
  stored = JSON.stringify(value)
  settings.value = value
}
let stop = () => {}
onMounted(async () => {
  await refresh()
  stop = onStorageKey('settings', refresh)
})
onBeforeUnmount(() => stop())

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  settings,
  (value) => {
    const json = JSON.stringify(value)
    if (json === stored) return
    stored = json
    clearTimeout(timer)
    timer = setTimeout(async () => {
      await patchSettings({ ...value })
      savedAt.value = true
      setTimeout(() => (savedAt.value = false), 1200)
    }, 300)
  },
  { deep: true },
)

const levelOpen = ref(false)
const level = computed(() => settings.value.vocabLevels[settings.value.studyLang])
function setLevel(value: number | undefined) {
  const levels = { ...settings.value.vocabLevels }
  if (value === undefined) delete levels[settings.value.studyLang]
  else levels[settings.value.studyLang] = value
  settings.value.vocabLevels = levels
  levelOpen.value = false
}

const input =
  'w-full rounded border border-white/10 bg-surface-deep px-3 py-2 text-sm text-white outline-none focus:border-accent'
const label = 'mb-1 block text-xs font-medium tracking-wide text-neutral-400 uppercase'
</script>

<template>
  <div class="max-w-xl space-y-8">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-semibold">Settings</h1>
      <span v-if="savedAt" class="text-sm text-emerald-400">Saved</span>
    </div>

    <section class="space-y-4">
      <h2 class="text-lg font-medium">Languages</h2>
      <div>
        <label :class="label" for="study">Study language</label>
        <select id="study" v-model="settings.studyLang" :class="input">
          <option v-for="(name, code) in LANGUAGES" :key="code" :value="code">{{ name }}</option>
        </select>
      </div>
      <div>
        <label :class="label" for="native">Translation language</label>
        <select id="native" v-model="settings.nativeLang" :class="input">
          <option v-for="(name, code) in LANGUAGES" :key="code" :value="code">{{ name }}</option>
        </select>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-medium">Subtitles</h2>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="settings.autoPause" type="checkbox" class="accent-accent" />
        Auto-pause after each subtitle
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="settings.hideTranslation" type="checkbox" class="accent-accent" />
        Hide translation line
      </label>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-medium">Vocabulary highlighting</h2>
      <div v-if="LEVEL_LANGS.includes(settings.studyLang)" class="flex items-center gap-3">
        <button
          type="button"
          class="rounded border border-white/30 px-4 py-2 text-sm font-medium tracking-wide uppercase hover:bg-white/10"
          @click="levelOpen = true"
        >
          Set vocabulary level
        </button>
        <span class="text-sm text-neutral-400">
          {{ level === undefined ? 'Not set' : `You know the ${level} most common words` }}
        </span>
        <button
          v-if="level !== undefined"
          type="button"
          class="text-sm text-neutral-400 underline hover:text-white"
          @click="setLevel(undefined)"
        >
          Turn off
        </button>
      </div>
      <p v-else class="text-sm text-neutral-400">
        Vocabulary level is not available for {{ LANGUAGES[settings.studyLang] }} yet.
      </p>
      <label class="flex items-center gap-2 text-sm text-emerald-300">
        <input v-model="settings.showKnownGreen" type="checkbox" class="accent-accent" />
        Show known words in green
      </label>
      <label class="flex items-center gap-2 text-sm text-orange-200">
        <input v-model="settings.showSuggested" type="checkbox" class="accent-accent" />
        Show suggested words in orange color
      </label>
      <label class="flex items-center gap-2 text-sm text-white/45">
        <input v-model="settings.darkenRare" type="checkbox" class="accent-accent" />
        Darken rare words (recommended)
      </label>
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
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-medium">AI translation</h2>
      <p class="text-sm text-neutral-400">
        Used when YouTube has no human-made subtitles in your translation language, and for the word
        popup. Auto-generated YouTube subtitles are never used.
      </p>
      <div>
        <label :class="label" for="provider">Provider</label>
        <select id="provider" v-model="settings.provider" :class="input">
          <option value="claude">Claude API</option>
          <option value="deepseek">DeepSeek API</option>
          <option value="local">Local model (Ollama, llama.cpp, LM Studio)</option>
        </select>
      </div>

      <template v-if="settings.provider === 'claude'">
        <div>
          <label :class="label" for="key">API key</label>
          <input
            id="key"
            v-model="settings.claudeKey"
            type="password"
            :class="input"
            placeholder="sk-ant-..."
          />
          <p class="mt-1 text-xs text-neutral-500">Stored only in this browser.</p>
        </div>
        <div>
          <label :class="label" for="cmodel">Model</label>
          <input id="cmodel" v-model="settings.claudeModel" :class="input" />
          <p class="mt-1 text-xs text-neutral-500">
            Examples:
            <button
              v-for="m in ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5']"
              :key="m"
              type="button"
              class="ml-1 font-mono text-neutral-400 underline hover:text-white"
              @click="settings.claudeModel = m"
            >
              {{ m }}
            </button>
            — Haiku is the cheapest and fastest.
          </p>
        </div>
      </template>

      <template v-else-if="settings.provider === 'deepseek'">
        <div>
          <label :class="label" for="dkey">API key</label>
          <input
            id="dkey"
            v-model="settings.deepseekKey"
            type="password"
            :class="input"
            placeholder="sk-..."
          />
          <p class="mt-1 text-xs text-neutral-500">Stored only in this browser.</p>
        </div>
        <div>
          <label :class="label" for="dmodel">Model</label>
          <input id="dmodel" v-model="settings.deepseekModel" :class="input" />
          <p class="mt-1 text-xs text-neutral-500">
            Examples:
            <button
              v-for="m in ['deepseek-flash', 'deepseek-v4-pro']"
              :key="m"
              type="button"
              class="ml-1 font-mono text-neutral-400 underline hover:text-white"
              @click="settings.deepseekModel = m"
            >
              {{ m }}
            </button>
            — Flash is the cheapest and fastest.
          </p>
        </div>
      </template>

      <template v-else>
        <div>
          <label :class="label" for="base">Base URL (OpenAI-compatible)</label>
          <input id="base" v-model="settings.localBaseUrl" :class="input" />
          <p class="mt-1 text-xs text-neutral-500">
            Ollama: http://localhost:11434/v1 — start it with OLLAMA_ORIGINS="chrome-extension://*".
            llama.cpp server: http://localhost:8080/v1
          </p>
        </div>
        <div>
          <label :class="label" for="lmodel">Model name</label>
          <input
            id="lmodel"
            v-model="settings.localModel"
            :class="input"
            placeholder="llama3.1:8b"
          />
        </div>
      </template>
    </section>
  </div>
</template>
