import { cell } from './export'
import type { Cue } from './types'

export type SubtitleFormat = 'srt' | 'vtt' | 'csv'
/** What text goes in the file: the video language or the translation. */
export type SubtitleContent = 'original' | 'translation'

export interface SubtitleLine extends Cue {
  translation: string | null
}

/** `01:02:03,456` (SRT) or `01:02:03.456` (VTT and CSV). */
function time(seconds: number, sep: ',' | '.'): string {
  const ms = Math.round(seconds * 1000)
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor(ms / 60_000) % 60
  const s = Math.floor(ms / 1000) % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`
}

// An empty line ends a cue in SRT and VTT, so a cue text must not have one.
const oneBlock = (text: string) => text.trim().replace(/\n\s*\n/g, '\n')

const textOf = (line: SubtitleLine, content: SubtitleContent) =>
  content === 'original' ? line.text : (line.translation ?? '')

/** Cues with no text are left out: an empty cue breaks SRT and VTT readers. */
function blocks(lines: SubtitleLine[], content: SubtitleContent, sep: ',' | '.') {
  return lines
    .map((l) => ({ l, text: oneBlock(textOf(l, content)) }))
    .filter((b) => b.text)
    .map(({ l, text }) => `${time(l.start, sep)} --> ${time(l.end, sep)}\n${text}`)
}

export function toSrt(lines: SubtitleLine[], content: SubtitleContent): string {
  return blocks(lines, content, ',')
    .map((b, i) => `${i + 1}\n${b}\n`)
    .join('\n')
}

export function toVtt(lines: SubtitleLine[], content: SubtitleContent): string {
  return ['WEBVTT\n', ...blocks(lines, content, '.').map((b) => `${b}\n`)].join('\n')
}

export function toSubtitleCsv(lines: SubtitleLine[], content: SubtitleContent): string {
  const rows = lines.map((l) => [time(l.start, '.'), time(l.end, '.'), textOf(l, content)])
  return [['Start', 'End', 'Text'], ...rows].map((r) => r.map(cell).join(',')).join('\n')
}

export const subtitleFile: Record<
  SubtitleFormat,
  { type: string; make: (lines: SubtitleLine[], content: SubtitleContent) => string }
> = {
  srt: { type: 'application/x-subrip', make: toSrt },
  vtt: { type: 'text/vtt', make: toVtt },
  csv: { type: 'text/csv', make: toSubtitleCsv },
}
