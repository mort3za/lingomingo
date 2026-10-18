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
  'Start ms',
  'End ms',
] as const

export function cell(value: string): string {
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
      String(i.source?.startMs ?? ''),
      String(i.source?.endMs ?? ''),
    ].map(cell)
  })
  return [COLUMNS.map(cell), ...rows].map((r) => r.join(',')).join('\n')
}

export function toJson(items: SavedItem[]): string {
  return JSON.stringify(items, null, 2)
}

const html = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, '<br>')

/**
 * Anki text file (TSV with file headers, Anki 2.1.54+) for the "Basic" note type.
 * The GUID is the item id, so a second import updates the notes and does not add duplicates.
 */
export function toAnki(items: SavedItem[]): string {
  const rows = items.map((i) => {
    const isWord = i.itemType === 'WORD'
    // Each block is a list of lines. Empty lines are left out, and an empty line separates blocks.
    const blocks: string[][] = isWord
      ? [
          [
            i.ipa ? html(`/${i.ipa}/`) : '',
            html(i.translations.join(', ')),
            i.plural ? `Plural: ${html(i.plural)}` : '',
          ],
          [html(i.context?.sentence ?? ''), html(i.context?.translation ?? '')],
          ...(i.examples ?? []).map((e) => [
            html(e.sentence).replace(/\*([^*]+)\*/g, '<b>$1</b>'),
            html(e.translation),
          ]),
        ]
      : [[html(i.translation ?? '')]]
    if (i.source) {
      const url = `https://www.youtube.com/watch?v=${i.source.videoId}&t=${Math.floor(i.source.startMs / 1000)}s`
      blocks.push([`<a href="${html(url)}">${html(i.source.title || url)}</a>`])
    }
    const back = blocks
      .map((lines) => lines.filter(Boolean).join('<br>'))
      .filter(Boolean)
      .join('<br><br>')
    const tags = ['lingomingo', i.langCode, ...(isWord ? (i.tags ?? []) : [])]
    return [
      i.id,
      html(isWord ? (i.headword ?? i.text) : i.text),
      back,
      tags.map((t) => t.replace(/\s+/g, '_')).join(' '),
    ].join('\t')
  })
  return [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    '#deck:LingoMingo',
    '#columns:GUID\tFront\tBack\tTags',
    '#guid column:1',
    '#tags column:4',
    ...rows,
  ].join('\n')
}
