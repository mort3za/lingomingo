<script setup lang="ts">
import { nextTick, watch } from 'vue'
import type { YoutubeSession } from './session'

const props = defineProps<{ s: YoutubeSession }>()
const emit = defineEmits<{ close: [] }>()

const rows = new Map<number, HTMLElement>()
watch(
  () => props.s.activeIdx.value,
  async (i) => {
    await nextTick()
    rows.get(i)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
)
</script>

<template>
  <div
    class="pointer-events-auto absolute top-0 right-0 bottom-14 flex w-[340px] flex-col bg-surface/95 font-sans text-white"
  >
    <div class="flex items-center justify-between border-b border-white/10 px-3 py-2">
      <div class="border-b-2 border-accent pb-1 text-sm font-medium">Subtitles</div>
      <button class="text-white/60 hover:text-white" @click="emit('close')">✕</button>
    </div>
    <div class="flex-1 space-y-1 overflow-y-auto p-2">
      <div v-if="s.status.value !== 'ready'" class="p-2 text-sm text-neutral-400">
        {{ s.message.value || 'Loading…' }}
      </div>
      <div
        v-for="(c, i) in s.cues.value"
        :key="i"
        :ref="(el) => el && rows.set(i, el as HTMLElement)"
        :class="
          'flex cursor-pointer gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/10 ' +
          (i === s.activeIdx.value ? 'bg-accent/40' : 'bg-panel')
        "
        @click="s.goTo(i)"
      >
        <div class="flex-1">
          <div>{{ c.text }}</div>
          <div v-if="s.translationOf(i)" class="text-xs text-neutral-400">
            {{ s.translationOf(i) }}
          </div>
        </div>
        <button
          :class="s.savedPhraseIds.value.has(s.phraseKey(i)) ? 'text-yellow-300' : 'text-white/40'"
          @click.stop="s.togglePhrase(i)"
        >
          {{ s.savedPhraseIds.value.has(s.phraseKey(i)) ? '★' : '☆' }}
        </button>
      </div>
    </div>
  </div>
</template>
