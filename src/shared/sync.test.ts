import { expect, test } from 'bun:test'
import {
  changedEntries,
  fromSyncEntries,
  makeBackup,
  mergeItems,
  mergeSettings,
  parseBackup,
  restoreSettings,
  TOMBSTONE_TTL,
  toSyncEntries,
} from './sync'
import { DEFAULT_SETTINGS, type SavedPhrase, type SavedWord } from './types'

const NOW = 10 * TOMBSTONE_TTL

const word = (id: string, updatedAt: number, extra: Partial<SavedWord> = {}): SavedWord => ({
  id,
  itemType: 'WORD',
  langCode: 'de',
  translationLang: 'en',
  stage: 'LEARNING',
  createdAt: updatedAt,
  updatedAt,
  text: id,
  translations: [],
  context: null,
  source: null,
  ...extra,
})

test('mergeItems: the newer change wins, and the first createdAt stays', () => {
  const a = { items: [word('w1', 100, { stage: 'KNOWN', createdAt: 50 })], deleted: {} }
  const b = { items: [word('w1', 200, { stage: 'LEARNING', createdAt: 20 })], deleted: {} }
  const out = mergeItems(a, b, NOW)
  expect(out.items).toHaveLength(1)
  expect(out.items[0]!.stage).toBe('LEARNING')
  expect(out.items[0]!.createdAt).toBe(20)
})

test('mergeItems: same updatedAt keeps the fields of both', () => {
  const a = { items: [word('w1', 100, { ipa: 'aɪ' })], deleted: {} }
  const b = {
    items: [word('w1', 100, { examples: [{ sentence: 's', translation: 't' }] })],
    deleted: {},
  }
  const w = mergeItems(a, b, NOW).items[0] as SavedWord
  expect(w.ipa).toBe('aɪ')
  expect(w.examples).toHaveLength(1)
})

test('mergeItems: items from both sides, `a` order first', () => {
  const a = { items: [word('w2', 1), word('w1', 1)], deleted: {} }
  const b = { items: [word('w3', 1), word('w1', 1)], deleted: {} }
  expect(mergeItems(a, b, NOW).items.map((x) => x.id)).toEqual(['w2', 'w1', 'w3'])
})

test('mergeItems: a delete after the last change wins, a save after the delete wins', () => {
  const t = NOW - 1000
  const a = { items: [word('w1', t + 100), word('w2', t + 300)], deleted: {} }
  const b = { items: [], deleted: { w1: t + 200, w2: t + 200 } }
  const out = mergeItems(a, b, NOW)
  expect(out.items.map((x) => x.id)).toEqual(['w2'])
  expect(out.deleted).toEqual({ w1: t + 200 })
})

test('mergeItems: old tombstones are dropped', () => {
  const out = mergeItems(
    { items: [], deleted: { old: 1, recent: NOW - 1000 } },
    { items: [], deleted: {} },
    NOW,
  )
  expect(out.deleted).toEqual({ recent: NOW - 1000 })
})

test('backup leaves out the API keys unless syncKeys is on', () => {
  const s = { ...DEFAULT_SETTINGS, claudeKey: 'secret' }
  const data = { items: [], deleted: {} }
  expect(makeBackup(s, data).settings.claudeKey).toBeUndefined()
  expect(makeBackup({ ...s, syncKeys: true }, data).settings.claudeKey).toBe('secret')
})

test('parseBackup reads a backup, and the plain "Export JSON" list', () => {
  const backup = makeBackup(
    { ...DEFAULT_SETTINGS, studyLang: 'fr' },
    { items: [word('w1', 1)], deleted: { x: 5 } },
  )
  const read = parseBackup(JSON.stringify(backup))
  expect(read.items.map((x) => x.id)).toEqual(['w1'])
  expect(read.deleted).toEqual({ x: 5 })
  expect(read.settings.studyLang).toBe('fr')

  const phrase: SavedPhrase = {
    id: 'p1',
    itemType: 'PHRASE',
    langCode: 'de',
    translationLang: 'en',
    stage: 'LEARNING',
    createdAt: 1,
    updatedAt: 1,
    text: 'Hallo',
    translation: null,
    source: { source: 'YOUTUBE', videoId: 'v', title: 't', startMs: 0, endMs: 1 },
  }
  expect(parseBackup(JSON.stringify([phrase])).items).toHaveLength(1)
})

test('parseBackup refuses other files and drops unknown settings', () => {
  expect(() => parseBackup('{"a":1}')).toThrow()
  expect(() => parseBackup('[{"id":1}]')).toThrow()
  const read = parseBackup(
    JSON.stringify({
      app: 'lingomingo',
      items: [],
      settings: { evil: 1, autoPause: 'yes', hideShorts: true },
    }),
  )
  expect(read.settings).toEqual({ hideShorts: true })
})

test('restoreSettings: an empty key in the file does not clear the key here', () => {
  expect(restoreSettings({ claudeKey: '', openaiKey: 'k', studyLang: 'fr' })).toEqual({
    openaiKey: 'k',
    studyLang: 'fr',
  })
})

test('sync entries: one key per setting, keys only with syncKeys, round trip', () => {
  const s = { ...DEFAULT_SETTINGS, claudeKey: 'secret', studyLang: 'fr' }
  const entries = toSyncEntries(s)
  expect(entries['s:studyLang']).toBe('fr')
  expect('s:claudeKey' in entries).toBe(false)
  expect(toSyncEntries({ ...s, syncKeys: true })['s:claudeKey']).toBe('secret')
  expect(fromSyncEntries({ ...entries, other: 1, 's:gone': 2 })).toEqual(
    Object.fromEntries(Object.entries(s).filter(([k]) => !k.endsWith('Key'))),
  )
})

test('changedEntries compares by value', () => {
  expect(changedEntries({ a: [1], b: 2, c: { x: 1 } }, { a: [1], b: 3, c: { x: 1 } })).toEqual({
    b: 2,
  })
})

test('mergeSettings: newer settings from Drive win, an empty key does not clear one here', () => {
  const local = { ...DEFAULT_SETTINGS, claudeKey: 'mine', studyLang: 'de' }
  const remote = { ...DEFAULT_SETTINGS, claudeKey: '', studyLang: 'fr', syncKeys: true }
  expect(mergeSettings(local, 100, remote, 200)).toEqual({
    patch: { studyLang: 'fr', syncKeys: true },
    at: 200,
  })
})

test('mergeSettings: older settings from Drive only fill empty API keys', () => {
  const local = { ...DEFAULT_SETTINGS, studyLang: 'de' }
  const remote = { ...DEFAULT_SETTINGS, studyLang: 'fr', deepseekKey: 'k' }
  expect(mergeSettings(local, 300, remote, 200)).toEqual({ patch: { deepseekKey: 'k' }, at: 300 })
  expect(mergeSettings({ ...local, deepseekKey: 'x' }, 300, remote, 200)).toBeNull()
})

test('mergeSettings: same settings with a newer time take the time', () => {
  expect(mergeSettings(DEFAULT_SETTINGS, 100, { ...DEFAULT_SETTINGS }, 200)).toEqual({
    patch: {},
    at: 200,
  })
  expect(mergeSettings(DEFAULT_SETTINGS, 100, undefined, 200)).toBeNull()
})
