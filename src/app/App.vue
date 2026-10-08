<script setup lang="ts">
const mainLinks = [
  { to: '/media', label: 'Media' },
  { to: '/review', label: 'Review' },
  { to: '/saved-items', label: 'Saved' },
]
const footerLinks = [
  { to: '/settings', label: 'Settings' },
  { to: '/credits', label: 'Credits' },
]
</script>

<template>
  <div class="flex min-h-screen font-sans">
    <nav class="flex w-40 flex-col gap-1 bg-surface p-2">
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
    </nav>
    <main class="min-w-0 flex-1 p-6">
      <RouterView />
    </main>
  </div>
</template>
