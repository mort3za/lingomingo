/**
 * Keys for the word hints (E), as in Vimium: one letter from the left hand for each word. Not E:
 * E hides the hints.
 */
const HINT_KEYS = 'QWRTASDFGZXCVB'
/** With more words than `HINT_KEYS`: two letters from the right hand, so no hint starts another. */
const HINT_PAIR_KEYS = 'YUIOPHJKLNM'

export function hintLabels(count: number): string[] {
  const pairs = [...HINT_PAIR_KEYS].flatMap((a) => [...HINT_PAIR_KEYS].map((b) => a + b))
  return [...HINT_KEYS, ...pairs].slice(0, count)
}
