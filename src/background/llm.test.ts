import { expect, test } from 'bun:test'
import { parseWordAnswer } from './llm'

test('parseWordAnswer reads the translations and the expression', () => {
  const answer =
    '{"translations":["gave"],"phrase":{"text":" aufgeben ","translation":"to give up"}}'
  expect(parseWordAnswer(answer, 'gab')).toEqual({
    translations: ['gave'],
    headword: null,
    plural: null,
    ipa: null,
    phrase: { text: 'aufgeben', translation: 'to give up' },
  })
})

test('parseWordAnswer: no "phrase" (a small model) gives null', () => {
  expect(parseWordAnswer('{"translations":["house","home"]}', 'Haus')).toEqual({
    translations: ['house', 'home'],
    headword: null,
    plural: null,
    ipa: null,
    phrase: null,
  })
})

test('parseWordAnswer: a bad "phrase" gives null, not an error', () => {
  for (const phrase of [
    '"give up"',
    'null',
    '{"text":"give up"}',
    '{"text":"","translation":"x"}',
  ]) {
    const answer = `{"translations":["give"],"phrase":${phrase}}`
    expect(parseWordAnswer(answer, 'give').phrase).toBeNull()
  }
})

test('parseWordAnswer: an expression that is the word itself gives null', () => {
  const answer = '{"translations":["house"],"phrase":{"text":"haus","translation":"house"}}'
  expect(parseWordAnswer(answer, 'Haus').phrase).toBeNull()
})

test('parseWordAnswer reads the headword, the plural and the IPA', () => {
  const answer =
    '{"translations":["work"],"headword":"die Arbeit","plural":"die Arbeiten","ipa":"/ˈaʁbaɪ̯t/"}'
  expect(parseWordAnswer(answer, 'Arbeiten')).toMatchObject({
    headword: 'die Arbeit',
    plural: 'die Arbeiten',
    ipa: 'ˈaʁbaɪ̯t',
  })
  expect(parseWordAnswer('{"translations":["water"],"headword":"l\'eau"}', 'eau').headword).toBe(
    "l'eau",
  )
})

test('parseWordAnswer: a headword without an article gives null, and then no plural', () => {
  const answer = '{"translations":["to go"],"headword":"gehen","plural":"x","ipa":"[ˈɡeːən]"}'
  expect(parseWordAnswer(answer, 'ging')).toMatchObject({
    headword: null,
    plural: null,
    ipa: 'ˈɡeːən',
  })
})

test('parseWordAnswer: a headword for a word that is not a noun gives null', () => {
  const answer = '{"translations":["call"],"pos":"verb","headword":"der Ruf","plural":"die Rufe"}'
  expect(parseWordAnswer(answer, 'rufe')).toMatchObject({ headword: null, plural: null })
  const noun = '{"translations":["call"],"pos":"Noun","headword":"der Ruf"}'
  expect(parseWordAnswer(noun, 'Ruf').headword).toBe('der Ruf')
})

test('parseWordAnswer: no translations is an error', () => {
  expect(() => parseWordAnswer('{"phrase":null}', 'Haus')).toThrow('Bad answer from model.')
})
