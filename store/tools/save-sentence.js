;(() => {
  // Saves the line on the subtitle bar (yellow star). Clicks only when it is not saved yet, so it
  // never removes it. Returns the star after the click: ★ is saved.
  const roots = [...document.querySelectorAll('lingomingo-root')].map((h) => h.shadowRoot)
  const find = () =>
    roots
      .flatMap((r) => [...r.querySelectorAll('button[title]')])
      .find((x) => x.title.startsWith('Save sentence'))
  const b = find()
  if (!b) return 'nobtn'
  if (b.textContent.trim() !== '★') b.click()
  return new Promise((res) => setTimeout(() => res(find()?.textContent.trim()), 500))
})()
