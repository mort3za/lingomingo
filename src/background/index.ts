import type { Request, Response } from '@/shared/messages'
import { getSettings } from '@/shared/storage'
import { translateLines, translateWord } from './llm'

const APP_URL = chrome.runtime.getURL('src/app/index.html')
const READ_MENU_ID = 'read-in-lingomingo'
const OPEN_MENU_ID = 'open-lingomingo'

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: APP_URL })
})

chrome.runtime.onInstalled.addListener(({ reason }) => {
  // First install: walk the user through the initial setup.
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: `${APP_URL}#/setup` })
  }
  chrome.contextMenus.create({
    id: READ_MENU_ID,
    title: 'Read in LingoMingo',
    contexts: ['page', 'selection'],
  })
  // Right-click menu of the toolbar button.
  chrome.contextMenus.create({
    id: OPEN_MENU_ID,
    title: 'Open LingoMingo',
    contexts: ['action'],
  })
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === OPEN_MENU_ID) {
    chrome.tabs.create({ url: APP_URL })
    return
  }
  if (info.menuItemId !== READ_MENU_ID || !info.pageUrl) return
  const url = `${APP_URL}#/reader?url=${encodeURIComponent(info.pageUrl)}`
  chrome.tabs.create({ url })
})

async function handle(req: Request): Promise<string[]> {
  const settings = await getSettings()
  if (req.type === 'translate-word') {
    return translateWord(settings, req.word, req.sentence, req.studyLang, req.nativeLang)
  }
  // Translations of a video are cached by chunk for 7 days, so a reload costs nothing.
  const key = `tr:${req.videoId}:${req.studyLang}:${req.nativeLang}:${req.chunk}`
  const cached = (await chrome.storage.local.get(key))[key] as CachedChunk | undefined
  if (fresh(cached) && cached.lines.length === req.lines.length) return cached.lines
  const out = await translateLines(settings, req.lines, req.studyLang, req.nativeLang)
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

/** Remove cached translations older than 7 days. */
async function pruneTranslations() {
  const all = await chrome.storage.local.get(null)
  const old = Object.keys(all).filter((k) => k.startsWith('tr:') && !fresh(all[k] as CachedChunk))
  if (old.length) await chrome.storage.local.remove(old)
}

chrome.runtime.onStartup.addListener(() => void pruneTranslations())
chrome.runtime.onInstalled.addListener(() => void pruneTranslations())

chrome.runtime.onMessage.addListener((req: Request, _sender, sendResponse) => {
  handle(req).then(
    (data) => sendResponse({ ok: true, data } satisfies Response<string[]>),
    (e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
  )
  return true // answer is async
})
