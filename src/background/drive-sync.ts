import { DRIVE_KEY, getDriveState, GOOGLE_CLIENT_ID, type DriveState } from '@/shared/drive'
import { getItemsData, mergeIntoLocal } from '@/shared/storage'
import type { ItemsData } from '@/shared/sync'

// Saved items sync through one JSON file in the hidden app folder of the user's Google Drive
// (scope `drive.appdata`: the app sees only its own files). Sign-in uses
// `launchWebAuthFlow`, because `getAuthToken` does not work in Brave.

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'lingomingo-sync.json'
const API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const TOKEN_KEY = 'driveToken'
/** A change waits this long, so a few quick changes go up in one upload. */
const SOON_MINUTES = 0.5
const PERIOD_MINUTES = 15

interface SyncFile extends ItemsData {
  app: 'lingomingo'
  version: 1
}

interface Token {
  value: string
  expiresAt: number
}

class SignInNeeded extends Error {
  constructor() {
    super('signin')
  }
}

async function setState(patch: Partial<DriveState>) {
  await chrome.storage.local.set({ [DRIVE_KEY]: { ...(await getDriveState()), ...patch } })
}

/** An access token. `interactive`: Google can show its sign-in window. */
async function getToken(interactive: boolean): Promise<string> {
  // Session storage: the token is gone when the browser closes.
  const cached = (await chrome.storage.session.get(TOKEN_KEY))[TOKEN_KEY] as Token | undefined
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.value
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'token',
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: SCOPE,
    ...(interactive ? {} : { prompt: 'none' }),
  }).toString()
  let redirect: string | undefined
  try {
    redirect = await chrome.identity.launchWebAuthFlow({ url: url.href, interactive })
  } catch (e) {
    if (interactive) throw e
    throw new SignInNeeded()
  }
  const hash = new URLSearchParams(new URL(redirect ?? '').hash.slice(1))
  const value = hash.get('access_token')
  if (!value) {
    if (!interactive) throw new SignInNeeded()
    throw new Error(hash.get('error') ?? 'No access token from Google.')
  }
  const expiresAt = Date.now() + Number(hash.get('expires_in') ?? 3600) * 1000
  await chrome.storage.session.set({ [TOKEN_KEY]: { value, expiresAt } satisfies Token })
  return value
}

/** A Drive API request. A refused token is dropped and asked for again once, without a window. */
async function drive(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getToken(false)
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 && retry) {
    await chrome.storage.session.remove(TOKEN_KEY)
    return drive(url, init, false)
  }
  if (res.status === 401) throw new SignInNeeded()
  if (!res.ok) throw new Error(`Google Drive: ${res.status} ${await res.text()}`)
  return res
}

interface FileMeta {
  id: string
  modifiedTime: string
}

async function findFile(): Promise<FileMeta | undefined> {
  const q = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${FILE_NAME}'`,
    fields: 'files(id,modifiedTime)',
    orderBy: 'modifiedTime desc',
  })
  const { files } = (await (await drive(`${API}?${q}`)).json()) as { files: FileMeta[] }
  return files[0]
}

async function upload(data: ItemsData, fileId?: string): Promise<FileMeta> {
  const body = JSON.stringify({ app: 'lingomingo', version: 1, ...data } satisfies SyncFile)
  if (fileId) {
    const res = await drive(`${UPLOAD}/${fileId}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    return (await res.json()) as FileMeta
  }
  const form = new FormData()
  const meta = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' }
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file', new Blob([body], { type: 'application/json' }))
  const res = await drive(`${UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    body: form,
  })
  return (await res.json()) as FileMeta
}

/** JSON with sorted keys and items, so the same data from two devices has the same hash. */
function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`
  if (v && typeof v === 'object') {
    const entries = Object.entries(v).filter(([, x]) => x !== undefined)
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${stableJson(x)}`).join(',')}}`
  }
  return JSON.stringify(v)
}

async function hashOf(data: ItemsData): Promise<string> {
  const items = [...data.items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const bytes = new TextEncoder().encode(stableJson({ items, deleted: data.deleted }))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function syncOnce(): Promise<void> {
  const state = await getDriveState()
  if (!state.connected) return
  try {
    const local = await getItemsData()
    const localHash = await hashOf(local)
    const file = await findFile()
    let merged = local
    let remoteHash = state.lastHash
    if (file && file.modifiedTime !== state.remoteTime) {
      // Someone else changed the file: join it into the items here.
      const res = await drive(`${API}/${file.id}?alt=media`)
      const remote = (await res.json()) as Partial<SyncFile>
      const remoteData = { items: remote.items ?? [], deleted: remote.deleted ?? {} }
      remoteHash = await hashOf(remoteData)
      merged = await mergeIntoLocal(remoteData)
    } else if (file && localHash === state.lastHash) {
      // No change on either side.
      await setState({ lastSyncAt: Date.now(), error: undefined })
      return
    }
    const mergedHash = await hashOf(merged)
    const meta = !file || mergedHash !== remoteHash ? await upload(merged, file?.id) : file
    await setState({
      fileId: meta.id,
      remoteTime: meta.modifiedTime,
      lastHash: mergedHash,
      lastSyncAt: Date.now(),
      error: undefined,
    })
  } catch (e) {
    await setState({ error: e instanceof Error ? e.message : String(e) })
    throw e
  }
}

// One sync at a time: a second call waits and then runs again, to take the newest changes.
let running: Promise<void> = Promise.resolve()
export function syncDrive(): Promise<void> {
  const run = running.then(syncOnce, syncOnce)
  running = run.catch(() => {})
  return run
}

export async function connectDrive(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) throw new Error('No Google client ID in this build.')
  await chrome.storage.session.remove(TOKEN_KEY)
  await getToken(true)
  await setState({ connected: true, error: undefined })
  await chrome.alarms.create('drive-periodic', { periodInMinutes: PERIOD_MINUTES })
  await syncDrive()
}

/** Stop the sync. The data stays on this device and in Drive. */
export async function disconnectDrive(): Promise<void> {
  const cached = (await chrome.storage.session.get(TOKEN_KEY))[TOKEN_KEY] as Token | undefined
  await chrome.storage.session.remove(TOKEN_KEY)
  await chrome.storage.local.set({ [DRIVE_KEY]: { connected: false } satisfies DriveState })
  await chrome.alarms.clear('drive-periodic')
  await chrome.alarms.clear('drive-soon')
  if (cached) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${cached.value}`, {
      method: 'POST',
    }).catch(() => {})
  }
}

const log = (e: unknown) => console.warn('LingoMingo Drive sync:', e)

export function startDriveSync() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !('savedItems' in changes || 'deletedItems' in changes)) return
    void getDriveState().then(({ connected }) => {
      if (connected) void chrome.alarms.create('drive-soon', { delayInMinutes: SOON_MINUTES })
    })
  })
  chrome.alarms.onAlarm.addListener(({ name }) => {
    if (name === 'drive-soon' || name === 'drive-periodic') void syncDrive().catch(log)
  })
  // An update can clear the alarms.
  const restart = async () => {
    if (!(await getDriveState()).connected) return
    await chrome.alarms.create('drive-periodic', { periodInMinutes: PERIOD_MINUTES })
    await syncDrive()
  }
  chrome.runtime.onStartup.addListener(() => void restart().catch(log))
  chrome.runtime.onInstalled.addListener(() => void restart().catch(log))
}
