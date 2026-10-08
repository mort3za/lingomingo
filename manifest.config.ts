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
  permissions: ['contextMenus', 'sidePanel'],
  content_scripts: [
    {
      matches: ['https://www.netflix.com/*'],
      js: ['src/content/netflix.ts'],
    },
    {
      matches: ['https://www.youtube.com/*'],
      js: ['src/content/youtube.ts'],
    },
  ],
})
