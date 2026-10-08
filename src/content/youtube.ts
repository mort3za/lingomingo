import { mountInShadow } from './mount'
import YoutubeOverlay from './youtube/YoutubeOverlay.vue'

// The player element stays alive across YouTube page navigations, so mount once.
function mountWhenReady() {
  const player = document.getElementById('movie_player')
  if (!player) return false
  const host = mountInShadow(YoutubeOverlay, {}, player)
  host.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:60;'
  // Keep clicks, keys and scrolling on our UI away from the YouTube player.
  for (const type of [
    'click',
    'dblclick',
    'mousedown',
    'mouseup',
    'pointerdown',
    'contextmenu',
    'wheel',
  ]) {
    host.addEventListener(type, (e) => e.stopPropagation())
  }
  return true
}

if (!mountWhenReady()) {
  const timer = setInterval(() => mountWhenReady() && clearInterval(timer), 300)
}
