import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import type { WordExtras } from './messages'
import { tokenize, wordKey } from './tokenize'
import type { ReviewCard, SavedItem, SavedWord } from './types'

const scheduler = fsrs({ enable_fuzz: true })

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: Rating.Again, label: 'Again', key: '1' },
  { grade: Rating.Hard, label: 'Hard', key: '2' },
  { grade: Rating.Good, label: 'Good', key: '3' },
  { grade: Rating.Easy, label: 'Easy', key: '4' },
]

/** Cards due a little later still show in a session, so "Again" comes back soon. */
const LEARN_AHEAD_MS = 20 * 60_000

function toCard(r: ReviewCard | undefined, now: number): Card {
  if (!r) return createEmptyCard(now)
  return {
    ...r,
    due: new Date(r.due),
    last_review: r.last_review === undefined ? undefined : new Date(r.last_review),
  }
}

function fromCard(c: Card): ReviewCard {
  const r: ReviewCard = {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
  }
  if (c.last_review) r.last_review = c.last_review.getTime()
  return r
}

/** When the word is due. A new word is due from the time it was saved. */
export const dueAt = (w: SavedWord): number => w.review?.due ?? w.createdAt

/** Words in the Learning stage of `lang`, soonest due first. */
export function learningWords(items: SavedItem[], lang: string): SavedWord[] {
  return items
    .filter((i): i is SavedWord => i.itemType === 'WORD' && i.stage === 'LEARNING')
    .filter((w) => w.langCode === lang)
    .sort((a, b) => dueAt(a) - dueAt(b))
}

export const isDue = (w: SavedWord, now: number) => dueAt(w) <= now + LEARN_AHEAD_MS

/** Due time for each grade, to show on the buttons. */
export function preview(w: SavedWord, now: number): Record<Grade, number> {
  const log = scheduler.repeat(toCard(w.review, now), now)
  const out = {} as Record<Grade, number>
  for (const { grade } of GRADES) out[grade] = log[grade].card.due.getTime()
  return out
}

/** New review state after the user answers with `grade`. */
export function answer(w: SavedWord, now: number, grade: Grade): ReviewCard {
  return fromCard(scheduler.next(toCard(w.review, now), now, grade).card)
}

/** Short time span: `45s`, `10m`, `3h`, `5d`, `2mo`, `1.5y`. */
export function formatSpan(ms: number): string {
  const min = ms / 60_000
  if (min < 1) return `${Math.max(0, Math.round(ms / 1000))}s`
  if (min < 60) return `${Math.round(min)}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)}d`
  if (d < 365) return `${Math.round(d / 30)}mo`
  return `${Math.round((d / 365) * 10) / 10}y`
}

/** True when the review card still needs something from the AI. */
export const needsExtras = (w: SavedWord) =>
  !w.translations.length || (!!w.context && !w.context.translation) || (w.examples?.length ?? 0) < 2

/** The fields of `w` that the AI answer `r` fills. Fields the word has already stay. */
export function extrasPatch(w: SavedWord, r: WordExtras): Partial<SavedWord> {
  const p: Partial<SavedWord> = {}
  if (!w.translations.length && r.translations.length) p.translations = r.translations
  if (w.context && !w.context.translation && r.sentence) {
    p.context = { ...w.context, translation: r.sentence }
  }
  if ((w.examples?.length ?? 0) < 2 && r.examples.length) p.examples = r.examples
  return p
}

/** Adds the new translations and examples of `r` to those of `w`, without repeats. */
export function morePatch(w: SavedWord, r: WordExtras): Partial<SavedWord> {
  const add = <T>(have: T[], next: T[], key: (x: T) => string) => {
    const seen = new Set(have.map(key))
    return [...have, ...next.filter((x) => !seen.has(key(x)) && seen.add(key(x)))]
  }
  return {
    ...extrasPatch(w, r),
    translations: add(w.translations, r.translations, (t) => t.toLowerCase()),
    examples: add(w.examples ?? [], r.examples, (e) => e.sentence.toLowerCase()),
  }
}

/**
 * A sentence in parts, with the reviewed word marked. AI examples mark it with `*`; other
 * sentences match the word as written.
 */
export function sentenceParts(
  sentence: string,
  word: string,
  lang: string,
): { text: string; hit: boolean }[] {
  if (/\*[^*]+\*/.test(sentence)) {
    return sentence
      .split(/\*([^*]+)\*/)
      .map((text, i) => ({ text, hit: i % 2 === 1 }))
      .filter((p) => p.text)
  }
  return tokenize(sentence, lang).map((t) => ({
    text: t.text,
    hit: t.isWord && wordKey(t.text) === wordKey(word),
  }))
}
