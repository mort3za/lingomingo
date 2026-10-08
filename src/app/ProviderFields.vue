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
        <input id="lmodel" v-model="settings.localModel" :class="input" placeholder="llama3.1:8b" />
      </div>
    </template>
  </div>
</template>
