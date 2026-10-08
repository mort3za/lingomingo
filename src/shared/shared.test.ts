import { expect, test } from 'bun:test'
import { alignTranslation, audioLang, findCueIndex, parseJson3, pickTrack } from './captions'
import { toCsv } from './export'
import { extractJson } from './llm-json'
import { tokenize } from './tokenize'
import { dirOf, type SavedItem } from './types'

test('pickTrack never returns auto-generated tracks', () => {
  const tracks = [
    { baseUrl: 'a', languageCode: 'es', kind: 'asr' },
    { baseUrl: 'b', languageCode: 'es-MX' },
    { baseUrl: 'c', languageCode: 'en', kind: 'asr' },
  ]
  expect(pickTrack(tracks, 'es')?.baseUrl).toBe('b')
  expect(pickTrack(tracks, 'en')).toBeNull()
})

test('audioLang reads the auto-generated track', () => {
  expect(
    audioLang([
      { baseUrl: 'a', languageCode: 'de' },
      { baseUrl: 'b', languageCode: 'en-US', kind: 'asr' },
    ]),
  ).toBe('en')
  expect(audioLang([{ baseUrl: 'a', languageCode: 'de' }])).toBeNull()
})

test('pickTrack prefers exact language code', () => {
  const tracks = [
    { baseUrl: 'a', languageCode: 'en-GB' },
    { baseUrl: 'b', languageCode: 'en' },
  ]
  expect(pickTrack(tracks, 'en')?.baseUrl).toBe('b')
})

test('parseJson3 joins segments and skips empty events', () => {
  const cues = parseJson3({
    events: [
      { tStartMs: 0, dDurationMs: 2000 },
      { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Hola\n' }, { utf8: 'mundo ' }] },
      { tStartMs: 4000, dDurationMs: 1000, segs: [{ utf8: '\n' }] },
    ],
  })
  expect(cues).toEqual([{ start: 1, end: 3, text: 'Hola mundo' }])
})

test('alignTranslation matches by time overlap', () => {
  const study = [
    { start: 0, end: 2, text: 'a' },
    { start: 2, end: 4, text: 'b' },
    { start: 10, end: 12, text: 'c' },
  ]
  const other = [
    { start: 0.1, end: 1, text: 'one' },
    { start: 1, end: 1.9, text: 'two' },
    { start: 2.5, end: 3.5, text: 'three' },
  ]
  expect(alignTranslation(study, other)).toEqual(['one two', 'three', null])
})

test('findCueIndex', () => {
  const cues = [
    { start: 1, end: 2, text: '' },
    { start: 3, end: 4, text: '' },
  ]
  expect(findCueIndex(cues, 0.5)).toBe(-1)
  expect(findCueIndex(cues, 1)).toBe(0)
  expect(findCueIndex(cues, 2.5)).toBe(0)
  expect(findCueIndex(cues, 9)).toBe(1)
})

test('tokenize marks words', () => {
  const t = tokenize('¿Cómo estás?', 'es')
  expect(t.filter((x) => x.isWord).map((x) => x.text)).toEqual(['Cómo', 'estás'])
})

test('extractJson reads json inside text', () => {
  expect(extractJson('Sure!\n```json\n["a","b"]\n```')).toEqual(['a', 'b'])
  expect(extractJson('{"translations":["x"]}')).toEqual({ translations: ['x'] })
})

test('toCsv escapes quotes and commas', () => {
  const item: SavedItem = {
    id: '1',
    itemType: 'PHRASE',
    langCode: 'es',
    translationLang: 'en',
    stage: 'LEARNING',
    createdAt: 0,
    updatedAt: 0,
    text: 'Hola, "amigo"',
    translation: 'Hi',
    source: { source: 'YOUTUBE', videoId: 'v', title: 'T', startMs: 0, endMs: 1 },
  }
  expect(toCsv([item]).split('\n')[1]).toContain('"Hola, ""amigo"""')
})

test('dirOf gives rtl for Persian and Arabic, ltr for others', () => {
  expect(dirOf('fa')).toBe('rtl')
  expect(dirOf('ar')).toBe('rtl')
  expect(dirOf('de')).toBe('ltr')
  expect(dirOf('en')).toBe('ltr')
})
