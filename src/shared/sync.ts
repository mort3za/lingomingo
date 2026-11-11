import { DEFAULT_SETTINGS, SECRET_KEYS, type SavedItem, type Settings } from './types'

/** Deleted saved items: id → time of the delete. Another device must not bring them back. */
export type Deleted = Record<string, number>

/** Saved items of one device, or of the sync file. */
export interface ItemsData {
  items: SavedItem[]
  deleted: Deleted
}

/** Tombstones older than this are dropped: all devices have synced since then. */
export const TOMBSTONE_TTL = 365 * 86400_000

/**
 * Join two copies of the saved items. Per id, the newer `updatedAt` wins. With the same
 * `updatedAt`, the fields of both are kept (AI-filled fields do not change `updatedAt`), `a` wins.
 * An item deleted after its last change stays deleted.
 */
export function mergeItems(a: ItemsData, b: ItemsData, now = Date.now()): ItemsData {
  const deleted: Deleted = {}
  for (const src of [b.deleted, a.deleted]) {
    for (const [id, at] of Object.entries(src)) {
      if (now - at < TOMBSTONE_TTL) deleted[id] = Math.max(deleted[id] ?? 0, at)
    }
  }
  const byId = new Map<string, SavedItem>()
  for (const item of b.items) byId.set(item.id, item)
  for (const item of a.items) {
    const other = byId.get(item.id)
    if (!other) byId.set(item.id, item)
    else {
      const win =
        item.updatedAt > other.updatedAt
          ? item
          : item.updatedAt < other.updatedAt
            ? other
            : ({ ...other, ...item } as SavedItem)
      byId.set(item.id, { ...win, createdAt: Math.min(item.createdAt, other.createdAt) })
    }
  }
  // `a` order first, so a merge with nothing new keeps the list as it is.
  const order = [...new Set([...a.items.map((x) => x.id), ...b.items.map((x) => x.id)])]
  const items: SavedItem[] = []
  for (const id of order) {
    const item = byId.get(id)!
    if ((deleted[id] ?? -1) >= item.updatedAt) continue
    delete deleted[id]
    items.push(item)
  }
  return { items, deleted }
}

/** Settings without the API keys. */
export function withoutSecrets(s: Partial<Settings>): Partial<Settings> {
  const out = { ...s }
  for (const k of SECRET_KEYS) delete out[k]
  return out
}

/** Backup file: saved items, deleted ids, and the settings (API keys only with `syncKeys`). */
export interface Backup {
  app: 'lingomingo'
  version: 1
  exportedAt: number
  settings: Partial<Settings>
  items: SavedItem[]
  deleted: Deleted
}

export function makeBackup(settings: Settings, data: ItemsData, now = Date.now()): Backup {
  return {
    app: 'lingomingo',
    version: 1,
    exportedAt: now,
    settings: settings.syncKeys ? settings : withoutSecrets(settings),
    items: data.items,
    deleted: data.deleted,
  }
}

/**
 * Read a backup file. Also takes the "Export JSON" file of the Saved page (a plain list).
 * Throws when the text is not one of these.
 */
export function parseBackup(text: string): Omit<Backup, 'exportedAt'> {
  const json: unknown = JSON.parse(text)
  if (Array.isArray(json)) {
    if (!json.every(isItem)) throw new Error('not a LingoMingo file')
    return { app: 'lingomingo', version: 1, settings: {}, items: json, deleted: {} }
  }
  const b = json as Partial<Backup> | null
  if (b?.app !== 'lingomingo' || !Array.isArray(b.items) || !b.items.every(isItem)) {
    throw new Error('not a LingoMingo file')
  }
  return {
    app: 'lingomingo',
    version: 1,
    settings: knownSettings(b.settings ?? {}),
    items: b.items,
    deleted: b.deleted ?? {},
  }
}

function isItem(x: unknown): x is SavedItem {
  const i = x as Partial<SavedItem> | null
  return (
    typeof i?.id === 'string' &&
    (i.itemType === 'WORD' || i.itemType === 'PHRASE') &&
    typeof i.updatedAt === 'number' &&
    typeof i.createdAt === 'number'
  )
}

/** Only fields that `Settings` has, with the same type as the default. */
export function knownSettings(s: Record<string, unknown>): Partial<Settings> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s)) {
    const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[k]
    if (def === undefined || v === undefined || v === null) continue
    if (typeof def !== typeof v || Array.isArray(def) !== Array.isArray(v)) continue
    out[k] = v
  }
  return out as Partial<Settings>
}

/** Settings to put in from a backup: an empty API key in the file does not clear the one here. */
export function restoreSettings(file: Partial<Settings>): Partial<Settings> {
  const out = { ...file }
  for (const k of SECRET_KEYS) if (!out[k]) delete out[k]
  return out
}

// ---- chrome.storage.sync: one key per setting (8 KB limit per key) ----

export const SYNC_PREFIX = 's:'

/** The `chrome.storage.sync` keys and values for these settings. */
export function toSyncEntries(s: Settings): Record<string, unknown> {
  const pick = s.syncKeys ? s : withoutSecrets(s)
  return Object.fromEntries(Object.entries(pick).map(([k, v]) => [SYNC_PREFIX + k, v]))
}

/** Settings from `chrome.storage.sync` entries. Other keys and unknown settings are left out. */
export function fromSyncEntries(entries: Record<string, unknown>): Partial<Settings> {
  const raw: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(entries)) {
    if (k.startsWith(SYNC_PREFIX)) raw[k.slice(SYNC_PREFIX.length)] = v
  }
  return knownSettings(raw)
}

/** Entries of `next` that are not the same in `have`. */
export function changedEntries(next: object, have: object): Record<string, unknown> {
  const old = have as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(old[k])),
  )
}
