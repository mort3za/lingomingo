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
