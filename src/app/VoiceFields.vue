<script setup lang="ts">
import { computed, ref } from 'vue'
import { T, t, type Key } from '@/shared/i18n'
import { send } from '@/shared/messages'
import { play, speaking, stop } from '@/shared/speech'
import type { Voice } from '@/shared/types'
import SecretInput from './SecretInput.vue'
import { INPUT as input, LABEL as label, saveNow, useSettings } from './settings'
import { VOCAB_SAMPLES } from './vocab-samples'

const { settings } = useSettings()

// Cost, limits and privacy of each voice. `warn` items are shown in a warning color.
const NOTES: Record<Voice, { text: Key; warn?: boolean }[]> = {
  browser: [
    { text: 'voice.browserFree' },
    { text: 'voice.browserDownload' },
    { text: 'voice.browserGoogle', warn: true },
  ],
  openai: [
    { text: 'voice.openaiCost' },
    { text: 'voice.cache' },
    { text: 'voice.openaiAccent' },
    { text: 'voice.openaiEnd', warn: true },
    { text: 'ai.openaiTrain' },
  ],
  gemini: [
    { text: 'voice.geminiCost' },
    { text: 'voice.cache' },
    { text: 'voice.geminiLangs' },
    { text: 'voice.geminiTrain', warn: true },
    { text: 'ai.geminiEu', warn: true },
  ],
  local: [{ text: 'voice.localFree' }, { text: 'voice.localLangs' }],
}

// Local servers with an OpenAI-compatible speech API, with settings that work.
const SERVERS = [
  {
    name: 'Kokoro-FastAPI',
    langs: 'voice.kokoroLangs',
    baseUrl: 'http://localhost:8880/v1',
    model: 'kokoro',
    voice: 'af_heart',
  },
  {
    name: 'voice.speaches',
    langs: 'voice.piperLangs',
    baseUrl: 'http://localhost:8000/v1',
    model: 'speaches-ai/piper-de_DE-thorsten-medium',
    voice: 'thorsten',
  },
] as const
function useServer(s: (typeof SERVERS)[number]) {
  settings.value.voiceBaseUrl = s.baseUrl
  settings.value.voiceModel = s.model
  settings.value.voiceName = s.voice
}

// Plays the first sentence of the vocabulary sample, in the study language. A click while it
// loads or plays stops it.
const sample = computed(() => {
  const lang = settings.value.studyLang
  return { lang, text: (VOCAB_SAMPLES[lang] ?? 'LingoMingo').split(/(?<=[.!?。])\s*/)[0]! }
})
const loading = ref(false)
const testOn = computed(
  () => loading.value || speaking.value === `${sample.value.lang}:${sample.value.text}`,
)
const testError = ref('')
// A newer click makes an older test stop before it plays.
let run = 0
async function testVoice() {
  const mine = ++run
  if (testOn.value) {
    loading.value = false
    return stop()
  }
  const { lang, text } = sample.value
  loading.value = true
  testError.value = ''
  try {
    await saveNow()
    // Ask first, so an error shows here. play() then gets the audio from the cache.
    await send({ type: 'speak', text, lang })
  } catch (e) {
    testError.value = t('voice.testError', { error: e instanceof Error ? e.message : String(e) })
  }
  if (mine !== run) return
  loading.value = false
  await play(text, lang)
}
// Lucide "play" and "square".
const playIcon =
  'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z'
const stopIcon = 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'

const example = 'ms-1 font-mono text-neutral-400 underline hover:text-fg'
const code = 'font-mono break-all text-neutral-300'
const link = 'underline hover:text-fg'
// The server name of a row, as the user sees it.
const serverName = (name: string) => (name.startsWith('voice.') ? t(name as Key) : name)
</script>

<template>
  <div class="space-y-4">
    <div>
      <label :class="label" for="voice">{{ t('settings.voice') }}</label>
      <select id="voice" v-model="settings.voice" :class="input">
        <option value="browser">{{ t('voice.optBrowser') }}</option>
        <option value="openai">OpenAI</option>
        <option value="gemini">{{ t('voice.optGemini') }}</option>
        <option value="local">{{ t('voice.optLocal') }}</option>
      </select>
    </div>

    <template v-if="settings.voice === 'openai'">
      <div>
        <label :class="label" for="vokey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="vokey" v-model="settings.openaiKey" placeholder="sk-..." />
        <p class="mt-1 text-xs text-neutral-500">
          <T k="voice.openaiKeyHint">
            <template #link>
              <a href="https://platform.openai.com/api-keys" target="_blank" :class="link"
                >platform.openai.com</a
              >
            </template>
          </T>
        </p>
      </div>
      <div>
        <label :class="label" for="vomodel">{{ t('ai.model') }}</label>
        <input id="vomodel" v-model="settings.openaiVoiceModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.openaiVoiceModel = m"
          >
            {{ m }}
          </button>
          — {{ t('voice.openaiModelTip') }}
        </p>
      </div>
      <div>
        <label :class="label" for="vovoice">{{ t('voice.name') }}</label>
        <input id="vovoice" v-model="settings.openaiVoice" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="v in ['marin', 'cedar', 'coral', 'nova', 'onyx']"
            :key="v"
            type="button"
            :class="example"
            @click="settings.openaiVoice = v"
          >
            {{ v }}
          </button>
          —
          <T k="voice.openaiVoiceTip">
            <template #link>
              <a href="https://www.openai.fm" target="_blank" :class="link">openai.fm</a>
            </template>
          </T>
        </p>
      </div>
    </template>

    <template v-else-if="settings.voice === 'gemini'">
      <div>
        <label :class="label" for="vgkey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="vgkey" v-model="settings.geminiKey" placeholder="AQ... / AIza..." />
        <p class="mt-1 text-xs text-neutral-500">
          <T k="voice.geminiKeyHint">
            <template #link>
              <a href="https://aistudio.google.com/api-keys" target="_blank" :class="link"
                >Google AI Studio</a
              >
            </template>
          </T>
        </p>
      </div>
      <div>
        <label :class="label" for="vgmodel">{{ t('ai.model') }}</label>
        <input id="vgmodel" v-model="settings.geminiVoiceModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.geminiVoiceModel = m"
          >
            {{ m }}
          </button>
          — {{ t('voice.geminiModelTip') }}
        </p>
      </div>
      <div>
        <label :class="label" for="vgvoice">{{ t('voice.name') }}</label>
        <input id="vgvoice" v-model="settings.geminiVoice" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="v in ['Kore', 'Puck', 'Charon', 'Aoede', 'Iapetus', 'Sulafat']"
            :key="v"
            type="button"
            :class="example"
            @click="settings.geminiVoice = v"
          >
            {{ v }}
          </button>
          —
          <T k="voice.geminiVoiceTip">
            <template #link>
              <a href="https://aistudio.google.com/generate-speech" target="_blank" :class="link"
                >Google AI Studio</a
              >
            </template>
          </T>
        </p>
      </div>
    </template>

    <template v-else-if="settings.voice === 'local'">
      <div>
        <label :class="label" for="vbase">{{ t('ai.baseUrlCompat') }}</label>
        <input id="vbase" v-model="settings.voiceBaseUrl" :class="input" />
      </div>
      <div>
        <label :class="label" for="vmodel">{{ t('ai.modelName') }}</label>
        <input id="vmodel" v-model="settings.voiceModel" :class="input" placeholder="kokoro" />
      </div>
      <div>
        <label :class="label" for="vname">{{ t('voice.name') }}</label>
        <input id="vname" v-model="settings.voiceName" :class="input" placeholder="af_heart" />
      </div>
      <div class="space-y-1 text-xs text-neutral-500">
        <p v-for="s in SERVERS" :key="s.name">
          <button
            type="button"
            class="font-mono text-neutral-400 underline hover:text-fg"
            @click="useServer(s)"
          >
            {{ serverName(s.name) }}
          </button>
          — {{ t(s.langs) }}
        </p>
      </div>
      <div class="rounded border border-fg/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">{{ t('voice.kokoroSetup') }}</p>
        <ol class="mt-2 list-decimal space-y-1 ps-4">
          <li>
            <T k="voice.kokoroStep1">
              <template #link>
                <a
                  href="https://www.docker.com/products/docker-desktop/"
                  target="_blank"
                  :class="link"
                  >Docker Desktop</a
                >
              </template>
            </T>
          </li>
          <li>
            <T k="voice.startServer">
              <template #cmd>
                <code :class="code"
                  >docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest</code
                >
              </template>
            </T>
          </li>
          <li>
            <T k="voice.kokoroStep3">
              <template #name><span class="text-neutral-300">Kokoro-FastAPI</span></template>
              <template v-for="c in ['a', 'b', 'e', 'f', 'i', 'p', 'j', 'z']" :key="c" #[c]>
                <code :class="code">{{ c }}</code>
              </template>
              <template #link>
                <a
                  href="https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md"
                  target="_blank"
                  :class="link"
                  >Hugging Face</a
                >
              </template>
            </T>
          </li>
        </ol>
        <p class="mt-2 text-neutral-500">
          <T k="voice.kokoroGpu">
            <template #image>
              <code :class="code">ghcr.io/remsky/kokoro-fastapi-gpu:latest</code>
            </template>
            <template #flag><code :class="code">--gpus all</code></template>
            <template #link>
              <a href="https://github.com/remsky/Kokoro-FastAPI" target="_blank" :class="link">{{
                t('voice.kokoroGuide')
              }}</a>
            </template>
          </T>
        </p>
      </div>
      <div class="rounded border border-fg/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">{{ t('voice.piperSetup') }}</p>
        <ol class="mt-2 list-decimal space-y-1 ps-4">
          <li>
            <T k="voice.startServer">
              <template #cmd>
                <code :class="code"
                  >docker run --detach -p 8000:8000 -v
                  hf-hub-cache:/home/ubuntu/.cache/huggingface/hub
                  ghcr.io/speaches-ai/speaches:latest-cpu</code
                >
              </template>
            </T>
          </li>
          <li>
            <T k="voice.piperStep2">
              <template #cmd>
                <code :class="code"
                  >curl -X POST
                  http://localhost:8000/v1/models/speaches-ai/piper-de_DE-thorsten-medium</code
                >
              </template>
            </T>
          </li>
          <li>
            <T k="voice.piperStep3">
              <template #name>
                <span class="text-neutral-300">{{ t('voice.speaches') }}</span>
              </template>
              <template #link>
                <a
                  href="https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md"
                  target="_blank"
                  :class="link"
                  >{{ t('voice.piperList') }}</a
                >
              </template>
              <template #prefix><code :class="code">speaches-ai/piper-</code></template>
              <template #model><code :class="code">de_DE-thorsten-medium</code></template>
              <template #voice><code :class="code">thorsten</code></template>
            </T>
          </li>
        </ol>
        <p class="mt-2 text-neutral-500">
          <T k="voice.moreIn">
            <template #link>
              <a
                href="https://github.com/speaches-ai/speaches/blob/master/docs/usage/text-to-speech.md"
                target="_blank"
                :class="link"
                >{{ t('voice.speachesGuide') }}</a
              >
            </template>
          </T>
        </p>
      </div>
    </template>

    <ul class="list-disc space-y-1 rounded border border-fg/10 p-3 ps-7 text-xs text-neutral-400">
      <li
        v-for="n in NOTES[settings.voice]"
        :key="n.text"
        :class="n.warn ? 'text-yellow-300' : undefined"
      >
        {{ t(n.text) }}
      </li>
    </ul>

    <p
      v-if="settings.voice === 'openai' || settings.voice === 'gemini'"
      class="text-xs text-neutral-500"
    >
      {{ t('voice.privacy') }}
    </p>

    <div class="flex items-center gap-3">
      <!-- Hover only when it does not play, so it does not hide the playing color. -->
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
        :class="
          testOn ? 'border-accent/40 bg-accent/15 text-accent' : 'border-fg/20 hover:bg-fg/10'
        "
        @click="testVoice"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ 'animate-pulse': loading }"
        >
          <path :d="testOn ? stopIcon : playIcon" />
        </svg>
        <!-- Both labels share one cell, so the button keeps its width. -->
        <span class="grid text-start">
          <span class="col-start-1 row-start-1" :class="{ invisible: testOn }">{{
            t('voice.test')
          }}</span>
          <span class="col-start-1 row-start-1" :class="{ invisible: !testOn }">{{
            t('common.stop')
          }}</span>
        </span>
      </button>
      <p v-if="testError" class="text-xs text-red-300">{{ testError }}</p>
    </div>
  </div>
</template>
