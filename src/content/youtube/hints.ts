/** Keys for the word hints (Shift+F), as in Vimium. */
export const HINT_KEYS = 'QWERTYUIOPXCVBNM'

/** One letter for each word. With more words than letters, two letters for each word. */
export function hintLabels(count: number): string[] {
  const keys = [...HINT_KEYS]
  if (count <= keys.length) return keys.slice(0, count)
  return keys.flatMap((a) => keys.map((b) => a + b)).slice(0, count)
}
