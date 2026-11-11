import { getSettings, onStorageKey, patchSettings } from '@/shared/storage'
import {
  changedEntries,
  fromSyncEntries,
  restoreSettings,
  SYNC_PREFIX,
  toSyncEntries,
} from '@/shared/sync'
import { SECRET_KEYS, type Settings } from '@/shared/types'

// Settings go to Chrome sync (`chrome.storage.sync`), one key per setting: a key holds 8 KB at
// most. Local storage stays the copy that all pages read. Chrome sync works only between Chrome
// browsers of the same Google account. Brave keeps the sync area on the device.

/** Write the local settings that are not the same in Chrome sync. */
async function push() {
  const s = await getSettings()
  const have = await chrome.storage.sync.get(null)
  const changed = changedEntries(toSyncEntries(s), have)
  if (Object.keys(changed).length) await chrome.storage.sync.set(changed)
  // Keys sync turned off: take the keys out of Chrome sync. Other devices keep their copy.
  if (!s.syncKeys) {
    const drop = SECRET_KEYS.map((k) => SYNC_PREFIX + k).filter((k) => k in have)
    if (drop.length) await chrome.storage.sync.remove(drop)
  }
}

/** Put settings from Chrome sync in local storage. */
async function pull(entries: Record<string, unknown>) {
  const remote = restoreSettings(fromSyncEntries(entries))
  const local = await getSettings()
  const changed = changedEntries(remote, local) as Partial<Settings>
  if (Object.keys(changed).length) await patchSettings(changed)
}

const log = (e: unknown) => console.warn('LingoMingo settings sync:', e)

export function startSettingsSync() {
  onStorageKey('settings', () => void push().catch(log))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return
    // A removed key does not clear the local setting.
    const entries = Object.fromEntries(
      Object.entries(changes)
        .filter(([, c]) => c.newValue !== undefined)
        .map(([k, c]) => [k, c.newValue]),
    )
    void pull(entries).catch(log)
  })
  // Browser start or install: Chrome sync wins, then settings it does not have yet go up.
  const reconcile = () => void chrome.storage.sync.get(null).then(pull).then(push).catch(log)
  chrome.runtime.onStartup.addListener(reconcile)
  chrome.runtime.onInstalled.addListener(reconcile)
}
