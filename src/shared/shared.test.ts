import { expect, test } from 'bun:test'
import {
  alignTranslation,
  audioLang,
  dropDubbed,
  findCueIndex,
  parseJson3,
  pickTrack,
} from './captions'
import { toCsv } from './export'
import { extractJson } from './llm-json'
import { answer, formatSpan, isDue, learningWords, preview } from './review'
import { tokenize } from './tokenize'
import { dirOf, type SavedItem, type SavedWord } from './types'
import { parseWordList, wordClass, type Vocab } from './vocab'

test('pickTrack prefers human-made tracks, then auto-generated', () => {
  const tracks = [
    { baseUrl: 'a', languageCode: 'es', kind: 'asr' },
    { baseUrl: 'b', languageCode: 'es-MX' },
    { baseUrl: 'c', languageCode: 'en', kind: 'asr' },
  ]
  expect(pickTrack(tracks, 'es')?.baseUrl).toBe('b')
  expect(pickTrack(tracks, 'en')?.baseUrl).toBe('c')
  expect(pickTrack(tracks, 'de')).toBeNull()
})

test('dropDubbed removes auto-generated tracks of auto-dubbed audio', () => {
  const tracks = [
    { languageCode: 'ar', kind: 'asr' },
    { languageCode: 'de-DE', kind: 'asr' },
    { languageCode: 'de' },
    { languageCode: 'en', kind: 'asr' },
  ]
  const audio = [
    { id: 'ar.10', isAutoDubbed: true },
    { id: 'de-DE.10', isAutoDubbed: true },
    { id: 'en-US.4' },
  ]
  expect(dropDubbed(tracks, audio)).toEqual([
    { languageCode: 'de' },
    { languageCode: 'en', kind: 'asr' },
  ])
  expect(dropDubbed(tracks, [])).toEqual(tracks)
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

const word = (over: Partial<SavedWord> = {}): SavedWord => ({
  id: 'w:de:haus',
  itemType: 'WORD',
  langCode: 'de',
  translationLang: 'en',
  stage: 'LEARNING',
  createdAt: 0,
  updatedAt: 0,
  text: 'Haus',
  translations: ['house'],
  context: null,
  source: null,
  ...over,
})

test('learningWords keeps Learning words of the language, soonest due first', () => {
  const later = word({ id: 'a', review: { ...answer(word(), 0, 3), due: 5000 } })
  const items: SavedItem[] = [
    later,
    word({ id: 'b', createdAt: 100 }),
    word({ id: 'c', stage: 'KNOWN' }),
    word({ id: 'd', langCode: 'es' }),
  ]
  expect(learningWords(items, 'de').map((w) => w.id)).toEqual(['b', 'a'])
})

test('FSRS: harder grades come back sooner, and a good answer moves the word out', () => {
  const now = Date.UTC(2026, 0, 1)
  const due = preview(word(), now)
  expect(due[1]).toBeLessThan(due[2])
  expect(due[2]).toBeLessThanOrEqual(due[3])
  expect(due[3]).toBeLessThan(due[4])
  expect(due[4] - now).toBeGreaterThanOrEqual(86_400_000)

  // Good, Good: the word leaves the learning steps and is due in days.
  let w = word({ createdAt: now })
  expect(isDue(w, now)).toBe(true)
  w = { ...w, review: answer(w, now, 3) }
  const t = now + 10 * 60_000
  w = { ...w, review: answer(w, t, 3) }
  expect(w.review!.reps).toBe(2)
  expect(w.review!.due - t).toBeGreaterThanOrEqual(86_400_000)
  expect(isDue(w, t)).toBe(false)
  // The state survives a JSON round trip (chrome.storage).
  const stored = JSON.parse(JSON.stringify(w)) as SavedWord
  expect(answer(stored, w.review!.due, 3).due).toBeGreaterThan(w.review!.due)
})

test('formatSpan', () => {
  expect(formatSpan(30_000)).toBe('30s')
  expect(formatSpan(10 * 60_000)).toBe('10m')
  expect(formatSpan(3 * 3_600_000)).toBe('3h')
  expect(formatSpan(5 * 86_400_000)).toBe('5d')
  expect(formatSpan(60 * 86_400_000)).toBe('2mo')
})

test('wordClass colors words by stage and vocabulary level', () => {
  const v: Vocab = {
    stages: new Map([['haus', 'LEARNING']]),
    list: parseWordList("ich 60\nhaus 50\nhafen 40\nthat 30\ns 20\nl' 10\n", ''),
    level: 1,
    showKnownGreen: true,
    showSuggested: true,
    darkenRare: true,
  }
  expect(wordClass('Ich', v)).toBe('KNOWN') // rank 1 <= level
  expect(wordClass('Haus', v)).toBe('LEARNING') // a saved stage wins
  expect(wordClass('Hafen', v)).toBe('SUGGESTED') // just above the level
  expect(wordClass('Kerzenlicht', v)).toBe('RARE') // not in the list
  expect(wordClass('2024', v)).toBe('PLAIN') // no letters
  expect(wordClass("that's", { ...v, level: 5 })).toBe('KNOWN') // parts: that (4), s (5)
  expect(wordClass('l’ich', v)).toBe('SUGGESTED') // parts: l' (6), ich (1)
  expect(wordClass('Ich', { ...v, showKnownGreen: false })).toBe('PLAIN')
  expect(wordClass('Hafen', { ...v, showSuggested: false })).toBe('PLAIN')
  expect(wordClass('Kerzenlicht', { ...v, darkenRare: false })).toBe('PLAIN')
  // No level set: only saved stages show.
  expect(wordClass('Ich', { ...v, level: undefined })).toBe('PLAIN')
  expect(wordClass('Haus', { ...v, level: undefined })).toBe('LEARNING')
})

test('wordClass gives all forms of a word the lemma stage and rank', () => {
  const v: Vocab = {
    stages: new Map([['gehen', 'LEARNING']]),
    // "häuser" + "haus" (3 + 2) rank above "ich" (4).
    list: parseWordList('ich 4\nhäuser 3\nhaus 2\nging 1\n', 'haus\thäuser\ngehen\tging\n'),
    level: 2,
    showKnownGreen: true,
    showSuggested: true,
    darkenRare: true,
  }
  expect(wordClass('Ging', v)).toBe('LEARNING') // the stage of the lemma "gehen"
  expect(wordClass('Häuser', v)).toBe('KNOWN') // rank of "haus" (1) <= level
})

test('parseWordList picks the most frequent lemma for an ambiguous form', () => {
  const list = parseWordList('suis 10\nest 9\nsuivre 2\n', 'être\tsuis\nsuivre\tsuis\nêtre\test\n')
  expect(list.lemmas.get('suis')).toBe('être') // score: être 5 + 9, suivre 5
  expect([...list.ranks.keys()]).toEqual(['être', 'suivre'])
})
