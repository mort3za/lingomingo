import { expect, test } from 'bun:test'
import { hintLabels } from './hints'

test('hintLabels gives one left-hand letter while the letters are enough', () => {
  expect(hintLabels(3)).toEqual(['Q', 'W', 'R'])
  expect(hintLabels(14).at(-1)).toBe('B')
})

test('hintLabels gives two right-hand letters to the words after the single letters', () => {
  const labels = hintLabels(17)
  expect(labels.slice(0, 14).every((l) => l.length === 1)).toBe(true)
  expect(labels.slice(14)).toEqual(['YY', 'YU', 'YI'])
  expect(new Set(labels).size).toBe(17)
  // No hint is the start of another one.
  expect(labels.some((a) => labels.some((b) => a !== b && b.startsWith(a)))).toBe(false)
})
