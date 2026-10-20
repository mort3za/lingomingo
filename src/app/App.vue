<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t } from '@/shared/i18n'
import ShortcutsDialog from './ShortcutsDialog.vue'
import StudyLangSwitcher from './StudyLangSwitcher.vue'
import { footerLinks, iconAttrs, mainLinks } from './nav'
import { ignoreKey } from './shortcuts'

const keyboardIcon = [
  'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10',
]
const linkClass =
  'flex items-center gap-3 rounded border-l-2 border-transparent px-3 py-2.5 text-[15px] text-neutral-300 hover:bg-panel hover:text-fg'

const menuIcon = ['M4 6h16', 'M4 12h16', 'M4 18h16']

const route = useRoute()
// Narrow windows: the nav is a drawer. It closes when a page opens.
const menuOpen = ref(false)
watch(
  () => route.path,
  () => (menuOpen.value = false),
)

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
  if (menuOpen.value && e.key === 'Escape') {
    menuOpen.value = false
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
  <div class="min-h-screen font-sans md:flex">
    <template v-if="route.path !== '/setup'">
      <header class="sticky top-0 z-30 flex h-14 items-center gap-1 bg-surface px-2 md:hidden">
        <button
          class="rounded p-2 text-neutral-300 hover:bg-panel hover:text-fg"
          :title="t('app.menu')"
          :aria-label="t('app.openMenu')"
          @click="menuOpen = true"
        >
          <svg v-bind="iconAttrs">
            <path v-for="d in menuIcon" :key="d" :d="d" />
          </svg>
        </button>
        <RouterLink to="/media" class="flex items-center gap-2 px-1">
          <img src="/icons/icon.svg" alt="" class="size-6" />
          <span class="font-semibold">LingoMingo</span>
        </RouterLink>
      </header>
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-40 bg-black/60 md:hidden"
        @click="menuOpen = false"
      />
    </template>
    <nav
      v-if="route.path !== '/setup'"
      class="fixed inset-y-0 left-0 z-50 flex h-screen w-56 shrink-0 flex-col gap-1 overflow-y-auto bg-surface p-3 transition-[translate,visibility] md:sticky md:translate-x-0 md:shadow-none md:transition-none"
      :class="menuOpen ? 'shadow-xl shadow-black/50' : 'invisible -translate-x-full md:visible'"
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
          active-class="bg-panel !border-accent !text-fg"
        >
          <svg v-bind="iconAttrs">
            <path v-for="d in link.icon" :key="d" :d="d" />
          </svg>
          {{ t(link.label) }}
        </RouterLink>
      </template>
      <button :class="[linkClass, 'mt-auto text-sm text-neutral-500']" @click="help = true">
        <svg v-bind="iconAttrs">
          <path v-for="d in keyboardIcon" :key="d" :d="d" />
        </svg>
        {{ t('app.shortcuts') }}
        <kbd class="ms-auto rounded border border-fg/20 px-1.5 font-sans text-xs">?</kbd>
      </button>
    </nav>
    <main class="min-w-0 flex-1 p-4 md:p-6">
      <RouterView />
    </main>
    <ShortcutsDialog v-if="help" @close="help = false" />
  </div>
</template>
