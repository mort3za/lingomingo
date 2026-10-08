<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ShortcutsDialog from './ShortcutsDialog.vue'
import { ignoreKey } from './shortcuts'

const mainLinks = [
  { to: '/media', label: 'Media' },
  { to: '/review', label: 'Review' },
  { to: '/saved-items', label: 'Saved' },
]
const footerLinks = [
  { to: '/settings', label: 'Settings' },
  { to: '/credits', label: 'Credits' },
]

const router = useRouter()
const help = ref(false)
/** "G, then a key" goes to a page. */
const goKeys: Record<string, string> = {
  m: '/media',
  r: '/review',
  s: '/saved-items',
  ',': '/settings',
}
let gAt = 0

// Capture phase: runs before the page handlers, so it can block them while the dialog is open.
function onKeydown(e: KeyboardEvent) {
  if (help.value) {
    if (e.key === 'Escape' || e.key === '?') help.value = false
    e.stopPropagation()
    return
  }
  if (ignoreKey(e)) return
  if (e.key === '?') {
    help.value = true
  } else if (e.key.toLowerCase() === 'g') {
    gAt = Date.now()
  } else if (Date.now() - gAt < 1500 && goKeys[e.key.toLowerCase()]) {
    gAt = 0
    void router.push(goKeys[e.key.toLowerCase()]!)
  } else {
    return
  }
  e.preventDefault()
  e.stopPropagation()
}
onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div class="flex min-h-screen font-sans">
    <nav class="sticky top-0 flex h-screen w-40 shrink-0 flex-col gap-1 bg-surface p-2">
      <RouterLink
        v-for="link in mainLinks"
        :key="link.to"
        :to="link.to"
        class="rounded px-3 py-2 text-sm hover:bg-panel"
        active-class="bg-panel border-l-2 border-accent"
      >
        {{ link.label }}
      </RouterLink>
      <hr class="my-2 border-panel" />
      <RouterLink
        v-for="link in footerLinks"
        :key="link.to"
        :to="link.to"
        class="rounded px-3 py-2 text-sm hover:bg-panel"
        active-class="bg-panel border-l-2 border-accent"
      >
        {{ link.label }}
      </RouterLink>
      <button
        class="mt-auto rounded px-3 py-2 text-left text-xs text-neutral-500 hover:bg-panel hover:text-neutral-300"
        @click="help = true"
      >
        Shortcuts
        <kbd class="ml-1 rounded border border-white/20 px-1 font-sans">?</kbd>
      </button>
    </nav>
    <main class="min-w-0 flex-1 p-6">
      <RouterView />
    </main>
    <ShortcutsDialog v-if="help" @close="help = false" />
  </div>
</template>
