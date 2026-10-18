;(() => {
  // Scrolls the side panel so the current line is at the top.
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  const rows = roots.flatMap((r) => [...r.querySelectorAll('div.group.cursor-pointer')])
  const a = rows.find((r) => r.className.includes('bg-accent'))
  if (!a) return 'none'
  const sc = a.closest('.overflow-y-auto')
  sc.scrollTop = a.offsetTop - sc.offsetTop - 8
  return 'ok'
})()
