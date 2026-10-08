import { onBeforeUnmount, watchEffect, type Ref } from 'vue'
import { toolbarGroup } from './page'

// Like the native buttons of the new player: a filled icon when on, an outline icon when off.
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
function makeButton(t: Toggle): { btn: HTMLButtonElement; path: SVGPathElement } {
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
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('fill', '#fff')
  path.setAttribute('fill-rule', 'evenodd')
  svg.append(path)
  btn.append(svg)
  btn.addEventListener('click', () => (t.on.value = !t.on.value))
  return { btn, path }
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
      const { btn, path } = parts[i]!
      btn.style.display = show ? '' : 'none'
      btn.setAttribute('aria-pressed', String(t.on.value))
      path.setAttribute('d', t.on.value ? t.icon.on : t.icon.off)
    })
  })

  onBeforeUnmount(() => {
    clearInterval(timer)
    buttons.forEach((b) => b.remove())
  })
}
