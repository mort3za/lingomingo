import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest(({ command, mode }) => {
  // `bun run dev` and `bun run build:dev` get the blue icon, to tell them apart from the store build.
  const icons = command === 'serve' || mode === 'development' ? 'icons/dev' : 'icons'

  return {
    manifest_version: 3,
    // The name is the brand and stays the same in all languages. The description is in
    // public/_locales/<language>/messages.json.
    name: 'LingoMingo',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: pkg.version,
    // PNGs are made from public/icons/icon.svg (blue dev icon: public/icons/dev/icon.svg).
    icons: {
      16: `${icons}/icon-16.png`,
      32: `${icons}/icon-32.png`,
      48: `${icons}/icon-48.png`,
      128: `${icons}/icon-128.png`,
    },
    // A click on the toolbar button opens the popup: on/off switch, study language, app links.
    action: {
      default_title: 'LingoMingo',
      default_popup: 'src/popup/index.html',
      default_icon: {
        16: `${icons}/icon-16.png`,
        32: `${icons}/icon-32.png`,
      },
    },
    background: {
      service_worker: 'src/background/index.ts',
      type: 'module',
    },
    // unlimitedStorage: subtitle translations are cached per video.
    permissions: ['storage', 'unlimitedStorage'],
    // The background calls the Claude, OpenAI, xAI (Grok), DeepSeek, Gemini and OpenRouter APIs, and a local model (Ollama, llama.cpp).
    // The Media page reads YouTube channel RSS feeds.
    host_permissions: [
      'https://www.youtube.com/*',
      'https://api.anthropic.com/*',
      'https://api.openai.com/*',
      'https://api.x.ai/*',
      'https://api.deepseek.com/*',
      'https://generativelanguage.googleapis.com/*',
      'https://openrouter.ai/*',
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
  }
})
