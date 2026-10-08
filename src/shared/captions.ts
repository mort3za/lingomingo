import type { CaptionTrack, Cue } from './types'

export function primaryLang(code: string): string {
  return code.toLowerCase().split(/[-_]/)[0] ?? ''
}

/** Pick a human-made track for a language. Auto-generated (`asr`) tracks are never accepted. */
export function pickTrack(tracks: CaptionTrack[], lang: string): CaptionTrack | null {
  const manual = tracks.filter((t) => t.kind !== 'asr' && primaryLang(t.languageCode) === lang)
  return manual.find((t) => t.languageCode.toLowerCase() === lang) ?? manual[0] ?? null
}

interface Json3 {
  events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[]
}

export function parseJson3(data: Json3): Cue[] {
  const cues: Cue[] = []
  for (const ev of data.events ?? []) {
    if (!ev.segs || ev.tStartMs == null) continue
    const text = ev.segs
      .map((s) => s.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) continue
    const start = ev.tStartMs / 1000
    cues.push({ start, end: start + (ev.dDurationMs ?? 0) / 1000, text })
  }
  return cues
}

/**
 * Map a second track (other language) onto the cues of the first.
 * The two tracks have different timing, so match by time overlap.
 */
export function alignTranslation(study: Cue[], other: Cue[]): (string | null)[] {
  return study.map((cue) => {
    const mid = other.filter((o) => {
      const m = (o.start + o.end) / 2
      return m >= cue.start && m < cue.end
    })
    if (mid.length) return mid.map((o) => o.text).join(' ')
    let best: Cue | null = null
    let bestOverlap = 0
    for (const o of other) {
      const overlap = Math.min(cue.end, o.end) - Math.max(cue.start, o.start)
      if (overlap > bestOverlap) {
        best = o
        bestOverlap = overlap
      }
    }
    return best ? best.text : null
  })
}

/** Index of the last cue that starts at or before `t`. -1 if none. */
export function findCueIndex(cues: Cue[], t: number): number {
  let lo = 0
  let hi = cues.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cues[mid]!.start <= t) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
