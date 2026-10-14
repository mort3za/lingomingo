import { createApp } from 'vue'
import '@/shared/styles/main.css'
import { useSettings } from '@/app/settings'
import ToolbarPopup from './ToolbarPopup.vue'

// Load the settings first: the popup must not show the defaults (a wrong switch) for a moment.
void useSettings().loaded.then(() => createApp(ToolbarPopup).mount('#app'))
