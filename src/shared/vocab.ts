import { wordKey } from './tokenize'
import type { Settings, Stage } from './types'

/**
 * Study languages that have a frequency list in public/freq/ (made by scripts/freq-lists.ts).
 * Japanese is missing: the source list splits words into single characters.
 */
export const LEVEL_LANGS = [
  'ar',
  'zh',
  'nl',
  'en',
  'fa',
  'fr',
  'de',
  'it',
  'ko',
  'pl',
  'pt',
  'ru',
  'es',
  'sv',
  'tr',
]

/**
 * Study languages with a lemma list: all forms of a word ("gehe", "ging", "gegangen") share
 * one rank and one saved stage.
 */
export const LEMMA_LANGS = ['de', 'en', 'es', 'fr', 'it', 'pt', 'ru', 'sv']

/** Rows of the "Set vocabulary level" dialog. Each row is a frequency rank. */
export const LEVEL_ROWS = [
  0, 100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 10000, 15000, 20000,
]

/** Words up to this many ranks above the level are suggested to learn next. */
const SUGGEST_WINDOW = 1000
/** Words more than this many ranks above the level, or not in the list, are rare. */
const RARE_GAP = 5000

/** How a word looks. KNOWN is green: a saved Known word, or a word below the level. */
export type WordClass = Stage | 'SUGGESTED' | 'RARE' | 'PLAIN'

export const WORD_STYLE: Record<WordClass, string> = {
  KNOWN: 'text-emerald-300',
  LEARNING: 'text-orange-300 outline outline-1 outline-orange-300/70',
  SKIPPED: 'text-violet-300/60',
  SUGGESTED: 'text-orange-200',
  RARE: 'text-fg/45',
  PLAIN: '',
}

export interface WordList {
  /** Frequency rank (1 = most frequent), by word key (the lemma, if the language has lemmas). */
  ranks: Map<string, number>
  /** Lemma of a word form, by word key. Empty if the language has no lemma list. */
  lemmas: Map<string, string>
}

/** Key of the word family: the lemma ("ging" → "gehen"), or the word key. */
export function lemmaOf(word: string, lemmas?: Map<string, string>): string {
  const key = wordKey(word)
  return lemmas?.get(key) ?? key
}

export interface Vocab extends Pick<Settings, 'showKnownGreen' | 'showSuggested' | 'darkenRare'> {
  /** Saved word stages, by lemmaOf(word). */
  stages: Map<string, Stage>
  /** Null: no list for this language, or not loaded yet. */
  list: WordList | null
  /** Undefined: the user did not set a level for this language. */
  level: number | undefined
}

export function wordClass(word: string, v: Vocab): WordClass {
  const stage = v.stages.get(lemmaOf(word, v.list?.lemmas))
  if (stage === 'KNOWN') return v.showKnownGreen ? 'KNOWN' : 'PLAIN'
  if (stage) return stage
  if (!v.list || v.level === undefined) return 'PLAIN'
  const rank = rankOf(word, v.list)
  // Numbers and other words without letters.
  if (rank === undefined && !/\p{L}/u.test(word)) return 'PLAIN'
  if (rank !== undefined && rank <= v.level) return v.showKnownGreen ? 'KNOWN' : 'PLAIN'
  if (rank !== undefined && rank <= v.level + SUGGEST_WINDOW) {
    return v.showSuggested ? 'SUGGESTED' : 'PLAIN'
  }
  if (rank === undefined || rank > v.level + RARE_GAP) return v.darkenRare ? 'RARE' : 'PLAIN'
  return 'PLAIN'
}

function rankOf(word: string, { ranks, lemmas }: WordList): number | undefined {
  const rank = ranks.get(lemmaOf(word, lemmas))
  if (rank !== undefined || !/['’]/.test(word)) return rank
  // The lists split contractions ("that's" → "that", "s"; "l'homme" → "l'", "homme"):
  // use the rarest part.
  let max: number | undefined
  for (const part of wordKey(word).split(/['’]/).filter(Boolean)) {
    const r = ranks.get(lemmaOf(part, lemmas)) ?? ranks.get(part + "'")
    if (r === undefined) return undefined
    max = Math.max(max ?? 0, r)
  }
  return max
}

/**
 * Join a frequency file ("word count" lines) and a lemma file ("lemma<TAB>form" lines, may be
 * empty). The two sources have licenses that do not mix, so we join them here, not at build time.
 * A form with more than one lemma (French "suis": être or suivre) gets the lemma whose forms
 * are the most frequent. A lemma is ranked by the counts of all its forms.
 */
export function parseWordList(freqText: string, lemmaText: string): WordList {
  const counts = new Map<string, number>()
  for (const line of freqText.split('\n')) {
    const [word, n] = line.split(' ')
    if (word && n) counts.set(word, Number(n))
  }

  const options = new Map<string, Set<string>>()
  const lemmaSet = new Set<string>()
  for (const line of lemmaText.split('\n')) {
    const [lemma, form] = line.split('\t')
    if (!lemma || !form) continue
    lemmaSet.add(lemma)
    if (!options.has(form)) options.set(form, new Set())
    options.get(form)!.add(lemma)
  }
  // A form that is also a lemma can stay as it is.
  for (const [form, set] of options) if (lemmaSet.has(form)) set.add(form)

  // Score of a lemma: the counts of its forms. A form with n options gives 1/n to each.
  const score = new Map<string, number>()
  for (const [form, set] of options) {
    const n = (counts.get(form) ?? 0) / set.size
    for (const lemma of set) score.set(lemma, (score.get(lemma) ?? 0) + n)
  }
  const lemmas = new Map<string, string>()
  for (const [form, set] of options) {
    const best = [...set].reduce((a, b) => ((score.get(b) ?? 0) > (score.get(a) ?? 0) ? b : a))
    if (best !== form) lemmas.set(form, best)
  }

  const total = new Map<string, number>()
  for (const [form, n] of counts) {
    const word = lemmas.get(form) ?? form
    total.set(word, (total.get(word) ?? 0) + n)
  }
  const ranked = [...total].sort((a, b) => b[1] - a[1])
  return { ranks: new Map(ranked.map(([w], i) => [w, i + 1])), lemmas }
}

async function readFile(name: string): Promise<string> {
  const res = await fetch(chrome.runtime.getURL(`freq/${name}.txt`))
  if (!res.ok) throw new Error(`Could not load ${name}.txt`)
  return res.text()
}

const cache = new Map<string, Promise<WordList | null>>()

/** The word list of a language, or null if it has none. */
export function loadWordList(lang: string): Promise<WordList | null> {
  if (!LEVEL_LANGS.includes(lang)) return Promise.resolve(null)
  let list = cache.get(lang)
  if (!list) {
    list = Promise.all([
      readFile(lang),
      LEMMA_LANGS.includes(lang) ? readFile(`${lang}-lemmas`) : '',
    ]).then(([freq, lemmas]) => parseWordList(freq, lemmas))
    // Do not keep a failed load, so the next call tries again.
    list.catch(() => cache.delete(lang))
    cache.set(lang, list)
  }
  return list
}
