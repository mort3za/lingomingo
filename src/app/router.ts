import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history: extension pages have no server to resolve deep links.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/media' },
    { path: '/media', component: () => import('./pages/MediaPage.vue') },
    { path: '/reader', component: () => import('./pages/ReaderPage.vue') },
    { path: '/review', component: () => import('./pages/ReviewPage.vue') },
    { path: '/saved-items', component: () => import('./pages/SavedItemsPage.vue') },
    { path: '/settings', component: () => import('./pages/SettingsPage.vue') },
  ],
})
