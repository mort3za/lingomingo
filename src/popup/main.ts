import { createApp } from 'vue'
import '@/shared/styles/main.css'
import { useSettings } from '@/app/settings'
import { countOpen } from '@/shared/rating'
import ToolbarPopup from './ToolbarPopup.vue'

// Load the settings first: the popup must not show the defaults (a wrong switch) for a moment.
// The rating banner is known before the mount too, so it does not appear later.
void Promise.all([useSettings().loaded, countOpen()]).then(([, rating]) =>
  createApp(ToolbarPopup, { rating }).mount('#app'),
)
