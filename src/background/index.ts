import {
  CHUNK_PORT,
  type ChunkMessage,
  type ChunkRequest,
  type Request,
  type Response,
} from '@/shared/messages'
import { getSettings } from '@/shared/storage'
import { translateLines, translateWord, wordExtras } from './llm'

const APP_URL = chrome.runtime.getURL('src/app/index.html')

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: APP_URL })
})

chrome.runtime.onInstalled.addListener(({ reason }) => {
  // First install: walk the user through the initial setup.
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: `${APP_URL}#/setup` })
  }
})

async function handle(req: Request): Promise<unknown> {
  const settings = await getSettings()
  if (req.type === 'word-extras') {
    return wordExtras(settings, req.words, req.studyLang, req.nativeLang)
  }
  return translateWord(settings, req.word, req.sentence, req.studyLang, req.nativeLang)
}

async function translateChunk(
  req: ChunkRequest,
  signal: AbortSignal,
  onLine: (index: number, text: string) => void,
): Promise<string[]> {
  const settings = await getSettings()
  // Translations of a video are cached by chunk for 7 days, so a reload costs nothing.
  // `v2`: lines translated before the line copy check can be in the wrong place.
  const key = `tr:v2:${req.videoId}:${req.studyLang}:${req.nativeLang}:${req.chunk}`
  const cached = (await chrome.storage.local.get(key))[key] as CachedChunk | undefined
  if (fresh(cached) && cached.lines.length === req.lines.length) return cached.lines
  const out = await translateLines(
    settings,
    req.lines,
    req.studyLang,
    req.nativeLang,
    signal,
    onLine,
  )
  await chrome.storage.local.set({ [key]: { lines: out, at: Date.now() } satisfies CachedChunk })
  return out
}

const TRANSLATION_TTL = 7 * 86400_000

interface CachedChunk {
  lines: string[]
  at: number
}

// Entries from before the TTL are plain arrays (no `at`): they count as old.
const fresh = (c: CachedChunk | undefined): c is CachedChunk =>
  !!c && Date.now() - c.at < TRANSLATION_TTL

/** Remove cached translations and captions (`cues:`, from the content script) older than 7 days. */
async function pruneTranslations() {
  const all = await chrome.storage.local.get(null)
  const old = Object.keys(all).filter(
    (k) => (k.startsWith('tr:') || k.startsWith('cues:')) && !fresh(all[k] as CachedChunk),
  )
  if (old.length) await chrome.storage.local.remove(old)
}

chrome.runtime.onStartup.addListener(() => void pruneTranslations())
chrome.runtime.onInstalled.addListener(() => void pruneTranslations())

chrome.runtime.onMessage.addListener((req: Request, _sender, sendResponse) => {
  handle(req).then(
    (data) => sendResponse({ ok: true, data } satisfies Response<unknown>),
    (e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
  )
  return true // answer is async
})

// A port per chunk: lines go back while the model writes them. When the page closes the port
// (tab closed, reload, other video), the request stops, so a local model does not keep working.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CHUNK_PORT) return
  const ctrl = new AbortController()
  port.onDisconnect.addListener(() => ctrl.abort())
  const post = (msg: ChunkMessage) => {
    if (!ctrl.signal.aborted) port.postMessage(msg)
  }
  port.onMessage.addListener((req: ChunkRequest) => {
    translateChunk(req, ctrl.signal, (index, text) => post({ type: 'line', index, text })).then(
      (lines) => post({ type: 'done', lines }),
      (e: unknown) => post({ type: 'error', error: e instanceof Error ? e.message : String(e) }),
    )
  })
})
