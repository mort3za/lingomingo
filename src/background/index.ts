import type { Request, Response } from '@/shared/messages'
import { getSettings } from '@/shared/storage'
import { translateLines, translateWord } from './llm'

const APP_URL = chrome.runtime.getURL('src/app/index.html')
const READ_MENU_ID = 'read-in-lingomingo'
const OPEN_MENU_ID = 'open-lingomingo'

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: APP_URL })
})

chrome.runtime.onInstalled.addListener(() => {
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
  // Translations of a video are cached by chunk, so a reload costs nothing.
  const key = `tr:${req.videoId}:${req.studyLang}:${req.nativeLang}:${req.chunk}`
  const cached = (await chrome.storage.local.get(key))[key] as string[] | undefined
  if (cached?.length === req.lines.length) return cached
  const out = await translateLines(settings, req.lines, req.studyLang, req.nativeLang)
  await chrome.storage.local.set({ [key]: out })
  return out
}

chrome.runtime.onMessage.addListener((req: Request, _sender, sendResponse) => {
  handle(req).then(
    (data) => sendResponse({ ok: true, data } satisfies Response<string[]>),
    (e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
  )
  return true // answer is async
})
