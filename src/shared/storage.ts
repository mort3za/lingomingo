import { mergeItems, type Deleted, type ItemsData } from './sync'
import { wordKey } from './tokenize'
import {
  DEFAULT_SETTINGS,
  type ReviewCard,
  type SavedItem,
  type SavedWord,
  type Settings,
} from './types'

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings')
  const s = { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings> | undefined) }
  // The old voice 'auto' is gone: use the browser voice.
  if ((s.voice as string) === 'auto') s.voice = 'browser'
  return s
}

/** `at`: time of the change, for the Drive sync. A change from another device keeps its time. */
export function patchSettings(patch: Partial<Settings>, at = Date.now()): Promise<void> {
  return serial(async () => {
    await chrome.storage.local.set({
      settings: { ...(await getSettings()), ...patch },
      settingsAt: at,
    })
  })
}

/** Time of the last settings change. 0: never changed (new install). */
export async function getSettingsAt(): Promise<number> {
  const { settingsAt } = await chrome.storage.local.get('settingsAt')
  return (settingsAt as number | undefined) ?? 0
}

export async function getSavedItems(): Promise<SavedItem[]> {
  const { savedItems } = await chrome.storage.local.get('savedItems')
  return (savedItems as SavedItem[] | undefined) ?? []
}

async function setSavedItems(items: SavedItem[]): Promise<void> {
  await chrome.storage.local.set({ savedItems: items })
}

async function getDeleted(): Promise<Deleted> {
  const { deletedItems } = await chrome.storage.local.get('deletedItems')
  return (deletedItems as Deleted | undefined) ?? {}
}

/** Saved items and the ids deleted on this device, for sync and backup. */
export async function getItemsData(): Promise<ItemsData> {
  const [items, deleted] = await Promise.all([getSavedItems(), getDeleted()])
  return { items, deleted }
}

/** Join `other` (a backup file, the sync file) into the saved items here. Returns the result. */
export function mergeIntoLocal(other: ItemsData): Promise<ItemsData> {
  return serial(async () => {
    const local = await getItemsData()
    const merged = mergeItems(local, other)
    const patch: Record<string, unknown> = {}
    if (JSON.stringify(merged.items) !== JSON.stringify(local.items))
      patch.savedItems = merged.items
    if (JSON.stringify(merged.deleted) !== JSON.stringify(local.deleted)) {
      patch.deletedItems = merged.deleted
    }
    if (Object.keys(patch).length) await chrome.storage.local.set(patch)
    return merged
  })
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

/** An AI example saved as a sentence: no subtitle time of its own, so the text is the id. */
export function examplePhraseId(lang: string, text: string): string {
  return `p:${lang}:example:${text}`
}

/** Add an item, or replace the one with the same id (keeps the first `createdAt`). */
export function upsertItem(item: SavedItem): Promise<void> {
  return serial(async () => {
    const items = await getSavedItems()
    const i = items.findIndex((x) => x.id === item.id)
    if (i === -1) items.push(item)
    else items[i] = { ...item, createdAt: items[i]!.createdAt }
    await setSavedItems(items)
    // Saved again after a delete.
    const deleted = await getDeleted()
    if (item.id in deleted) {
      delete deleted[item.id]
      await chrome.storage.local.set({ deletedItems: deleted })
    }
  })
}

export function removeItems(ids: string[]): Promise<void> {
  const drop = new Set(ids)
  const now = Date.now()
  return serial(async () => {
    const { items, deleted } = await getItemsData()
    for (const id of ids) deleted[id] = now
    await chrome.storage.local.set({
      savedItems: items.filter((x) => !drop.has(x.id)),
      deletedItems: deleted,
    })
  })
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

/** `review` undefined = new card again (for undo). */
export function setReview(id: string, review: ReviewCard | undefined): Promise<void> {
  const now = Date.now()
  return serial(async () =>
    setSavedItems(
      (await getSavedItems()).map((x) =>
        x.id === id && x.itemType === 'WORD' ? { ...x, review, updatedAt: now } : x,
      ),
    ),
  )
}

/** Add fields to saved words, by id. `updatedAt` does not change: the user did not edit them. */
export function patchWords(patches: Record<string, Partial<SavedWord>>): Promise<void> {
  return serial(async () =>
    setSavedItems(
      (await getSavedItems()).map((x) =>
        patches[x.id] && x.itemType === 'WORD' ? { ...x, ...patches[x.id] } : x,
      ),
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
