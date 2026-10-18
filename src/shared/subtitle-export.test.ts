import { expect, test } from 'bun:test'
import { toSrt, toSubtitleCsv, toVtt, type SubtitleLine } from './subtitle-export'

const lines: SubtitleLine[] = [
  { start: 1.5, end: 3.25, text: 'Hola, "amigo"', translation: 'Hi, "friend"' },
  { start: 3661.001, end: 3662, text: 'Adiós', translation: null },
]

test('toSrt numbers the cues and uses a comma before the milliseconds', () => {
  expect(toSrt(lines, 'original')).toBe(
    '1\n00:00:01,500 --> 00:00:03,250\nHola, "amigo"\n\n' +
      '2\n01:01:01,001 --> 01:01:02,000\nAdiós\n',
  )
})

test('toSrt leaves out cues with no text and numbers the rest again', () => {
  const out = toSrt([lines[1]!, lines[0]!], 'translation')
  expect(out).toBe('1\n00:00:01,500 --> 00:00:03,250\nHi, "friend"\n')
})

test('toVtt starts with WEBVTT and uses a dot before the milliseconds', () => {
  expect(toVtt(lines, 'original')).toBe(
    'WEBVTT\n\n00:00:01.500 --> 00:00:03.250\nHola, "amigo"\n\n' +
      '01:01:01.001 --> 01:01:02.000\nAdiós\n',
  )
})

test('an empty line in a cue text does not end the cue', () => {
  const out = toVtt([{ start: 0, end: 1, text: 'a\n\nb', translation: null }], 'original')
  expect(out).toBe('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\na\nb\n')
})

test('toSubtitleCsv has one text column and escapes quotes and commas', () => {
  expect(toSubtitleCsv(lines, 'translation').split('\n')).toEqual([
    'Start,End,Text',
    '00:00:01.500,00:00:03.250,"Hi, ""friend"""',
    '01:01:01.001,01:01:02.000,',
  ])
})
