<script setup lang="ts">
import { INPUT as input, LABEL as label, useSettings } from './settings'

const { settings } = useSettings()
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
        <option value="ollama">Ollama (local)</option>
        <option value="lmstudio">LM Studio (local)</option>
        <option value="local">Other local server (llama.cpp, vLLM, ...)</option>
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

    <template v-else-if="settings.provider === 'openai'">
      <div>
        <label :class="label" for="okey">API key</label>
        <input
          id="okey"
          v-model="settings.openaiKey"
          type="password"
          :class="input"
          placeholder="sk-..."
        />
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
        <input
          id="gkey"
          v-model="settings.grokKey"
          type="password"
          :class="input"
          placeholder="xai-..."
        />
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
                name: 'translategemma:27b',
                badge: 'Best',
                why: 'Needs about 17 GB of memory. Highest quality, but slower.',
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

    <p
      v-if="!['ollama', 'lmstudio', 'local'].includes(settings.provider)"
      class="text-xs text-neutral-500"
    >
      LingoMingo sends subtitle lines, and the words and sentences that you open in the word popup,
      to this provider. The privacy policy of the provider applies.
    </p>
  </div>
</template>
