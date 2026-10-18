;(() => {
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  const span = roots
    .flatMap((r) => [...r.querySelectorAll('div.group.cursor-pointer span.cursor-pointer')])
    .find((s) => s.textContent === window.__lmWord)
  if (!span) return 'no word'
  span.click()
  return 'clicked'
})()
