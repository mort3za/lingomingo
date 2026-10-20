import { watch } from 'vue'
import { locale, resolveUiLang, setMessages, type Messages } from './core'
import en from './locales/en'

export * from './core'
export { default as T } from './I18nT.vue'

// Each language is a separate chunk: a page loads only the one it shows.
const loaders = import.meta.glob<{ default: Messages }>(['./locales/*.ts', '!./locales/en.ts'])

let last = ''
/** Load and use the interface language for the `uiLang` setting. */
export async function loadLocale(pref: string): Promise<string> {
  const lang = resolveUiLang(pref)
  last = lang
  const msgs = lang === 'en' ? en : ((await loaders[`./locales/${lang}.ts`]?.())?.default ?? en)
  // A newer call won while this one loaded.
  if (last === lang) setMessages(lang, msgs)
  return lang
}

/** Follow the `uiLang` setting. `apply` runs when the language is loaded, also the first time. */
export function followLocale(pref: () => string, apply: (lang: string) => void = () => {}) {
  watch(pref, (p) => void loadLocale(p).then(() => apply(locale.value)), { immediate: true })
}
