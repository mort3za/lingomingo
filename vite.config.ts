import { fileURLToPath, URL } from 'node:url'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [vue(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      // Pages not listed in the manifest must be added here to be built.
      input: {
        app: 'src/app/index.html',
      },
    },
  },
  server: {
    // Fixed port: the extension in dist connects to this port for HMR.
    port: 5180,
    strictPort: true,
    // Let extension pages and content scripts load modules from the dev server.
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
})
