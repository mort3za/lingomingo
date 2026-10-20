import type { Key } from '@/shared/i18n'

// Links of the app sidebar. The toolbar popup shows some of them too. `label`: the text key.
// Icons: SVG path data in the Lucide style (24×24, stroke).
interface NavLink {
  to: string
  label: Key
  icon: string[]
}

export const mainLinks: NavLink[] = [
  {
    to: '/media',
    label: 'nav.media',
    icon: [
      'M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
      'm17 2-5 5-5-5',
    ],
  },
  {
    to: '/review',
    label: 'nav.review',
    icon: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  },
  {
    to: '/saved-items',
    label: 'nav.saved',
    icon: ['m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z'],
  },
]
export const footerLinks: NavLink[] = [
  {
    to: '/settings',
    label: 'nav.settings',
    icon: [
      'M20 7h-9',
      'M14 17H5',
      'M14 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
      'M4 7a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    ],
  },
  {
    to: '/credits',
    label: 'nav.credits',
    icon: [
      'm15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526',
      'M6 8a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
    ],
  },
  {
    to: '/donate',
    label: 'nav.donate',
    icon: [
      'M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16',
      'm14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95',
      'm2 15 6 6',
      'm7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91',
    ],
  },
]

/** Attributes of the `<svg>` for the icons above. */
export const iconAttrs = {
  class: 'size-5 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const
