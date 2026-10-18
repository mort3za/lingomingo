/**
 * Keyboard shortcuts of the app page and of YouTube videos, for the help dialog. Each page
 * handles its own keys.
 */
export interface Shortcut {
  /** Alternatives. Each alternative is a sequence of keys. */
  keys: string[][]
  label: string
}

export interface ShortcutGroup {
  title: string
  /** The route where the group works. Missing = all pages. */
  route?: string
  items: Shortcut[]
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'General',
    items: [
      { keys: [['?']], label: 'Show keyboard shortcuts' },
      { keys: [['G', 'M']], label: 'Go to Media' },
      { keys: [['G', 'R']], label: 'Go to Review' },
      { keys: [['G', 'S']], label: 'Go to Saved' },
      { keys: [['G', ',']], label: 'Go to Settings' },
    ],
  },
  {
    title: 'Media',
    route: '/media',
    items: [{ keys: [['/']], label: 'Search videos' }],
  },
  {
    title: 'Review',
    route: '/review',
    items: [
      { keys: [['Space'], ['Enter']], label: 'Show answer, then "Good" (next word)' },
      { keys: [['1'], ['2'], ['3'], ['4']], label: 'Again / Hard / Good / Easy' },
      { keys: [['K']], label: 'Learned (move to Known)' },
      { keys: [['Z']], label: 'Undo last answer' },
    ],
  },
  {
    title: 'Saved',
    route: '/saved-items',
    items: [
      { keys: [['/']], label: 'Search' },
      { keys: [['A']], label: 'Select all / none' },
      { keys: [['Shift+Click']], label: 'Select a range of rows' },
      { keys: [['K']], label: 'Selected → Known' },
      { keys: [['L']], label: 'Selected → Learning' },
      { keys: [['N']], label: "Selected → Don't learn" },
      { keys: [['Delete']], label: 'Delete selected' },
      { keys: [['Esc']], label: 'Clear selection' },
    ],
  },
  {
    title: 'YouTube video',
    items: [
      { keys: [['A']], label: 'Previous sentence' },
      { keys: [['S']], label: 'Repeat sentence' },
      { keys: [['D']], label: 'Next sentence' },
      { keys: [['W']], label: 'Play / pause' },
      { keys: [['Q']], label: 'Auto-pause on / off' },
      { keys: [['R']], label: 'Save sentence' },
      { keys: [['Shift+C']], label: 'Subtitles on / off' },
      { keys: [['Shift+S']], label: 'Subtitles list on / off' },
    ],
  },
  {
    title: 'YouTube word hints',
    items: [
      { keys: [['E']], label: 'Show a letter on each word of the sentence' },
      { keys: [['Letter']], label: 'Open the word' },
      { keys: [['Shift+Letter']], label: 'Save the word as Learning' },
      { keys: [['Backspace']], label: 'Undo the first of two letters' },
      { keys: [['E'], ['Esc']], label: 'Hide the letters' },
    ],
  },
  {
    title: 'YouTube word popup',
    items: [
      { keys: [['K']], label: 'Known' },
      { keys: [['L']], label: 'Learn' },
      { keys: [['N']], label: 'Skip' },
      { keys: [['P']], label: 'Play the word' },
      { keys: [['X']], label: 'Save the expression' },
      { keys: [['Shift+X']], label: 'Play the expression' },
      { keys: [['1'], ['2'], ['3']], label: 'Play example 1 / 2 / 3' },
      { keys: [['Esc']], label: 'Close' },
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
