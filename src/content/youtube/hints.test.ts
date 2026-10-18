import { expect, test } from 'bun:test'
import { hintLabels } from './hints'

test('hintLabels gives one letter while the letters are enough', () => {
  expect(hintLabels(3)).toEqual(['Q', 'W', 'E'])
  expect(hintLabels(16).at(-1)).toBe('M')
})

test('hintLabels gives two letters to all words when there are more words than letters', () => {
  const labels = hintLabels(17)
  expect(labels.slice(0, 3)).toEqual(['QQ', 'QW', 'QE'])
  expect(labels).toHaveLength(17)
  expect(new Set(labels).size).toBe(17)
})
