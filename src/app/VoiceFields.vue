<script setup lang="ts">
import { computed, ref } from 'vue'
import { send } from '@/shared/messages'
import { play, speaking, stop } from '@/shared/speech'
import type { Voice } from '@/shared/types'
import SecretInput from './SecretInput.vue'
import { INPUT as input, LABEL as label, saveNow, useSettings } from './settings'
import { VOCAB_SAMPLES } from './vocab-samples'

const { settings } = useSettings()

// Cost, limits and privacy of each voice. `warn` items are shown in a warning color.
const CACHE = 'Audio is saved for 30 days: a replay sends no new request.'
const NOTES: Record<Voice, { text: string; warn?: boolean }[]> = {
  browser: [
    { text: 'Free. Quality depends on the language and on the voices of your computer.' },
    {
      text: 'For better voices, download them: on macOS, open System Settings > Accessibility > Read & Speak (or Spoken Content), and add a voice next to "System voice". "Premium" and "Enhanced" voices sound best. On Windows 11, open Settings > Time & language > Speech > Manage voices > Add voices.',
    },
    {
      text: 'Without a downloaded voice, LingoMingo uses Chrome\'s online "Google ..." voice for your language. It sends the text to Google.',
      warn: true,
    },
  ],
  auto: [
    {
      text: 'Uses OpenAI or Gemini when you added a key for one of them, with your AI translation provider first. Without a key, it uses the browser voice.',
    },
  ],
  openai: [
    { text: 'Paid: you pay for each new text. There is no free tier.' },
    { text: CACHE },
    { text: 'OpenAI voices are made for English. Other languages can have an English accent.' },
    {
      text: 'OpenAI shuts down these voice models on January 6, 2027. After that, use Gemini or a local server.',
      warn: true,
    },
    { text: 'OpenAI does not train its models on API data, unless you allow it.' },
  ],
  gemini: [
    {
      text: 'Free tier: no cost, but with daily limits. Google shows your limits in Google AI Studio. Paid tier: Flash-Lite costs about 0.15 cent for 10 seconds of speech in 2026, and double from 2027.',
    },
    { text: CACHE },
    { text: 'Speaks over 100 languages. Flash TTS speaks over 130.' },
    {
      text: 'On the free tier, Google uses your requests to improve its products, and people at Google can read them. To stop this, turn on billing in Google AI Studio.',
      warn: true,
    },
    {
      text: 'In the EU (EEA), Switzerland and the UK, the Google terms allow only the paid tier.',
      warn: true,
    },
  ],
  local: [
    { text: 'Free and private: the text stays on your computer.' },
    { text: 'Many local models speak only a few languages. Use one for your study language.' },
  ],
}

// Local servers with an OpenAI-compatible speech API, with settings that work.
const SERVERS = [
  {
    name: 'Kokoro-FastAPI',
    langs:
      'English, Spanish, French, Italian, Portuguese, Hindi, Japanese, Chinese. No German or Persian.',
    baseUrl: 'http://localhost:8880/v1',
    model: 'kokoro',
    voice: 'af_heart',
  },
  {
    name: 'Speaches with Piper',
    langs: 'About 45 languages, also German, Dutch, Persian, Polish, Russian and Turkish.',
    baseUrl: 'http://localhost:8000/v1',
    model: 'speaches-ai/piper-de_DE-thorsten-medium',
    voice: 'thorsten',
  },
]
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
    testError.value = `${e instanceof Error ? e.message : String(e)} The browser voice plays instead.`
  }
  if (mine !== run) return
  loading.value = false
  await play(text, lang)
}
// Lucide "play" and "square".
const playIcon =
  'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z'
const stopIcon = 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'

const example = 'ml-1 font-mono text-neutral-400 underline hover:text-white'
const code = 'font-mono break-all text-neutral-300'
</script>

<template>
  <div class="space-y-4">
    <div>
      <label :class="label" for="voice">Voice</label>
      <select id="voice" v-model="settings.voice" :class="input">
        <option value="browser">Browser voice (free)</option>
        <option value="auto">Auto</option>
        <option value="openai">OpenAI</option>
        <option value="gemini">Google Gemini (free tier)</option>
        <option value="local">Local speech server</option>
      </select>
    </div>

    <template v-if="settings.voice === 'openai'">
      <div>
        <label :class="label" for="vokey">API key</label>
        <SecretInput id="vokey" v-model="settings.openaiKey" placeholder="sk-..." />
        <p class="mt-1 text-xs text-neutral-500">
          Stored only in this browser. The same key as for AI translation with OpenAI. Get a key on
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            class="underline hover:text-white"
            >platform.openai.com</a
          >.
        </p>
      </div>
      <div>
        <label :class="label" for="vomodel">Model</label>
        <input id="vomodel" v-model="settings.openaiVoiceModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.openaiVoiceModel = m"
          >
            {{ m }}
          </button>
          — gpt-4o-mini-tts sounds the most natural.
        </p>
      </div>
      <div>
        <label :class="label" for="vovoice">Voice name</label>
        <input id="vovoice" v-model="settings.openaiVoice" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="v in ['marin', 'cedar', 'coral', 'nova', 'onyx']"
            :key="v"
            type="button"
            :class="example"
            @click="settings.openaiVoice = v"
          >
            {{ v }}
          </button>
          — marin and cedar have the best quality, but only with gpt-4o-mini-tts. Hear all voices on
          <a href="https://www.openai.fm" target="_blank" class="underline hover:text-white"
            >openai.fm</a
          >.
        </p>
      </div>
    </template>

    <template v-else-if="settings.voice === 'gemini'">
      <div>
        <label :class="label" for="vgkey">API key</label>
        <SecretInput id="vgkey" v-model="settings.geminiKey" placeholder="AQ... or AIza..." />
        <p class="mt-1 text-xs text-neutral-500">
          Stored only in this browser. The same key as for AI translation with Gemini. Get a free
          key in
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            class="underline hover:text-white"
            >Google AI Studio</a
          >.
        </p>
      </div>
      <div>
        <label :class="label" for="vgmodel">Model</label>
        <input id="vgmodel" v-model="settings.geminiVoiceModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.geminiVoiceModel = m"
          >
            {{ m }}
          </button>
          — Flash-Lite is the cheapest and fastest. Flash speaks more languages.
        </p>
      </div>
      <div>
        <label :class="label" for="vgvoice">Voice name</label>
        <input id="vgvoice" v-model="settings.geminiVoice" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="v in ['Kore', 'Puck', 'Charon', 'Aoede', 'Iapetus', 'Sulafat']"
            :key="v"
            type="button"
            :class="example"
            @click="settings.geminiVoice = v"
          >
            {{ v }}
          </button>
          — Hear all voices in
          <a
            href="https://aistudio.google.com/generate-speech"
            target="_blank"
            class="underline hover:text-white"
            >Google AI Studio</a
          >.
        </p>
      </div>
    </template>

    <template v-else-if="settings.voice === 'local'">
      <div>
        <label :class="label" for="vbase">Base URL (OpenAI-compatible)</label>
        <input id="vbase" v-model="settings.voiceBaseUrl" :class="input" />
      </div>
      <div>
        <label :class="label" for="vmodel">Model name</label>
        <input id="vmodel" v-model="settings.voiceModel" :class="input" placeholder="kokoro" />
      </div>
      <div>
        <label :class="label" for="vname">Voice name</label>
        <input id="vname" v-model="settings.voiceName" :class="input" placeholder="af_heart" />
      </div>
      <div class="space-y-1 text-xs text-neutral-500">
        <p v-for="s in SERVERS" :key="s.name">
          <button
            type="button"
            class="font-mono text-neutral-400 underline hover:text-white"
            @click="useServer(s)"
          >
            {{ s.name }}
          </button>
          — {{ s.langs }}
        </p>
      </div>
      <div class="rounded border border-white/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">Set up Kokoro-FastAPI</p>
        <ol class="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Install
            <a
              href="https://www.docker.com/products/docker-desktop/"
              target="_blank"
              class="underline hover:text-white"
              >Docker Desktop</a
            >.
          </li>
          <li>
            Start the server:
            <code :class="code"
              >docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest</code
            >
          </li>
          <li>
            Click <span class="text-neutral-300">Kokoro-FastAPI</span> above. Voice names start with
            the language: <code :class="code">a</code>/<code :class="code">b</code> English,
            <code :class="code">e</code> Spanish, <code :class="code">f</code> French,
            <code :class="code">i</code> Italian, <code :class="code">p</code> Portuguese,
            <code :class="code">j</code> Japanese, <code :class="code">z</code> Chinese. See all
            voices on
            <a
              href="https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md"
              target="_blank"
              class="underline hover:text-white"
              >Hugging Face</a
            >.
          </li>
        </ol>
        <p class="mt-2 text-neutral-500">
          With an NVIDIA GPU:
          <code :class="code">ghcr.io/remsky/kokoro-fastapi-gpu:latest</code> with
          <code :class="code">--gpus all</code>. More in the
          <a
            href="https://github.com/remsky/Kokoro-FastAPI"
            target="_blank"
            class="underline hover:text-white"
            >Kokoro-FastAPI guide</a
          >.
        </p>
      </div>
      <div class="rounded border border-white/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">Set up Speaches with Piper (German and more)</p>
        <ol class="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Start the server:
            <code :class="code"
              >docker run --detach -p 8000:8000 -v hf-hub-cache:/home/ubuntu/.cache/huggingface/hub
              ghcr.io/speaches-ai/speaches:latest-cpu</code
            >
          </li>
          <li>
            Download a voice:
            <code :class="code"
              >curl -X POST
              http://localhost:8000/v1/models/speaches-ai/piper-de_DE-thorsten-medium</code
            >
          </li>
          <li>
            Click <span class="text-neutral-300">Speaches with Piper</span> above. For another
            language, find a voice on the
            <a
              href="https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md"
              target="_blank"
              class="underline hover:text-white"
              >Piper voice list</a
            >, and download it as in step 2. The model name is
            <code :class="code">speaches-ai/piper-</code> + the voice, like
            <code :class="code">de_DE-thorsten-medium</code>. The voice name is its middle part,
            like <code :class="code">thorsten</code>.
          </li>
        </ol>
        <p class="mt-2 text-neutral-500">
          More in the
          <a
            href="https://github.com/speaches-ai/speaches/blob/master/docs/usage/text-to-speech.md"
            target="_blank"
            class="underline hover:text-white"
            >Speaches guide</a
          >.
        </p>
      </div>
    </template>

    <ul
      class="list-disc space-y-1 rounded border border-white/10 p-3 pl-7 text-xs text-neutral-400"
    >
      <li
        v-for="n in NOTES[settings.voice]"
        :key="n.text"
        :class="n.warn ? 'text-yellow-300' : undefined"
      >
        {{ n.text }}
      </li>
    </ul>

    <p
      v-if="settings.voice === 'openai' || settings.voice === 'gemini'"
      class="text-xs text-neutral-500"
    >
      LingoMingo sends the words and sentences that you play to this provider. The voice is made by
      AI. The privacy policy of the provider applies.
    </p>

    <div class="flex items-center gap-3">
      <!-- Hover only when it does not play, so it does not hide the playing color. -->
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
        :class="
          testOn ? 'border-accent/40 bg-accent/15 text-accent' : 'border-white/20 hover:bg-white/10'
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
          <span class="col-start-1 row-start-1" :class="{ invisible: testOn }">Test voice</span>
          <span class="col-start-1 row-start-1" :class="{ invisible: !testOn }">Stop</span>
        </span>
      </button>
      <p v-if="testError" class="text-xs text-red-300">{{ testError }}</p>
    </div>
  </div>
</template>
