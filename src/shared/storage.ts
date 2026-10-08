import { wordKey } from './tokenize'
import { DEFAULT_SETTINGS, type SavedItem, type Settings } from './types'

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings')
  return { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings> | undefined) }
}

export function patchSettings(patch: Partial<Settings>): Promise<void> {
  return serial(async () => {
    await chrome.storage.local.set({ settings: { ...(await getSettings()), ...patch } })
  })
}

export async function getSavedItems(): Promise<SavedItem[]> {
  const { savedItems } = await chrome.storage.local.get('savedItems')
  return (savedItems as SavedItem[] | undefined) ?? []
}

async function setSavedItems(items: SavedItem[]): Promise<void> {
  await chrome.storage.local.set({ savedItems: items })
}

// Run read-modify-write updates one after another, so fast clicks do not lose a change.
let queue: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

export function wordId(lang: string, text: string): string {
  return `w:${lang}:${wordKey(text)}`
}

export function phraseId(lang: string, videoId: string, startMs: number): string {
  return `p:${lang}:${videoId}:${startMs}`
}

/** Add an item, or replace the one with the same id (keeps the first `createdAt`). */
export function upsertItem(item: SavedItem): Promise<void> {
  return serial(async () => {
    const items = await getSavedItems()
    const i = items.findIndex((x) => x.id === item.id)
    if (i === -1) items.push(item)
    else items[i] = { ...item, createdAt: items[i]!.createdAt }
    await setSavedItems(items)
  })
}

export function removeItems(ids: string[]): Promise<void> {
  const drop = new Set(ids)
  return serial(async () => setSavedItems((await getSavedItems()).filter((x) => !drop.has(x.id))))
}

export function setStage(ids: string[], stage: SavedItem['stage']): Promise<void> {
  const pick = new Set(ids)
  const now = Date.now()
  return serial(async () =>
    setSavedItems(
      (await getSavedItems()).map((x) => (pick.has(x.id) ? { ...x, stage, updatedAt: now } : x)),
    ),
  )
}

/** Call `fn` when `key` changes in storage. Returns the stop function. */
export function onStorageKey(key: string, fn: () => void): () => void {
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area === 'local' && key in changes) fn()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
