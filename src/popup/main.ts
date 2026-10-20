import { createApp } from 'vue'
import '@/shared/styles/main.css'
import '@/shared/styles/fonts.css'
import { useSettings } from '@/app/settings'
import { followLocale, uiDir } from '@/shared/i18n'
import { countOpen } from '@/shared/rating'
import ToolbarPopup from './ToolbarPopup.vue'

// Load the settings first: the popup must not show the defaults (a wrong switch) for a moment.
// The rating banner is known before the mount too, so it does not appear later. The interface
// language is loaded before the mount, so the popup does not show English first.
const { settings, loaded } = useSettings()
let mounted = false
void Promise.all([loaded, countOpen()]).then(([, rating]) =>
  followLocale(
    () => settings.value.uiLang,
    (lang) => {
      document.documentElement.lang = lang
      document.documentElement.dir = uiDir()
      if (!mounted) createApp(ToolbarPopup, { rating }).mount('#app')
      mounted = true
    },
  ),
)
