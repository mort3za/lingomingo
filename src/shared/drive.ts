/**
 * OAuth client ID (Google Cloud, type "Web application") for the Google Drive sync. It is not a
 * secret. Empty: the app does not show the Drive sync. Setup: see `docs/drive-sync.md`.
 */
export const GOOGLE_CLIENT_ID =
  '339567065013-ncih0v2v2q8vu0j94vv0601vko1bogpk.apps.googleusercontent.com'

/** State of the Google Drive sync, in local storage under `DRIVE_KEY`. */
export interface DriveState {
  connected: boolean
  /** The sync file in the hidden app folder of Drive. */
  fileId?: string
  /** `modifiedTime` of the sync file after the last sync: same value = no change from others. */
  remoteTime?: string
  /** Hash of the saved items after the last sync: same value = no change here. */
  lastHash?: string
  lastSyncAt?: number
  /** `signin`: Google wants the user to sign in again. Else the error text. */
  error?: string
  /** Why the sign-in without a window failed, from Google or Chrome. */
  signinReason?: string
  /** Google account of the sync, so a new token comes without a window also with more accounts. */
  email?: string
}

export const DRIVE_KEY = 'driveSync'

export async function getDriveState(): Promise<DriveState> {
  const state = (await chrome.storage.local.get(DRIVE_KEY))[DRIVE_KEY] as DriveState | undefined
  return state ?? { connected: false }
}
