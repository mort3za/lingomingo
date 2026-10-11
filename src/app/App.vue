<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShortcutsDialog from './ShortcutsDialog.vue'
import StudyLangSwitcher from './StudyLangSwitcher.vue'
import { ignoreKey } from './shortcuts'

// Icons: SVG path data in the Lucide style (24×24, stroke).
const mainLinks = [
  {
    to: '/media',
    label: 'Media',
    icon: [
      'M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
      'm17 2-5 5-5-5',
    ],
  },
  {
    to: '/review',
    label: 'Review',
    icon: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  },
  {
    to: '/saved-items',
    label: 'Saved',
    icon: ['m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z'],
  },
]
const footerLinks = [
  {
    to: '/settings',
    label: 'Settings',
    icon: [
      'M20 7h-9',
      'M14 17H5',
      'M14 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
      'M4 7a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    ],
  },
  {
    to: '/credits',
    label: 'Credits',
    icon: [
      'm15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526',
      'M6 8a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
    ],
  },
  {
    to: '/donate',
    label: 'Donate',
    icon: [
      'M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16',
      'm14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95',
      'm2 15 6 6',
      'm7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91',
    ],
  },
]
const keyboardIcon = [
  'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10',
]
const linkClass =
  'flex items-center gap-3 rounded border-l-2 border-transparent px-3 py-2.5 text-[15px] text-neutral-300 hover:bg-panel hover:text-white'
const iconAttrs = {
  class: 'size-5 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const

const route = useRoute()

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
    <nav
      v-if="route.path !== '/setup'"
      class="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-1 bg-surface p-3"
    >
      <RouterLink to="/media" class="mb-3 flex items-center gap-2 px-3 py-2">
        <img src="/icons/icon.svg" alt="" class="size-7" />
        <span class="text-lg font-semibold">LingoMingo</span>
      </RouterLink>
      <StudyLangSwitcher />
      <template v-for="(links, i) in [mainLinks, footerLinks]" :key="i">
        <hr v-if="i > 0" class="my-2 border-panel" />
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="linkClass"
          active-class="bg-panel !border-accent !text-white"
        >
          <svg v-bind="iconAttrs">
            <path v-for="d in link.icon" :key="d" :d="d" />
          </svg>
          {{ link.label }}
        </RouterLink>
      </template>
      <button :class="[linkClass, 'mt-auto text-sm text-neutral-500']" @click="help = true">
        <svg v-bind="iconAttrs">
          <path v-for="d in keyboardIcon" :key="d" :d="d" />
        </svg>
        Shortcuts
        <kbd class="ml-auto rounded border border-white/20 px-1.5 font-sans text-xs">?</kbd>
      </button>
    </nav>
    <main class="min-w-0 flex-1 p-6">
      <RouterView />
    </main>
    <ShortcutsDialog v-if="help" @close="help = false" />
  </div>
</template>
