import { expect, test } from 'bun:test'
import { parseWordAnswer } from './llm'

test('parseWordAnswer reads the translations and the expression', () => {
  const answer =
    '{"translations":["gave"],"phrase":{"text":" aufgeben ","translation":"to give up"}}'
  expect(parseWordAnswer(answer, 'gab')).toEqual({
    translations: ['gave'],
    phrase: { text: 'aufgeben', translation: 'to give up' },
  })
})

test('parseWordAnswer: no "phrase" (a small model) gives null', () => {
  expect(parseWordAnswer('{"translations":["house","home"]}', 'Haus')).toEqual({
    translations: ['house', 'home'],
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

test('parseWordAnswer: no translations is an error', () => {
  expect(() => parseWordAnswer('{"phrase":null}', 'Haus')).toThrow('Bad answer from model.')
})
