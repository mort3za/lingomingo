import type { SavedItem } from './types'

const COLUMNS = [
  'Item type',
  'Text',
  'Translation',
  'Stage',
  'Language',
  'Translation language',
  'Context',
  'Context translation',
  'Video ID',
  'Video title',
  'Date created',
] as const

function cell(value: string): string {
  return /[",\n\t]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toCsv(items: SavedItem[]): string {
  const rows = items.map((i) => {
    const isWord = i.itemType === 'WORD'
    return [
      i.itemType,
      i.text,
      isWord ? i.translations.join(', ') : (i.translation ?? ''),
      i.stage,
      i.langCode,
      i.translationLang,
      isWord ? (i.context?.sentence ?? '') : i.text,
      isWord ? (i.context?.translation ?? '') : (i.translation ?? ''),
      i.source?.videoId ?? '',
      i.source?.title ?? '',
      new Date(i.createdAt).toISOString(),
    ].map(cell)
  })
  return [COLUMNS.map(cell), ...rows].map((r) => r.join(',')).join('\n')
}

export function toJson(items: SavedItem[]): string {
  return JSON.stringify(items, null, 2)
}

export type SubtitleFormat = 'srt' | 'vtt' | 'csv'

/** A subtitle line to export. `translation` null = not translated (empty in the file). */
export interface SubtitleLine {
  start: number // seconds
  end: number // seconds
  text: string
  translation: string | null
}

/** `01:02:03,456` (SRT) or `01:02:03.456` (VTT, CSV). */
export function timestamp(seconds: number, sep: ',' | '.'): string {
  const ms = Math.max(0, Math.round(seconds * 1000))
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor(ms / 60_000) % 60
  const s = Math.floor(ms / 1000) % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`
}

// A blank line ends a cue in SRT and VTT: keep the text of a line together.
const oneBlock = (text: string) => text.replace(/\s*\n\s*/g, '\n').trim()
// VTT reads `&`, `<` and `-->` as markup.
const vttText = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('-->', '--&gt;')

/** The subtitles of a video as an SRT, VTT or CSV file. The translation goes under the text. */
export function toSubtitles(lines: SubtitleLine[], format: SubtitleFormat): string {
  if (format === 'csv') {
    const head = ['Start', 'End', 'Text', 'Translation']
    const rows = lines.map((l) =>
      [timestamp(l.start, '.'), timestamp(l.end, '.'), l.text, l.translation ?? ''].map(cell),
    )
    return [head, ...rows].map((r) => r.join(',')).join('\n')
  }
  const sep = format === 'srt' ? ',' : '.'
  const cues = lines.map((l, i) => {
    const body = [l.text, l.translation ?? '']
      .map(oneBlock)
      .filter(Boolean)
      .map((t) => (format === 'vtt' ? vttText(t) : t))
    const time = `${timestamp(l.start, sep)} --> ${timestamp(l.end, sep)}`
    return [format === 'srt' ? String(i + 1) : null, time, ...body].filter((x) => x !== null)
  })
  const blocks = cues.map((c) => c.join('\n'))
  return (format === 'vtt' ? ['WEBVTT', ...blocks] : blocks).join('\n\n') + '\n'
}

/** Save a text file with the browser download. */
export function download(name: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
