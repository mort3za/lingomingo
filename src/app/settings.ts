import { ref, watch } from 'vue'
import { getSettings, onStorageKey, patchSettings } from '@/shared/storage'
import { DEFAULT_SETTINGS, type Settings } from '@/shared/types'

// One copy of the settings for all app pages. Edits save automatically.
const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const saved = ref(false)

// Last value known to be in storage. Other pages (the video overlay) can change settings too,
// so we reload on change, and save only real edits made on the app page.
let stored = ''
async function refresh() {
  const value = await getSettings()
  stored = JSON.stringify(value)
  settings.value = value
}

let timer: ReturnType<typeof setTimeout> | undefined
/** Edit not saved yet. */
let pending: string | null = null
watch(
  settings,
  (value) => {
    const json = JSON.stringify(value)
    if (json === stored) return
    stored = json
    pending = json
    clearTimeout(timer)
    timer = setTimeout(() => void saveNow(), 300)
  },
  { deep: true },
)

/** Save the last edit now, not after the delay. The toolbar popup can close before the delay ends. */
export async function saveNow() {
  clearTimeout(timer)
  if (pending === null) return
  const json = pending
  pending = null
  // A plain copy: chrome.storage saves a nested Vue proxy array as an object.
  await patchSettings(JSON.parse(json))
  saved.value = true
  setTimeout(() => (saved.value = false), 1200)
}

/** Resolves when the settings are loaded from storage. */
let loaded: Promise<void> | undefined
export function useSettings() {
  if (!loaded) {
    loaded = refresh()
    onStorageKey('settings', refresh)
  }
  return { settings, saved, loaded }
}

export const INPUT =
  'w-full rounded border border-white/10 bg-surface-deep px-3 py-2 text-sm text-white outline-none focus:border-accent'
export const LABEL = 'mb-1 block text-xs font-medium tracking-wide text-neutral-400 uppercase'
