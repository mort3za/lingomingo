<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SHORTCUTS } from './shortcuts'

const emit = defineEmits<{ close: [] }>()
const route = useRoute()

// The current page's group first.
const groups = computed(() =>
  [...SHORTCUTS].sort((a, b) => Number(b.route === route.path) - Number(a.route === route.path)),
)
</script>

<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6"
    @click.self="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      class="flex max-h-full w-full max-w-3xl flex-col gap-4 rounded-lg bg-panel p-6 shadow-xl"
    >
      <div class="flex items-center justify-between">
        <h2 id="shortcuts-title" class="text-xl font-semibold">Keyboard shortcuts</h2>
        <button
          class="text-xl text-white/60 hover:text-white"
          title="Close (Esc)"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <div class="grid min-h-0 gap-x-8 gap-y-6 overflow-y-auto md:grid-cols-2">
        <section v-for="g in groups" :key="g.title">
          <h3 class="mb-2 text-sm font-medium text-neutral-400 uppercase">
            {{ g.title }}
            <span v-if="g.route === route.path" class="ml-1 text-accent normal-case">
              · this page
            </span>
          </h3>
          <dl class="space-y-1.5 text-sm">
            <div
              v-for="s in g.items"
              :key="s.label"
              class="flex items-center justify-between gap-4"
            >
              <dt class="text-neutral-200">{{ s.label }}</dt>
              <dd class="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                <template v-for="(alt, i) in s.keys" :key="i">
                  <span v-if="i">/</span>
                  <kbd
                    v-for="k in alt"
                    :key="k"
                    class="min-w-6 rounded border border-white/20 bg-surface-deep px-1.5 py-0.5 text-center font-sans text-neutral-200"
                    >{{ k }}</kbd
                  >
                </template>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>
