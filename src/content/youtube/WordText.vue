<script setup lang="ts">
import { computed } from 'vue'
import { tokenize, wordKey } from '@/shared/tokenize'
import { WORD_STYLE, wordClass, type Vocab } from '@/shared/vocab'

const props = defineProps<{
  text: string
  lang: string
  vocab: Vocab
  selected?: string | null
}>()
const emit = defineEmits<{
  word: [word: string, el: HTMLElement]
  mark: [word: string]
}>()

const tokens = computed(() => tokenize(props.text, props.lang))

function classes(word: string): string {
  const base = 'cursor-pointer rounded px-px hover:bg-white/20 '
  if (props.selected && wordKey(props.selected) === wordKey(word)) return base + 'bg-white/25'
  return base + WORD_STYLE[wordClass(word, props.vocab)]
}
</script>

<template>
  <template v-for="(t, i) in tokens" :key="i">
    <span
      v-if="t.isWord"
      :class="classes(t.text)"
      @click.stop="emit('word', t.text, $event.currentTarget as HTMLElement)"
      @contextmenu.prevent.stop="emit('mark', t.text)"
      >{{ t.text }}</span
    >
    <template v-else>{{ t.text }}</template>
  </template>
</template>
