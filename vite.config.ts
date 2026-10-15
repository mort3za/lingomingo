import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import manifest from './manifest.config.ts'

// public/ is copied into dist as a whole. The store build does not use the blue dev icons,
// so remove them to keep them out of the release zip.
function removeDevIcons(): Plugin {
  let devIcons = ''
  return {
    name: 'remove-dev-icons',
    apply: (_, { command, mode }) => command === 'build' && mode !== 'development',
    configResolved(config) {
      devIcons = resolve(config.root, config.build.outDir, 'icons/dev')
    },
    closeBundle: () => rm(devIcons, { recursive: true, force: true }),
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), crx({ manifest }), removeDevIcons()],
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
