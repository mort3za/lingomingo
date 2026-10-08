<script setup lang="ts">
defineProps<{ site: 'netflix' | 'youtube' }>()
</script>

<template>
  <div
    class="fixed right-4 bottom-4 z-[2147483647] rounded-md bg-surface px-3 py-2 font-sans text-sm text-white shadow-lg"
  >
    Lingomingo is on ({{ site }})
  </div>
</template>
