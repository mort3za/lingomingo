;(() => {
  let st = document.getElementById('lm-shot')
  if (!st) {
    st = document.createElement('style')
    st.id = 'lm-shot'
    document.head.append(st)
  }
  st.textContent =
    '.ytp-large-play-button,.ytp-chrome-bottom,.ytp-gradient-bottom,.ytp-chrome-top,.ytp-gradient-top,.ytp-paid-content-overlay,.ytp-ce-element,.ytp-spinner,.ytp-cued-thumbnail-overlay-image-x{display:none!important}'
  const v = document.querySelector('video')
  v.pause()
  v.currentTime = window.__lmT
  return 'ok'
})()
