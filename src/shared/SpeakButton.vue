<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { play, speaking, stop } from './speech'

const props = defineProps<{
  /** Text in the study language. AI examples mark the word with `*`. */
  text: string
  lang: string
  /** Hidden until the row (a `group`) is hovered. It keeps its space. */
  onHover?: boolean
  /** Round, like the buttons of the subtitle bar. */
  round?: boolean
  /** Key that plays it too, for the tooltip. */
  shortcut?: string
}>()
const emit = defineEmits<{
  /** It starts to play. `done` resolves when it ends or is stopped. */
  play: [done: Promise<void>]
}>()

const text = computed(() => props.text.replaceAll('*', ''))
const on = computed(() => speaking.value === `${props.lang}:${text.value}`)
const toggle = () => (on.value ? stop() : emit('play', play(text.value, props.lang)))
onBeforeUnmount(() => on.value && stop())

// Lucide "volume-2".
const paths = [
  'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
  'M16 9a5 5 0 0 1 0 6',
  'M19.364 18.364a9 9 0 0 0 0-12.728',
]
</script>

<template>
  <!-- Hover only when it does not play, so it does not hide the playing color. -->
  <button
    class="shrink-0 transition-[color,background-color,opacity] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-fg/40"
    :class="[
      round ? 'grid size-8 place-items-center rounded-full' : 'rounded-md p-1',
      on
        ? 'bg-accent/15 text-accent'
        : round
          ? 'bg-fg/10 text-fg hover:bg-fg/25'
          : [
              'text-fg/40 hover:bg-fg/10 hover:text-fg',
              onHover && 'opacity-0 group-hover:opacity-100',
            ],
    ]"
    :title="(on ? 'Stop' : 'Play') + (shortcut ? ` (${shortcut})` : '')"
    @click="toggle"
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
      <path v-for="d in paths" :key="d" :d="d" />
    </svg>
  </button>
</template>
