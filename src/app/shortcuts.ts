/** Keyboard shortcuts of the app page, for the help dialog. Each page handles its own keys. */
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
