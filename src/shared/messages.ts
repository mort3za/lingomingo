/** Messages sent from content scripts / pages to the background service worker. */
export type Request = {
  type: 'translate-word'
  word: string
  sentence: string
  studyLang: string
  nativeLang: string
}

export type Response<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ResponseMap {
  'translate-word': string[]
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
