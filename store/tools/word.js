;(() => {
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  // The subtitle bar is the root without the side panel rows.
  const spans = roots.flatMap((r) => [...r.querySelectorAll('span.cursor-pointer')])
  const hits = spans.filter(
    (s) => s.textContent === window.__lmWord && !s.closest('div.group.cursor-pointer'),
  )
  if (!hits.length) return 'no word in ' + spans.length
  hits[0].click()
  return 'ok ' + hits.length
})()
