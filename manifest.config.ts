import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'LingoMingo',
  description: 'Learn languages with YouTube and any web page.',
  version: pkg.version,
  // PNGs are made from public/icons/icon.svg.
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  // No default_popup: a click on the toolbar button opens the app page (see background).
  action: {
    default_title: 'Open LingoMingo',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
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
  // The background calls the Claude, OpenAI, xAI (Grok) and DeepSeek APIs, and a local model (Ollama, llama.cpp).
  // The Media page reads YouTube channel RSS feeds.
  host_permissions: [
    'https://www.youtube.com/*',
    'https://api.anthropic.com/*',
    'https://api.openai.com/*',
    'https://api.x.ai/*',
    'https://api.deepseek.com/*',
    'http://localhost/*',
    'http://127.0.0.1/*',
  ],
  // Content scripts load the word frequency lists for the vocabulary level.
  web_accessible_resources: [
    {
      resources: ['freq/*.txt'],
      matches: ['https://www.youtube.com/*'],
    },
  ],
  content_scripts: [
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
