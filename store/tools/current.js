;(() => {
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  const b = roots
    .flatMap((r) => [...r.querySelectorAll('button')])
    .find((x) => x.textContent.includes('Current'))
  b?.click()
  return b ? 'ok' : 'none'
})()
