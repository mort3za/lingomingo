import { onBeforeUnmount, watchEffect, type Ref } from 'vue'
import { toolbarGroup } from './page'

// Like the native buttons of the new player: a filled icon when on, an outline icon when off.
// The icon sits in a Persian red chip, so the user sees that the button is ours (see makeButton).
export const ICONS = {
  subtitles: {
    on: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z',
    off: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z',
  },
  sidebar: {
    on: 'M2 5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5zm2 1v12h10V6H4z',
    off: 'M2 5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5zm2 1v12h10V6H4zm12 0v12h4V6h-4z',
  },
}

export interface Toggle {
  label: string
  icon: { on: string; off: string }
  on: Ref<boolean>
}

// These buttons live in the YouTube page DOM (not in our shadow root), so they get the
// `ytp-button` look. With `aria-pressed`, the older player also draws its red bar under them.
// Persian red, the `--color-accent` theme token. The CSS variable is not available here.
const ACCENT = '#cc3333'

interface Parts {
  btn: HTMLButtonElement
  chip: SVGRectElement
  path: SVGPathElement
}

// On: a solid red chip with a white filled icon. Off: a red chip outline with a white outline
// icon. White icons like the native ones; the red chip shows that the button is from LingoMingo.
function makeButton(t: Toggle): Parts {
  const btn = document.createElement('button')
  btn.className = 'ytp-button'
  btn.title = t.label
  btn.setAttribute('aria-label', t.label)
  // No innerHTML: YouTube enforces Trusted Types.
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  const chip = document.createElementNS(ns, 'rect')
  // Inset by half the stroke, so the svg box does not cut the outline.
  for (const [k, v] of Object.entries({ x: 0.75, y: 0.75, width: 22.5, height: 22.5, rx: 6 })) {
    chip.setAttribute(k, String(v))
  }
  chip.setAttribute('stroke', ACCENT)
  chip.setAttribute('stroke-width', '1.5')
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('fill', '#fff')
  path.setAttribute('fill-rule', 'evenodd')
  // The 24px icon shrinks to 16px, in the middle of the chip.
  path.setAttribute('transform', 'translate(4 4) scale(0.6667)')
  svg.append(chip, path)
  btn.append(svg)
  btn.addEventListener('click', () => (t.on.value = !t.on.value))
  return { btn, chip, path }
}

/** Toggle buttons at the start of the right button group of the YouTube player toolbar. */
export function usePlayerToggles(toggles: Toggle[], visible: () => boolean) {
  const parts = toggles.map(makeButton)
  const buttons = parts.map((p) => p.btn)

  // YouTube can rebuild its toolbar, and Shorts pages have another one. Keep the buttons in
  // the toolbar of the current page.
  const place = () => {
    const bar = toolbarGroup()
    if (bar && buttons[0]!.parentElement !== bar) bar.prepend(...buttons)
  }
  place()
  const timer = setInterval(place, 1000)

  watchEffect(() => {
    const show = visible()
    toggles.forEach((t, i) => {
      const { btn, chip, path } = parts[i]!
      btn.style.display = show ? '' : 'none'
      btn.setAttribute('aria-pressed', String(t.on.value))
      chip.setAttribute('fill', t.on.value ? ACCENT : 'none')
      path.setAttribute('d', t.on.value ? t.icon.on : t.icon.off)
    })
  })

  onBeforeUnmount(() => {
    clearInterval(timer)
    buttons.forEach((b) => b.remove())
  })
}
