<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@/shared/i18n'

// A shell command in a help text, with a copy button that shows on hover.
const props = defineProps<{ text: string }>()

const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(props.text)
  copied.value = true
  setTimeout(() => (copied.value = false), 1000)
}
</script>

<template>
  <span class="group">
    <code class="font-mono break-all text-neutral-300">{{ text }}</code>
    <!-- Fixed size: the check mark must not move the text. -->
    <button
      type="button"
      class="ms-1 inline-flex size-3.5 justify-center align-middle text-fg/40 opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
      :title="t('yt.copy')"
      :aria-label="t('yt.copy')"
      @click="copy"
    >
      <span v-if="copied" class="leading-3.5">✓</span>
      <svg
        v-else
        class="size-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  </span>
</template>
