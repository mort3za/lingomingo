// The video of the current YouTube page: a watch page (`/watch?v=<id>`) or a Shorts page
// (`/shorts/<id>`). Shorts have their own player, and the watch player stays hidden in the DOM.

export const isShorts = () => location.pathname.startsWith('/shorts/')

export function currentVideoId(): string | null {
  if (isShorts()) return location.pathname.split('/')[2] || null
  return location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null
}

export function currentPlayer(): HTMLElement | null {
  return document.getElementById(isShorts() ? 'shorts-player' : 'movie_player')
}

/** The button group in the player toolbar where our toggles go first. */
export function toolbarGroup(): Element | null {
  if (isShorts()) {
    // The Shorts toolbar sits outside the player, in the reel around it.
    const reel = currentPlayer()?.closest('ytd-reel-video-renderer')
    return reel?.querySelector('#closed-captioning-button-container')?.parentElement ?? null
  }
  // `-left` is the button group of the new player. Older players have only the outer bar.
  return (
    document.querySelector('#movie_player .ytp-right-controls-left') ??
    document.querySelector('#movie_player .ytp-right-controls')
  )
}

/**
 * The full-width row around the watch player in theater mode, fullscreen and narrow windows.
 * It is a flex row: another child in it makes the player narrower.
 */
export function fullBleedRow(): HTMLElement | null {
  if (isShorts()) return null
  return currentPlayer()?.closest<HTMLElement>('#full-bleed-container') ?? null
}

/** The related videos column next to the watch player, if YouTube shows it now. */
export function relatedColumn(): HTMLElement | null {
  // In theater mode the column is still visible, but below the video.
  if (isShorts() || document.fullscreenElement || fullBleedRow()) return null
  const column = document.querySelector<HTMLElement>('ytd-watch-flexy #secondary')
  // In narrow windows YouTube hides this column and moves the related videos below the video.
  return column && column.getClientRects().length > 0 ? column : null
}
