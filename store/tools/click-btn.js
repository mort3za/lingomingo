;(() => {
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  if (roots.some((r) => r.querySelector('.animate-pulse'))) return 'loading'
  const b = roots
    .flatMap((r) => [...r.querySelectorAll('button')])
    .find((x) => x.textContent.trim().endsWith(window.__lmBtn))
  if (!b) return 'nobtn'
  b.click()
  return 'ok'
})()
