import { createApp, type Component } from 'vue'
import css from '@/shared/styles/main.css?inline'

/**
 * Mount a Vue app inside a shadow root, so page CSS and our CSS do not mix.
 */
export function mountInShadow(
  component: Component,
  props: Record<string, unknown> = {},
  parent: Element = document.body,
): HTMLElement {
  // Shadow roots ignore @property rules, but Tailwind needs them (shadows, rings, transforms).
  // Register them on the page document instead.
  const properties = new CSSStyleSheet()
  properties.replaceSync((css.match(/@property[^{]+\{[^}]*\}/g) ?? []).join('\n'))
  document.adoptedStyleSheets.push(properties)

  const host = document.createElement('lingomingo-root')
  const shadow = host.attachShadow({ mode: 'open' })

  // rem follows the page's root font size (YouTube sets 10px), so use px for Tailwind's 16px rem.
  const style = document.createElement('style')
  const pxCss = css.replace(/(\d*\.?\d+)rem\b/g, (_, n: string) => `${Number(n) * 16}px`)
  style.textContent = `:host { all: initial; }\n${pxCss}`

  const root = document.createElement('div')
  shadow.append(style, root)
  parent.append(host)

  createApp(component, props).mount(root)
  return host
}
