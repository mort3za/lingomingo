export interface Token {
  text: string
  isWord: boolean
}

export function tokenize(text: string, lang: string): Token[] {
  const seg = new Intl.Segmenter(lang, { granularity: 'word' })
  return [...seg.segment(text)].map((s) => ({ text: s.segment, isWord: !!s.isWordLike }))
}

/** Key used to match a word with saved words. */
export function wordKey(text: string): string {
  return text.toLocaleLowerCase()
}
