<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { needsExtras } from '@/shared/review'
import type { SavedWord } from '@/shared/types'
import { fetchExtras } from './extras'
import WordCard from './WordCard.vue'

const props = defineProps<{ word: SavedWord }>()
const emit = defineEmits<{ close: [] }>()

// The card shows the AI examples too: get them once, if the word does not have them yet.
const waiting = ref(false)
const error = ref('')
async function load() {
  if (!needsExtras(props.word)) return
  waiting.value = true
  error.value = ''
  try {
    await fetchExtras([props.word])
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    waiting.value = false
  }
}
onMounted(load)
</script>

<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 sm:p-6"
    @click.self="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="word.text"
      class="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-xl shadow-xl"
    >
      <WordCard :word="word" revealed :waiting="waiting" :error="error" @retry="load" />
      <button
        class="absolute top-3 right-4 text-xl text-white/60 hover:text-white"
        title="Close (Esc)"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>
  </div>
</template>
