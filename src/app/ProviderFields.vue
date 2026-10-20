<script setup lang="ts">
import { computed, ref } from 'vue'
import { T, t, type Key } from '@/shared/i18n'
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
const NOTES: Partial<Record<Provider, { text: Key; warn?: boolean }[]>> = {
  claude: [{ text: 'ai.claudeCost' }, { text: 'ai.claudeTrain' }],
  openai: [{ text: 'ai.openaiCost' }, { text: 'ai.openaiTrain' }],
  grok: [{ text: 'ai.grokCost' }, { text: 'ai.grokTrain' }],
  deepseek: [{ text: 'ai.deepseekCost' }, { text: 'ai.deepseekChina', warn: true }],
  gemini: [
    { text: 'ai.geminiFree' },
    { text: 'ai.perRequest' },
    { text: 'ai.geminiTrain', warn: true },
    { text: 'ai.geminiEu', warn: true },
  ],
  openrouter: [
    { text: 'ai.openrouterFree' },
    { text: 'ai.perRequest' },
    { text: 'ai.openrouterTrain', warn: true },
    { text: 'ai.openrouterChange' },
  ],
}

const example = 'ms-1 font-mono text-neutral-400 underline hover:text-fg'
const code = 'font-mono text-neutral-300'
const link = 'underline hover:text-fg'
</script>

<template>
  <div class="space-y-4">
    <div>
      <label :class="label" for="provider">{{ t('ai.provider') }}</label>
      <select id="provider" v-model="settings.provider" :class="input">
        <option value="claude">Claude API</option>
        <option value="openai">OpenAI API (ChatGPT)</option>
        <option value="grok">xAI API (Grok)</option>
        <option value="deepseek">DeepSeek API</option>
        <option value="gemini">{{ t('ai.optGemini') }}</option>
        <option value="openrouter">{{ t('ai.optOpenrouter') }}</option>
        <option value="ollama">{{ t('ai.optOllama') }}</option>
        <option value="lmstudio">{{ t('ai.optLmstudio') }}</option>
        <option value="local">{{ t('ai.optLocal') }}</option>
      </select>
    </div>

    <template v-if="settings.provider === 'claude'">
      <div>
        <label :class="label" for="key">{{ t('ai.apiKey') }}</label>
        <SecretInput id="key" v-model="settings.claudeKey" placeholder="sk-ant-..." />
        <p class="mt-1 text-xs text-neutral-500">{{ t('ai.stored') }}</p>
      </div>
      <div>
        <label :class="label" for="cmodel">{{ t('ai.model') }}</label>
        <input id="cmodel" v-model="settings.claudeModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.claudeModel = m"
          >
            {{ m }}
          </button>
          — {{ t('ai.claudeTip') }}
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'openai'">
      <div>
        <label :class="label" for="okey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="okey" v-model="settings.openaiKey" placeholder="sk-..." />
        <p class="mt-1 text-xs text-neutral-500">{{ t('ai.stored') }}</p>
      </div>
      <div>
        <label :class="label" for="omodel">{{ t('ai.model') }}</label>
        <input id="omodel" v-model="settings.openaiModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['gpt-6-luna', 'gpt-6.1-sol']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.openaiModel = m"
          >
            {{ m }}
          </button>
          — {{ t('ai.openaiTip') }}
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'grok'">
      <div>
        <label :class="label" for="gkey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="gkey" v-model="settings.grokKey" placeholder="xai-..." />
        <p class="mt-1 text-xs text-neutral-500">{{ t('ai.stored') }}</p>
      </div>
      <div>
        <label :class="label" for="gmodel">{{ t('ai.model') }}</label>
        <input id="gmodel" v-model="settings.grokModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['grok-4.3', 'grok-4.20-0309-non-reasoning', 'grok-4.7']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.grokModel = m"
          >
            {{ m }}
          </button>
          — {{ t('ai.grokTip') }}
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'deepseek'">
      <div>
        <label :class="label" for="dkey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="dkey" v-model="settings.deepseekKey" placeholder="sk-..." />
        <p class="mt-1 text-xs text-neutral-500">{{ t('ai.stored') }}</p>
      </div>
      <div>
        <label :class="label" for="dmodel">{{ t('ai.model') }}</label>
        <input id="dmodel" v-model="settings.deepseekModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['deepseek-flash', 'deepseek-v4-pro']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.deepseekModel = m"
          >
            {{ m }}
          </button>
          — {{ t('ai.deepseekTip') }}
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'gemini'">
      <div>
        <label :class="label" for="gekey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="gekey" v-model="settings.geminiKey" placeholder="AQ... / AIza..." />
        <p class="mt-1 text-xs text-neutral-500">
          <T k="ai.geminiKeyHint">
            <template #link>
              <a href="https://aistudio.google.com/api-keys" target="_blank" :class="link"
                >Google AI Studio</a
              >
            </template>
          </T>
        </p>
      </div>
      <div>
        <label :class="label" for="gemodel">{{ t('ai.model') }}</label>
        <input id="gemodel" v-model="settings.geminiModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['gemini-3.5-flash-lite', 'gemini-3.5-flash']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.geminiModel = m"
          >
            {{ m }}
          </button>
          — {{ t('ai.geminiTip') }}
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'openrouter'">
      <div>
        <label :class="label" for="orkey">{{ t('ai.apiKey') }}</label>
        <SecretInput id="orkey" v-model="settings.openrouterKey" placeholder="sk-or-..." />
        <p class="mt-1 text-xs text-neutral-500">
          <T k="ai.openrouterKeyHint">
            <template #link>
              <a href="https://openrouter.ai/keys" target="_blank" :class="link">openrouter.ai</a>
            </template>
          </T>
        </p>
      </div>
      <div>
        <label :class="label" for="ormodel">{{ t('ai.model') }}</label>
        <input id="ormodel" v-model="settings.openrouterModel" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['google/gemma-4-31b-it:free', 'openrouter/free']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.openrouterModel = m"
          >
            {{ m }}
          </button>
          —
          <T k="ai.openrouterTip">
            <template #model><span class="font-mono">openrouter/free</span></template>
            <template #link>
              <a href="https://openrouter.ai/models?max_price=0" target="_blank" :class="link"
                >openrouter.ai</a
              >
            </template>
          </T>
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'ollama'">
      <div>
        <label :class="label" for="obase">{{ t('ai.baseUrl') }}</label>
        <input id="obase" v-model="settings.ollamaBaseUrl" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.default') }}
          <button
            type="button"
            :class="example"
            @click="settings.ollamaBaseUrl = 'http://localhost:11434/v1'"
          >
            http://localhost:11434/v1
          </button>
        </p>
      </div>
      <div>
        <label :class="label" for="olmodel">{{ t('ai.modelName') }}</label>
        <input
          id="olmodel"
          v-model="settings.ollamaModel"
          :class="input"
          placeholder="translategemma:12b"
        />
        <div class="mt-1 space-y-1 text-xs text-neutral-500">
          <p
            v-for="m in [
              { name: 'translategemma:4b', badge: 'ai.fastest', why: 'ai.ollama4b' },
              { name: 'translategemma:12b', badge: 'ai.recommended', why: 'ai.ollama12b' },
              { name: 'gemma4:26b', badge: 'ai.best', why: 'ai.ollama26b' },
            ] as const"
            :key="m.name"
          >
            <button
              type="button"
              class="font-mono text-neutral-400 underline hover:text-fg"
              @click="settings.ollamaModel = m.name"
            >
              {{ m.name }}
            </button>
            <span class="ms-1 rounded bg-fg/10 px-1.5 py-0.5 text-neutral-300">{{
              t(m.badge)
            }}</span>
            — {{ t(m.why) }}
          </p>
        </div>
      </div>
      <div class="rounded border border-fg/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">{{ t('ai.ollamaSetup') }}</p>
        <ol class="mt-2 list-decimal space-y-1 ps-4">
          <li>
            <T k="ai.ollamaStep1">
              <template #link>
                <a href="https://ollama.com/download" target="_blank" :class="link">ollama.com</a>
              </template>
            </T>
          </li>
          <li>
            <T k="ai.ollamaStep2">
              <template #cmd><code :class="code">ollama pull translategemma:12b</code></template>
            </T>
          </li>
          <li>
            <T k="ai.ollamaStep3">
              <template #cmd>
                <code :class="code + ' break-all'"
                  >OLLAMA_ORIGINS="chrome-extension://*" ollama serve</code
                >
              </template>
            </T>
          </li>
          <li>{{ t('ai.ollamaStep4') }}</li>
        </ol>
        <p class="mt-2 text-neutral-500">
          <T k="ai.ollama403">
            <template #env><code class="font-mono">OLLAMA_ORIGINS</code></template>
          </T>
        </p>
      </div>
    </template>

    <template v-else-if="settings.provider === 'lmstudio'">
      <div>
        <label :class="label" for="lsbase">{{ t('ai.baseUrl') }}</label>
        <input id="lsbase" v-model="settings.lmstudioBaseUrl" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.default') }}
          <button
            type="button"
            :class="example"
            @click="settings.lmstudioBaseUrl = 'http://localhost:1234/v1'"
          >
            http://localhost:1234/v1
          </button>
        </p>
      </div>
      <div>
        <label :class="label" for="lsmodel">{{ t('ai.modelName') }}</label>
        <input
          id="lsmodel"
          v-model="settings.lmstudioModel"
          :class="input"
          placeholder="google/gemma-4-26b-a4b"
        />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['google/gemma-4-26b-a4b', 'qwen/qwen3.6-35b-a3b']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.lmstudioModel = m"
          >
            {{ m }}
          </button>
          — {{ t('ai.lmstudioTip') }}
        </p>
        <p class="mt-1 text-xs text-neutral-500">{{ t('ai.lmstudioThinking') }}</p>
      </div>
      <div class="rounded border border-fg/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">{{ t('ai.lmstudioSetup') }}</p>
        <ol class="mt-2 list-decimal space-y-1 ps-4">
          <li>
            <T k="ai.lmstudioStep1">
              <template #link>
                <a href="https://lmstudio.ai/download" target="_blank" :class="link">lmstudio.ai</a>
              </template>
            </T>
          </li>
          <li>
            <T k="ai.lmstudioStep2">
              <template #cmd><code :class="code">lms get google/gemma-4-26b-a4b</code></template>
            </T>
          </li>
          <li>
            <T k="ai.lmstudioStep3">
              <template #cmd><code :class="code">lms server start</code></template>
            </T>
          </li>
          <li>{{ t('ai.lmstudioStep4') }}</li>
        </ol>
        <p class="mt-2 text-neutral-500">{{ t('ai.lmstudioCors') }}</p>
      </div>
    </template>

    <template v-else>
      <div>
        <label :class="label" for="base">{{ t('ai.baseUrlCompat') }}</label>
        <input id="base" v-model="settings.localBaseUrl" :class="input" />
        <p class="mt-1 text-xs text-neutral-500">
          <span
            v-for="[name, url] in [
              ['llama.cpp', 'http://localhost:8080/v1'],
              ['vLLM', 'http://localhost:8000/v1'],
            ]"
            :key="url"
            class="me-3 inline-block"
          >
            {{ name }}:
            <button
              type="button"
              class="font-mono text-neutral-400 underline hover:text-fg"
              @click="settings.localBaseUrl = url"
            >
              {{ url }}
            </button>
          </span>
        </p>
      </div>
      <div>
        <label :class="label" for="lmodel">{{ t('ai.modelName') }}</label>
        <input id="lmodel" v-model="settings.localModel" :class="input" placeholder="gemma4" />
        <p class="mt-1 text-xs text-neutral-500">
          {{ t('common.examples') }}
          <button
            v-for="m in ['gemma4', 'google/gemma-4-26B-A4B-it']"
            :key="m"
            type="button"
            :class="example"
            @click="settings.localModel = m"
          >
            {{ m }}
          </button>
          —
          <T k="ai.localTip">
            <template #alias><span class="font-mono">--alias</span></template>
          </T>
        </p>
      </div>
      <div class="rounded border border-fg/10 p-3 text-xs text-neutral-400">
        <p class="font-medium text-neutral-300">{{ t('ai.llamaSetup') }}</p>
        <ol class="mt-2 list-decimal space-y-1 ps-4">
          <li>
            <T k="ai.llamaStep1">
              <template #cmd><code :class="code">brew install llama.cpp</code></template>
              <template #link>
                <a
                  href="https://github.com/ggml-org/llama.cpp/releases"
                  target="_blank"
                  :class="link"
                  >GitHub</a
                >
              </template>
            </T>
          </li>
          <li>
            <T k="ai.llamaStep2">
              <template #cmd>
                <code :class="code + ' break-all'"
                  >llama-server -hf ggml-org/gemma-4-26B-A4B-it-GGUF:Q4_0 --alias gemma4 --port
                  8080</code
                >
              </template>
            </T>
          </li>
          <li>
            <T k="ai.llamaStep3">
              <template #alias><code class="font-mono">--alias</code></template>
            </T>
          </li>
        </ol>
        <p class="mt-2 text-neutral-500">{{ t('ai.llamaOther') }}</p>
      </div>
    </template>

    <ul
      v-if="NOTES[settings.provider]"
      class="list-disc space-y-1 rounded border border-fg/10 p-3 ps-7 text-xs text-neutral-400"
    >
      <li
        v-for="n in NOTES[settings.provider]"
        :key="n.text"
        :class="n.warn ? 'text-yellow-300' : undefined"
      >
        {{ t(n.text) }}
      </li>
    </ul>

    <p
      v-if="!['ollama', 'lmstudio', 'local'].includes(settings.provider)"
      class="text-xs text-neutral-500"
    >
      {{ t('ai.privacy') }}
    </p>

    <div class="space-y-2">
      <button
        type="button"
        class="flex w-fit items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
        :class="
          testing ? 'border-accent/40 bg-accent/15 text-accent' : 'border-fg/20 hover:bg-fg/10'
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
        {{ t('ai.test') }}
      </button>
      <p v-if="testError" class="text-xs text-red-300">{{ testError }}</p>
      <div v-else-if="testResult" class="space-y-1 rounded border border-fg/10 p-3 text-xs">
        <p class="text-neutral-500" dir="auto">{{ testResult.source }}</p>
        <p class="min-h-4 text-neutral-200" dir="auto">
          <span v-if="testing" class="inline-block h-3 w-2/3 animate-pulse rounded bg-fg/10" />
          <template v-else>{{ testResult.text }}</template>
        </p>
      </div>
    </div>
  </div>
</template>
