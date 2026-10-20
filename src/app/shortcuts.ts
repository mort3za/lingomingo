import type { Key } from '@/shared/i18n'

/**
 * Keyboard shortcuts of the app page and of YouTube videos, for the help dialog. Each page
 * handles its own keys.
 */
export interface Shortcut {
  /** Alternatives. Each alternative is a sequence of keys. */
  keys: string[][]
  label: Key
}

export interface ShortcutGroup {
  title: Key
  /** The route where the group works. Missing = all pages. */
  route?: string
  items: Shortcut[]
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'sc.general',
    items: [
      { keys: [['?']], label: 'sc.showShortcuts' },
      { keys: [['G', 'M']], label: 'sc.goMedia' },
      { keys: [['G', 'R']], label: 'sc.goReview' },
      { keys: [['G', 'S']], label: 'sc.goSaved' },
      { keys: [['G', ',']], label: 'sc.goSettings' },
    ],
  },
  {
    title: 'nav.media',
    route: '/media',
    items: [{ keys: [['/']], label: 'sc.searchVideos' }],
  },
  {
    title: 'nav.review',
    route: '/review',
    items: [
      { keys: [['Space'], ['Enter']], label: 'sc.reveal' },
      { keys: [['1'], ['2'], ['3'], ['4']], label: 'sc.grades' },
      { keys: [['K']], label: 'sc.learned' },
      { keys: [['Z']], label: 'sc.undo' },
    ],
  },
  {
    title: 'nav.saved',
    route: '/saved-items',
    items: [
      { keys: [['/']], label: 'sc.search' },
      { keys: [['A']], label: 'sc.selectAll' },
      { keys: [['Shift+Click']], label: 'sc.selectRange' },
      { keys: [['K']], label: 'sc.toKnown' },
      { keys: [['L']], label: 'sc.toLearning' },
      { keys: [['N']], label: 'sc.toSkipped' },
      { keys: [['Delete']], label: 'sc.delete' },
      { keys: [['Esc']], label: 'sc.clear' },
    ],
  },
  {
    title: 'sc.youtube',
    items: [
      { keys: [['A']], label: 'sc.prev' },
      { keys: [['S']], label: 'sc.repeat' },
      { keys: [['D']], label: 'sc.next' },
      { keys: [['W']], label: 'sc.playPause' },
      { keys: [['Q']], label: 'sc.autoPause' },
      { keys: [['R']], label: 'sc.saveSentence' },
      { keys: [['Shift+C']], label: 'sc.subs' },
      { keys: [['Shift+S']], label: 'sc.list' },
    ],
  },
  {
    title: 'sc.hints',
    items: [
      { keys: [['E']], label: 'sc.hintShow' },
      { keys: [['Letter']], label: 'sc.hintOpen' },
      { keys: [['Shift+Letter']], label: 'sc.hintSave' },
      { keys: [['Backspace']], label: 'sc.hintBack' },
      { keys: [['E'], ['Esc']], label: 'sc.hintHide' },
    ],
  },
  {
    title: 'sc.popup',
    items: [
      { keys: [['K']], label: 'stage.KNOWN' },
      { keys: [['L']], label: 'sc.learn' },
      { keys: [['N']], label: 'sc.skip' },
      { keys: [['P']], label: 'sc.playWord' },
      { keys: [['X']], label: 'sc.saveExpr' },
      { keys: [['Shift+X']], label: 'sc.playExpr' },
      { keys: [['1'], ['2'], ['3']], label: 'sc.playExample' },
      { keys: [['Esc']], label: 'common.close' },
    ],
  },
]

/** True when the key is for a text field, or has a modifier that belongs to the browser. */
export function ignoreKey(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  return (
    !!el?.matches('input, textarea, select') ||
    !!el?.isContentEditable ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey
  )
}
