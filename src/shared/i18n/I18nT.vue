<script setup lang="ts">
import { computed } from 'vue'
import { t, type Key } from './core'

/**
 * A text with elements in it (links, code). `{name}` in the text shows the slot `name`; other
 * `{name}` parts take `params`, as in `t()`.
 */
const props = defineProps<{ k: Key; params?: Record<string, string | number> }>()

const parts = computed(() =>
  t(props.k, props.params)
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((p) => ({ text: p, slot: p.match(/^\{(\w+)\}$/)?.[1] })),
)
</script>

<template>
  <template v-for="(p, i) in parts" :key="i">
    <slot v-if="p.slot" :name="p.slot" />
    <template v-else>{{ p.text }}</template>
  </template>
</template>
