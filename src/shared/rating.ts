// The "rate us" banner of the toolbar popup.

export const REVIEW_URL =
  'https://chromewebstore.google.com/detail/lingomingo/ecodbdmdfdpodfiifnacmnahkdaijkln/reviews'

const KEY = 'rating'
const DAY = 24 * 60 * 60 * 1000
const MIN_OPENS = 3

/** `opens`: popup opens. `done`: the user rated or closed the banner, it never shows again. */
export interface RatingState {
  installedAt: number
  opens: number
  done?: boolean
}

/** Show the banner 1 day after install, from the 3rd popup open. */
export function showRating(s: RatingState, now: number): boolean {
  return !s.done && s.opens >= MIN_OPENS && now - s.installedAt >= DAY
}

async function getState(): Promise<RatingState | undefined> {
  return (await chrome.storage.local.get(KEY))[KEY] as RatingState | undefined
}

/** Keep the install time. Users from before this banner start to count from their update. */
export async function markInstalled(): Promise<void> {
  if (!(await getState()))
    await chrome.storage.local.set({ [KEY]: { installedAt: Date.now(), opens: 0 } })
}

/** Count this popup open, and tell if the banner shows. */
export async function countOpen(): Promise<boolean> {
  const s = (await getState()) ?? { installedAt: Date.now(), opens: 0 }
  const next = { ...s, opens: s.opens + 1 }
  await chrome.storage.local.set({ [KEY]: next })
  // `bun run dev` and `bun run build:dev` always show it, to see and test it.
  return import.meta.env.MODE === 'development' || showRating(next, Date.now())
}

export async function ratingDone(): Promise<void> {
  const s = (await getState()) ?? { installedAt: Date.now(), opens: 0 }
  await chrome.storage.local.set({ [KEY]: { ...s, done: true } })
}
