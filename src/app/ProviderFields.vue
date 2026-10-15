<script setup lang="ts">
import { computed, ref } from 'vue'
import { send } from '@/shared/messages'
import type { Provider } from '@/shared/types'
import SecretInput from './SecretInput.vue'
import { INPUT as input, LABEL as label, saveNow, useSettings } from './settings'
import { VOCAB_SAMPLES } from './vocab-samples'

const { settings } = useSettings()

// Translates the first sentence of the vocabulary sample, from the study language to the
// translation language. Without a sample for the study language, an English one.
const sample = computed(() => {
  const lang = VOCAB_SAMPLES[settings.value.studyLang] ? settings.value.studyLang : 'en'
  return { lang, text: VOCAB_SAMPLES[lang]!.split(/(?<=[.!?。])\s*/)[0]! }
})
const testing = ref(false)
const testResult = ref<{ source: string; text: string } | null>(null)
const testError = ref('')
async function testTranslation() {
  const { lang, text } = sample.value
  testing.value = true
  // The box shows at once, with a skeleton for the translation.
  testResult.value = { source: text, text: '' }
  testError.value = ''
  try {
    await saveNow()
    const [line] = await send({
      type: 'translate-lines',
      lines: [text],
      studyLang: lang,
      nativeLang: settings.value.nativeLang,
    })
    testResult.value = { source: text, text: line ?? '' }
  } catch (e) {
    testResult.value = null
    testError.value = e instanceof Error ? e.message : String(e)
  } finally {
    testing.value = false
  }
}
// Lucide "languages".
const languagesIcon = [
  'm5 8 6 6',
  'm4 14 6-6 2-3',
  'M2 5h12',
  'M7 2h1',
  'm22 22-5-10-5 10',
  'M14 18h6',
]

// Cost, limits and privacy of each provider. `warn` items are shown in a warning color.
const PER_REQUEST =
  'One request translates about 40 subtitle lines. Each word that you open in the word popup is one more request.'
const NOTES: Partial<Record<Provider, { text: string; warn?: boolean }[]>> = {
  claude: [
    { text: 'Paid: you pay for each request. You can set a spend limit in the Anthropic Console.' },
    { text: 'Anthropic does not train its models on API data.' },
  ],
  openai: [
    { text: 'Paid: you pay for each request. You can set a budget in the OpenAI dashboard.' },
    { text: 'OpenAI does not train its models on API data, unless you allow it.' },
  ],
  grok: [
    { text: 'Paid: you pay for each request. You can set a spend limit in the xAI Console.' },
    {
      text: 'xAI does not train on API data without your permission. It keeps requests for 30 days.',
    },
  ],
  deepseek: [
    { text: 'Paid: you pay for each request. The price is low.' },
    { text: 'DeepSeek keeps your data on servers in China.', warn: true },
  ],
  gemini: [
    {
      text: 'Free tier: no cost, but with daily limits. Google shows your limits in Google AI Studio. When you get error 429, wait, or try again tomorrow.',
    },
    { text: PER_REQUEST },
    {
      text: 'On the free tier, Google uses your requests to improve its products, and people at Google can read them. To stop this, turn on billing in Google AI Studio. Then you pay for each request.',
      warn: true,
    },
    {
      text: 'In the EU (EEA), Switzerland and the UK, the Google terms allow only the paid tier.',
      warn: true,
    },
  ],
  openrouter: [
    {
      text: 'Free models (names that end in ":free") have no cost. Limits: 20 requests per minute and 50 per day. After you buy 10 USD of credit one time: 1000 per day. Other models are paid.',
    },
    { text: PER_REQUEST },
    {
      text: 'Free models can keep your requests and use them for training. You must allow this in your OpenRouter privacy settings, or free models do not work.',
      warn: true,
    },
    { text: 'Free models change often. If a model stops working, select a different model.' },
  ],
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label :class="label" for="provider">Provider</label>
      <select id="provider" v-model="settings.provider" :class="input">
        <option value="claude">Claude API</option>
        <option value="openai">OpenAI API (ChatGPT)</option>
        <option value="grok">xAI API (Grok)</option>
        <option value="deepseek">DeepSeek API</option>
        <option value="gemini">Google Gemini API (free tier)</option>
        <option value="openrouter">OpenRouter (free models)</option>
        <option value="ollama">Ollama (local)</option>
        <option value="lmstudio">LM Studio (local)</option>
        <option value="local">Other local server (llama.cpp, vLLM, ...)</option>
      </select>
    </div>

    <template v-if="settings.provider === 'claude'">
      <div>
        <label :class="label" for="key">API key</label>
        <SecretInput id="key" v-model="settings.claudeKey" placeholder="sk-ant-..." />
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

    <template v-else-if="settings.provider === 'openai'">
      <div>
        <label :class="label" for="okey">API key</label>
        <SecretInput id="okey" v-model="settings.openaiKey" placeholder="sk-..." />
        <p class="mt-1 text-xs text-neutral-500">Stored only in this browser.</p>
      </div>
      <div>
        <label :class="label" for="omodel">Model</label>
        <input id="omodel" v-model="settings.openaiModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['gpt-6-luna', 'gpt-6.1-sol']"
            :key="m"
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.openaiModel = m"
          >
            {{ m }}
          </button>
          — Luna is the cheapest and fastest.
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'grok'">
      <div>
        <label :class="label" for="gkey">API key</label>
        <SecretInput id="gkey" v-model="settings.grokKey" placeholder="xai-..." />
        <p class="mt-1 text-xs text-neutral-500">Stored only in this browser.</p>
      </div>
      <div>
        <label :class="label" for="gmodel">Model</label>
        <input id="gmodel" v-model="settings.grokModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['grok-4.3', 'grok-4.20-0309-non-reasoning', 'grok-4.7']"
            :key="m"
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.grokModel = m"
          >
            {{ m }}
          </button>
          — Non-reasoning is the fastest.
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'deepseek'">
      <div>
        <label :class="label" for="dkey">API key</label>
        <SecretInput id="dkey" v-model="settings.deepseekKey" placeholder="sk-..." />
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

    <template v-else-if="settings.provider === 'gemini'">
      <div>
        <label :class="label" for="gekey">API key</label>
        <SecretInput id="gekey" v-model="settings.geminiKey" placeholder="AQ... or AIza..." />
        <p class="mt-1 text-xs text-neutral-500">
          Stored only in this browser. Get a free key in
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            class="underline hover:text-white"
            >Google AI Studio</a
          >.
        </p>
      </div>
      <div>
        <label :class="label" for="gemodel">Model</label>
        <input id="gemodel" v-model="settings.geminiModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['gemini-3.5-flash-lite', 'gemini-3.5-flash']"
            :key="m"
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.geminiModel = m"
          >
            {{ m }}
          </button>
          — Flash-Lite is the fastest, and has the highest free limits.
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'openrouter'">
      <div>
        <label :class="label" for="orkey">API key</label>
        <SecretInput id="orkey" v-model="settings.openrouterKey" placeholder="sk-or-..." />
        <p class="mt-1 text-xs text-neutral-500">
          Stored only in this browser. Get a key on
          <a href="https://openrouter.ai/keys" target="_blank" class="underline hover:text-white"
            >openrouter.ai</a
          >.
        </p>
      </div>
      <div>
        <label :class="label" for="ormodel">Model</label>
        <input id="ormodel" v-model="settings.openrouterModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['google/gemma-4-31b-it:free', 'openrouter/free']"
            :key="m"
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.openrouterModel = m"
          >
            {{ m }}
          </button>
          — <span class="font-mono">openrouter/free</span> selects a free model at random. See all
          free models on
          <a
            href="https://openrouter.ai/models?max_price=0"
            target="_blank"
            class="underline hover:text-white"
            >openrouter.ai</a
          >.
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'ollama'">
      <div>
        <label :class="label" for="obase">Base URL</label>
        <input id="obase" v-model="settings.ollamaBaseUrl" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Default:
          <button
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.ollamaBaseUrl = 'http://localhost:11434/v1'"
          >
            http://localhost:11434/v1
          </button>
        </p>
      </div>
      <div>
        <label :class="label" for="olmodel">Model name</label>
        <input
          id="olmodel"
          v-model="settings.ollamaModel"
          :class="input"
          placeholder="translategemma:12b"
        />
        <div class="mt-1 space-y-1 text-xs text-neutral-500">
          <p
            v-for="m in [
              {
                name: 'translategemma:4b',
                badge: 'Fastest',
                why: 'Needs about 4 GB of memory. Very low delay, good for slow computers.',
              },
              {
                name: 'translategemma:12b',
                badge: 'Recommended',
                why: 'Needs about 8 GB of memory. Better with idioms and slang, and still fast.',
              },
              {
                name: 'gemma4:26b',
                badge: 'Best',
                why: 'Needs about 20 GB of memory. Highest quality, and still fast.',
              },
            ]"
            :key="m.name"
          >
            <button
              type="button"
              class="font-mono text-neutral-400 underline hover:text-white"
              @click="settings.ollamaModel = m.name"
            >
              {{ m.name }}
            </button>
            <span class="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-neutral-300">{{
              m.badge
            }}</span>
            — {{ m.why }}
          </p>
        </div>
      </div>
      <div class="rounded border border-white/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">Set up Ollama</p>
        <ol class="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Install Ollama from
            <a href="https://ollama.com/download" target="_blank" class="underline hover:text-white"
              >ollama.com</a
            >.
          </li>
          <li>
            Download a model:
            <code class="font-mono text-neutral-300">ollama pull translategemma:12b</code>
          </li>
          <li>
            Stop Ollama if it runs. Then start it, and allow the extension to connect:
            <code class="font-mono break-all text-neutral-300"
              >OLLAMA_ORIGINS="chrome-extension://*" ollama serve</code
            >
          </li>
          <li>Keep the terminal open while you use LingoMingo.</li>
        </ol>
        <p class="mt-2 text-neutral-500">
          Error 403 means that Ollama runs without <code class="font-mono">OLLAMA_ORIGINS</code>.
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'lmstudio'">
      <div>
        <label :class="label" for="lsbase">Base URL</label>
        <input id="lsbase" v-model="settings.lmstudioBaseUrl" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          Default:
          <button
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.lmstudioBaseUrl = 'http://localhost:1234/v1'"
          >
            http://localhost:1234/v1
          </button>
        </p>
      </div>
      <div>
        <label :class="label" for="lsmodel">Model name</label>
        <input
          id="lsmodel"
          v-model="settings.lmstudioModel"
          :class="input"
          placeholder="google/gemma-4-26b-a4b"
        />
        <p class="mt-1 text-xs text-neutral-500">
          Examples:
          <button
            v-for="m in ['google/gemma-4-26b-a4b', 'qwen/qwen3.6-35b-a3b']"
            :key="m"
            type="button"
            class="ml-1 font-mono text-neutral-400 underline hover:text-white"
            @click="settings.lmstudioModel = m"
          >
            {{ m }}
          </button>
          — Both are fast and good at translation.
        </p>
        <p class="mt-1 text-xs text-neutral-500">
          LingoMingo turns off thinking (needs LM Studio 0.4.8 or newer). Some models always think,
          for example DeepSeek R1: they are very slow for subtitles.
        </p>
      </div>
      <div class="rounded border border-white/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">Set up LM Studio</p>
        <ol class="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Install LM Studio from
            <a
              href="https://lmstudio.ai/download"
              target="_blank"
              class="underline hover:text-white"
              >lmstudio.ai</a
            >.
          </li>
          <li>
            Download a model in the Discover tab, or run
            <code class="font-mono text-neutral-300">lms get google/gemma-4-26b-a4b</code>
          </li>
          <li>
            Start the server in the Developer tab, or run
            <code class="font-mono text-neutral-300">lms server start</code>
          </li>
          <li>Use the model name that the Developer tab shows.</li>
        </ol>
        <p class="mt-2 text-neutral-500">
          If requests fail, turn on Enable CORS in the server settings.
        </p>
      </div>
    </template>

    <template v-else>
      <div>
        <label :class="label" for="base">Base URL (OpenAI-compatible)</label>
        <input id="base" v-model="settings.localBaseUrl" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          <span
            v-for="[name, url] in [
              ['llama.cpp', 'http://localhost:8080/v1'],
              ['vLLM', 'http://localhost:8000/v1'],
            ]"
            :key="url"
            class="mr-3 inline-block"
          >
            {{ name }}:
            <button
              type="button"
              class="font-mono text-neutral-400 underline hover:text-white"
              @click="settings.localBaseUrl = url"
            >
              {{ url }}
            </button>
          </span>
        </p>
      </div>
      <div>
        <label :class="label" for="lmodel">Model name</label>
        <input id="lmodel" v-model="settings.localModel" :class="input" placeholder="gemma4" />
        <p class="mt-1 text-xs text-neutral-500">The model name that your server uses.</p>
      </div>
      <div class="rounded border border-white/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">Set up llama.cpp</p>
        <ol class="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Install llama.cpp:
            <code class="font-mono text-neutral-300">brew install llama.cpp</code>, or get it from
            <a
              href="https://github.com/ggml-org/llama.cpp/releases"
              target="_blank"
              class="underline hover:text-white"
              >GitHub</a
            >.
          </li>
          <li>
            Start the server. It downloads the model the first time:
            <code class="font-mono break-all text-neutral-300"
              >llama-server -hf ggml-org/gemma-4-26B-A4B-it-GGUF:Q4_0 --alias gemma4 --port
              8080</code
            >
          </li>
          <li>Use the <code class="font-mono">--alias</code> value as the model name.</li>
        </ol>
        <p class="mt-2 text-neutral-500">
          Other servers work too, if they have an OpenAI-compatible API.
        </p>
      </div>
    </template>

    <ul
      v-if="NOTES[settings.provider]"
      class="list-disc space-y-1 rounded border border-white/10 p-3 pl-7 text-xs text-neutral-400"
    >
      <li
        v-for="n in NOTES[settings.provider]"
        :key="n.text"
        :class="n.warn ? 'text-yellow-300' : undefined"
      >
        {{ n.text }}
      </li>
    </ul>

    <p
      v-if="!['ollama', 'lmstudio', 'local'].includes(settings.provider)"
      class="text-xs text-neutral-500"
    >
      LingoMingo sends subtitle lines, and the words and sentences that you open in the word popup,
      to this provider. The privacy policy of the provider applies.
    </p>

    <div class="space-y-2">
      <button
        type="button"
        class="flex w-fit items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
        :class="
          testing
            ? 'border-accent/40 bg-accent/15 text-accent'
            : 'border-white/20 hover:bg-white/10'
        "
        :disabled="testing"
        @click="testTranslation"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ 'animate-pulse': testing }"
        >
          <path v-for="d in languagesIcon" :key="d" :d="d" />
        </svg>
        Test translation
      </button>
      <p v-if="testError" class="text-xs text-red-300">{{ testError }}</p>
      <div v-else-if="testResult" class="space-y-1 rounded border border-white/10 p-3 text-xs">
        <p class="text-neutral-500" dir="auto">{{ testResult.source }}</p>
        <p class="min-h-4 text-neutral-200" dir="auto">
          <span v-if="testing" class="inline-block h-3 w-2/3 animate-pulse rounded bg-white/10" />
          <template v-else>{{ testResult.text }}</template>
        </p>
      </div>
    </div>
  </div>
</template>
