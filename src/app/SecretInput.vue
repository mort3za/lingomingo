<script setup lang="ts">
import { ref } from 'vue'
import { INPUT } from './settings'

/** Password field for an API key, with a button that shows or hides the value. */
const model = defineModel<string>({ required: true })
defineProps<{ id: string; placeholder?: string }>()

const shown = ref(false)
// Lucide "eye" and "eye-off".
const eye = [
  'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
  'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
]
const eyeOff = [
  'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49',
  'M14.084 14.158a3 3 0 0 1-4.242-4.242',
  'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143',
  'm2 2 20 20',
]
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :type="shown ? 'text' : 'password'"
      :class="INPUT + ' pr-10'"
      :placeholder="placeholder"
      autocomplete="off"
      spellcheck="false"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-500 hover:text-white focus-visible:text-white focus-visible:outline-none"
      :title="shown ? 'Hide key' : 'Show key'"
      :aria-label="shown ? 'Hide key' : 'Show key'"
      :aria-pressed="shown"
      @click="shown = !shown"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path v-for="d in shown ? eyeOff : eye" :key="d" :d="d" />
      </svg>
    </button>
  </div>
</template>
