/** Messages sent from content scripts / pages to the background service worker. */
export type Request =
  | {
      type: 'translate-chunk'
      videoId: string
      studyLang: string
      nativeLang: string
      chunk: number
      lines: string[]
    }
  | {
      type: 'translate-word'
      word: string
      sentence: string
      studyLang: string
      nativeLang: string
    }

export type Response<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ResponseMap {
  'translate-chunk': string[]
  'translate-word': string[]
}

export async function send<R extends Request>(req: R): Promise<ResponseMap[R['type']]> {
  const res = (await chrome.runtime.sendMessage(req)) as
    Response<ResponseMap[R['type']]> | undefined
  if (!res) throw new Error('No answer from background')
  if (!res.ok) throw new Error(res.error)
  return res.data
}
