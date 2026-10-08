import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Lingomingo',
  description: 'Learn languages with Netflix, YouTube, and any web page.',
  version: pkg.version,
  // No default_popup: a click on the toolbar button opens the app page (see background).
  action: {
    default_title: 'Open Lingomingo',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  // unlimitedStorage: subtitle translations are cached per video.
  permissions: ['contextMenus', 'sidePanel', 'storage', 'unlimitedStorage'],
  // The background calls the Claude API and a local model (Ollama, llama.cpp).
  host_permissions: ['https://api.anthropic.com/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  content_scripts: [
    {
      matches: ['https://www.netflix.com/*'],
      js: ['src/content/netflix.ts'],
    },
    {
      matches: ['https://www.youtube.com/*'],
      js: ['src/content/youtube.ts'],
    },
    {
      // Runs in the page itself, to read the player data that isolated scripts cannot see.
      matches: ['https://www.youtube.com/*'],
      js: ['src/content/youtube-main.ts'],
      world: 'MAIN',
      run_at: 'document_start',
    },
  ],
})
