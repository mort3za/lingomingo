import { createApp, type Component } from 'vue'
import css from '@/shared/styles/main.css?inline'

/**
 * Mount a Vue app inside a shadow root, so page CSS and our CSS do not mix.
 */
export function mountInShadow(component: Component, props: Record<string, unknown> = {}) {
  // Shadow roots ignore @property rules, but Tailwind needs them (shadows, rings, transforms).
  // Register them on the page document instead.
  const properties = new CSSStyleSheet()
  properties.replaceSync((css.match(/@property[^{]+\{[^}]*\}/g) ?? []).join('\n'))
  document.adoptedStyleSheets.push(properties)

  const host = document.createElement('lingomingo-root')
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `:host { all: initial; }\n${css}`

  const root = document.createElement('div')
  shadow.append(style, root)
  document.body.append(host)

  createApp(component, props).mount(root)
}
