import type { Example } from './types'

/** Messages sent from content scripts / pages to the background service worker. */
export type Request =
  | {
      type: 'translate-word'
      word: string
      sentence: string
      /** Subtitle lines around the sentence: a sentence can run across several lines. */
      before?: string
      after?: string
      studyLang: string
      nativeLang: string
    }
  | {
      type: 'word-extras'
      /**
       * `sentence` = where the word was saved, if known. `have` = what the learner has
       * already, to get more translations and examples without repeats.
       */
      words: { word: string; sentence: string | null; have?: Have }[]
      studyLang: string
      nativeLang: string
      /** New examples per word without `have`. Default 2. */
      examples?: number
    }
  | { type: 'speak'; text: string; lang: string }
  /** Subtitle lines without the cache, to test the AI provider. */
  | { type: 'translate-lines'; lines: string[]; studyLang: string; nativeLang: string }

export interface Have {
  translations: string[]
  examples: string[]
}

/** A multi-word expression and its translation. */
export interface Phrase {
  text: string
  translation: string
}

/** Dictionary facts of a word. null = unknown, not for this word, or the model left it out. */
export interface WordInfo {
  /** The noun with its article, like "die Arbeit". Only in study languages with articles. */
  headword: string | null
  /** The plural with its article, like "die Arbeiten". */
  plural: string | null
  /** Pronunciation of the dictionary form in IPA, without slashes. */
  ipa: string | null
}

export interface WordTranslation extends WordInfo {
  translations: string[]
  /** The expression the word is part of in the sentence. null = none, or the model left it out. */
  phrase: Phrase | null
}

/** What the review card needs for one word. */
export interface WordExtras {
  translations: string[]
  /** Translation of the word's sentence. */
  sentence: string | null
  examples: Example[]
}

export type Response<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ResponseMap {
  'translate-word': WordTranslation
  /** Same order as `words`. null = the model left the word out. */
  'word-extras': (WordExtras | null)[]
  /** Base64 audio. null = no AI voice: use a browser voice. */
  speak: string | null
  'translate-lines': string[]
}

export async function send<R extends Request>(req: R): Promise<ResponseMap[R['type']]> {
  const res = (await chrome.runtime.sendMessage(req)) as
    Response<ResponseMap[R['type']]> | undefined
  if (!res) throw new Error('No answer from background')
  if (!res.ok) throw new Error(res.error)
  return res.data
}

/** Subtitle lines to translate. Sent on a port named `CHUNK_PORT`, one port per chunk. */
export interface ChunkRequest {
  videoId: string
  studyLang: string
  nativeLang: string
  chunk: number
  lines: string[]
}

/** Answers on the chunk port: each line as soon as the model writes it, then all lines. */
export type ChunkMessage =
  | { type: 'line'; index: number; text: string }
  | { type: 'done'; lines: string[] }
  | { type: 'error'; error: string }

export const CHUNK_PORT = 'translate-chunk'

/**
 * Translate a chunk of subtitle lines and get each line while the model writes it.
 * `cancel()` closes the port, and the background then stops the request.
 */
export function translateChunk(
  req: ChunkRequest,
  onLine: (index: number, text: string) => void,
): { done: Promise<string[]>; cancel: () => void } {
  const port = chrome.runtime.connect({ name: CHUNK_PORT })
  let cancel = () => {}
  const done = new Promise<string[]>((resolve, reject) => {
    cancel = () => {
      reject(new Error('Cancelled'))
      port.disconnect()
    }
    port.onMessage.addListener((msg: ChunkMessage) => {
      if (msg.type === 'line') return onLine(msg.index, msg.text)
      port.disconnect()
      if (msg.type === 'done') resolve(msg.lines)
      else reject(new Error(msg.error))
    })
    port.onDisconnect.addListener(() => reject(new Error('No answer from background')))
  })
  port.postMessage(req)
  return { done, cancel }
}
