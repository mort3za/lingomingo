import { ref, shallowRef } from 'vue'
import { dirOf, LANGUAGES } from '../types'
import en, { type Key, type Messages, type Msg } from './locales/en'

export type { Key, Messages }

/** Language of the interface now. */
export const locale = ref('en')
const messages = shallowRef<Messages>(en)

/** Text direction of the interface now, for the `dir` attribute. */
export const uiDir = () => dirOf(locale.value)

/**
 * The interface language for the `uiLang` setting. Empty: the browser language, when LingoMingo
 * has it, else English.
 */
export function resolveUiLang(pref: string): string {
  if (pref && LANGUAGES[pref]) return pref
  const browser = globalThis.chrome?.i18n?.getUILanguage?.() ?? globalThis.navigator?.language
  const code = (browser ?? 'en').toLowerCase().split(/[-_]/)[0] ?? 'en'
  // `iw` is the old code for Hebrew.
  const lang = code === 'iw' ? 'he' : code
  return LANGUAGES[lang] ? lang : 'en'
}

export function setMessages(lang: string, msgs: Messages) {
  messages.value = msgs
  locale.value = lang
}

const numbers = (lang: string) => new Intl.NumberFormat(lang)

/**
 * The text of `key` in the interface language. `{name}` in the text takes `params.name`;
 * numbers are written in the digits of the language. A text with plural forms picks its form
 * by `params.n`.
 */
export function t(key: Key, params?: Record<string, string | number>): string {
  const lang = locale.value
  let msg: Msg = messages.value[key] ?? en[key]
  if (typeof msg !== 'string') {
    const n = Number(params?.n ?? 0)
    msg = msg[new Intl.PluralRules(lang).select(n)] ?? msg.other
  }
  if (!params) return msg
  return msg.replace(/\{(\w+)\}/g, (all, name: string) => {
    const v = params[name]
    if (v === undefined) return all
    return typeof v === 'number' ? numbers(lang).format(v) : v
  })
}

/** A number in the digits of the interface language. */
export const formatNumber = (n: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(locale.value, options).format(n)

/**
 * Name of a language in the interface language, as it is written in a sentence: "German",
 * French "allemand". For a name that stands alone (a list, a label), use `langLabel`.
 */
export function langName(code: string): string {
  try {
    return new Intl.DisplayNames([locale.value], { type: 'language' }).of(code) ?? code
  } catch {
    return LANGUAGES[code] ?? code
  }
}

/** Name of a language that stands alone, with a capital first letter: French "Allemand". */
export function langLabel(code: string): string {
  const name = langName(code)
  return name[0]!.toLocaleUpperCase(locale.value) + name.slice(1)
}

/** Name of a language in that language itself, for the interface language list. */
export function nativeName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code)
    return name ? name[0]!.toLocaleUpperCase(code) + name.slice(1) : code
  } catch {
    return LANGUAGES[code] ?? code
  }
}

/** The language codes, by their name in the interface language. */
export function sortedLangs(codes: string[] = Object.keys(LANGUAGES)): string[] {
  const collator = new Intl.Collator(locale.value)
  return [...codes].sort((a, b) => collator.compare(langLabel(a), langLabel(b)))
}
