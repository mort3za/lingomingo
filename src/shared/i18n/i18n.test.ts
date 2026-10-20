import { expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
import { LANGUAGES } from '../types'
import { formatNumber, resolveUiLang, setMessages, t, type Key, type Messages } from './core'
import en from './locales/en'

const names = (msg: string) => [...msg.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

const locales = await Promise.all(
  readdirSync(new URL('./locales', import.meta.url))
    .filter((f) => f.endsWith('.ts'))
    .map(async (f) => ({
      lang: f.replace('.ts', ''),
      msgs: (await import(`./locales/${f}`)).default as Messages,
    })),
)

test('there is a locale for each language', () => {
  expect(locales.map((l) => l.lang).sort()).toEqual(Object.keys(LANGUAGES).sort())
})

test('each text has the same {names} as the English one', () => {
  const wrong: string[] = []
  for (const { lang, msgs } of locales) {
    for (const key of Object.keys(en) as Key[]) {
      const want = en[key]
      const have = msgs[key]
      const plain = (m: typeof want) => (typeof m === 'string' ? m : m.other)
      // Plural forms other than `other` can write the number as a word ("one word").
      if (names(plain(have)).join() !== names(plain(want)).join()) wrong.push(`${lang} ${key}`)
    }
  }
  expect(wrong).toEqual([])
})

test('t() puts in values and picks the plural form', () => {
  setMessages('en', en)
  expect(t('media.videoCount', { n: 1 })).toBe('1 video')
  expect(t('media.videoCount', { n: 3 })).toBe('3 videos')
  expect(t('media.removeNamed', { name: 'Easy German' })).toBe('Remove Easy German')
  expect(t('common.close')).toBe('Close')
})

test('t() writes numbers in the digits of the language', () => {
  const fa = locales.find((l) => l.lang === 'fa')!.msgs
  setMessages('fa', fa)
  expect(t('review.due', { n: 12 })).toBe('آمادهٔ مرور: ۱۲')
  expect(formatNumber(1000)).toBe('۱٬۰۰۰')
  setMessages('en', en)
})

test('resolveUiLang', () => {
  expect(resolveUiLang('fa')).toBe('fa')
  expect(resolveUiLang('xx')).toBe(resolveUiLang(''))
})
