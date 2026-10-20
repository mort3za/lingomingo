import { createApp } from 'vue'
import '@/shared/styles/main.css'
import '@/shared/styles/fonts.css'
import { followLocale, uiDir } from '@/shared/i18n'
import App from './App.vue'
import { router } from './router'
import { useSettings } from './settings'

const { settings, loaded } = useSettings()
const app = createApp(App).use(router)
let mounted = false
// Mount when the interface language is loaded, so the page does not show English first.
void loaded.then(() =>
  followLocale(
    () => settings.value.uiLang,
    (lang) => {
      document.documentElement.lang = lang
      document.documentElement.dir = uiDir()
      if (!mounted) app.mount('#app')
      mounted = true
    },
  ),
)
