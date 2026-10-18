<script setup lang="ts">
import { computed } from 'vue'
import { tokenize, wordKey } from '@/shared/tokenize'
import { WORD_STYLE, wordClass, type Vocab } from '@/shared/vocab'

const props = defineProps<{
  text: string
  lang: string
  vocab: Vocab
  selected?: string | null
  /** Hint letters (Shift+F), one for each word in order, and the letters typed so far. */
  hints?: { labels: string[]; typed: string } | null
  /** Hints on the start of the word, not above it: for lines with no space between them. */
  hintsInside?: boolean
}>()
const emit = defineEmits<{
  word: [word: string, el: HTMLElement]
  mark: [word: string]
}>()

// `n`: the word's index among the words, for its hint.
const tokens = computed(() => {
  let n = 0
  return tokenize(props.text, props.lang).map((t) => ({ ...t, n: t.isWord ? n++ : -1 }))
})

function classes(word: string): string {
  const base = 'cursor-pointer rounded px-px hover:bg-fg/20 '
  if (props.selected && wordKey(props.selected) === wordKey(word)) return base + 'bg-fg/25'
  return base + WORD_STYLE[wordClass(word, props.vocab)]
}
// The typed letters show lighter. A word that no longer matches them fades.
function hintOf(n: number) {
  const label = props.hints?.labels[n]
  if (!label) return null
  const typed = props.hints!.typed
  const hit = label.startsWith(typed)
  return { label, done: hit ? typed : '', rest: hit ? label.slice(typed.length) : label, hit }
}
</script>

<template>
  <template v-for="(t, i) in tokens" :key="i">
    <!-- The hint sits over the text, so it moves nothing. -->
    <span
      v-if="t.isWord"
      :class="[classes(t.text), hints && 'relative']"
      :data-lm-hint="hintOf(t.n)?.label"
      @click.stop="emit('word', t.text, $event.currentTarget as HTMLElement)"
      @contextmenu.prevent.stop="emit('mark', t.text)"
      >{{ t.text
      }}<span
        v-if="hintOf(t.n)"
        class="pointer-events-none absolute -start-1 z-10 rounded bg-accent px-1 py-0.5 font-mono text-[max(12px,0.5em)] leading-none font-bold text-white shadow-md shadow-black/40"
        :class="[
          hintsInside ? 'top-1/2 -translate-y-1/2' : '-top-2.5',
          !hintOf(t.n)!.hit && 'opacity-20',
        ]"
        dir="ltr"
        ><span class="opacity-50">{{ hintOf(t.n)!.done }}</span
        >{{ hintOf(t.n)!.rest }}</span
      ></span
    >
    <template v-else>{{ t.text }}</template>
  </template>
</template>
