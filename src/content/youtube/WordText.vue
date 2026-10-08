<script setup lang="ts">
import { computed } from 'vue'
import { tokenize, wordKey } from '@/shared/tokenize'
import type { Stage } from '@/shared/types'

const props = defineProps<{
  text: string
  lang: string
  stages: Map<string, Stage>
  selected?: string | null
}>()
const emit = defineEmits<{
  word: [word: string, el: HTMLElement]
  mark: [word: string]
}>()

const tokens = computed(() => tokenize(props.text, props.lang))

function classes(word: string): string {
  const stage = props.stages.get(wordKey(word))
  const base = 'cursor-pointer rounded px-px hover:bg-white/20 '
  if (props.selected && wordKey(props.selected) === wordKey(word)) return base + 'bg-white/25'
  if (stage === 'KNOWN') return base + 'text-emerald-300'
  if (stage === 'LEARNING') return base + 'text-orange-300 outline outline-1 outline-orange-300/70'
  if (stage === 'SKIPPED') return base + 'text-violet-300/60'
  return base
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
