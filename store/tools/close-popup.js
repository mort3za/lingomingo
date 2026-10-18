;(() => {
  // Closes the word popup. Escape does not close it.
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  const b = roots
    .flatMap((r) => [...r.querySelectorAll('div.fixed.w-80 button')])
    .find((x) => (x.title || x.getAttribute('aria-label')) === 'Close')
  b?.click()
  return b ? 'closed' : 'none'
})()
