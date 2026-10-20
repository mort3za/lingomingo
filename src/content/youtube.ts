import { loadLocale } from '@/shared/i18n'
import { getSettings, onStorageKey } from '@/shared/storage'
import { mountInShadow } from './mount'
import { currentPlayer } from './youtube/page'
import YoutubeOverlay from './youtube/YoutubeOverlay.vue'

// The player elements stay alive across YouTube page navigations, so mount once. Watch pages
// and Shorts pages have different players: move our UI into the player of the current page.
function mountWhenReady() {
  const player = currentPlayer()
  if (!player) return false
  const host = mountInShadow(YoutubeOverlay, {}, player)
  // On the video, our UI is always dark. The list docked beside the video follows the system.
  host.dataset.theme = 'dark'
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
  setInterval(() => {
    const p = currentPlayer()
    if (p && host.parentElement !== p) p.append(host)
  }, 500)
  return true
}

// The interface language is loaded first, so the UI does not show English for a moment.
const syncLocale = async () => loadLocale((await getSettings()).uiLang)
onStorageKey('settings', () => void syncLocale())
void syncLocale().then(() => {
  if (!mountWhenReady()) {
    const timer = setInterval(() => mountWhenReady() && clearInterval(timer), 300)
  }
})
