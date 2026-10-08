// Runs in the page world, at document_start. Answers requests from the content script.
//
// 1. Reads the player data (caption tracks), which isolated scripts cannot see.
// 2. YouTube caption URLs return an empty body without a proof-of-origin token (`pot`),
//    and only the player can make that token. So we watch the player's own caption
//    requests and give their extra params to the content script.
import { dropDubbed, type AudioTrack } from '@/shared/captions'
import type { CaptionTrack } from '@/shared/types'
import { currentPlayer } from './youtube/page'

interface Player extends HTMLElement {
  getPlayerResponse?: () => {
    videoDetails?: { videoId?: string; title?: string }
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } }
    streamingData?: { adaptiveFormats?: { audioTrack?: AudioTrack }[] }
  }
  loadModule?: (name: string) => void
  unloadModule?: (name: string) => void
  getOption?: (module: string, option: string) => { languageCode?: string } | undefined
  setOption?: (module: string, option: string, value: unknown) => void
}

// Params that select the track or format. The content script sets its own.
const TRACK_PARAMS = new Set(['lang', 'tlang', 'kind', 'name', 'fmt'])
let captured: { videoId: string; params: [string, string][] } | null = null

function note(raw: string | URL) {
  let url: URL
  try {
    url = new URL(raw, location.href)
  } catch {
    return
  }
  if (!url.pathname.endsWith('/api/timedtext') || !url.searchParams.has('pot')) return
  captured = {
    videoId: url.searchParams.get('v') ?? '',
    params: [...url.searchParams].filter(([k]) => !TRACK_PARAMS.has(k)),
  }
}

const open = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
  note(args[1] as string | URL)
  return (open as (...a: unknown[]) => void).apply(this, args)
}
const fetch = window.fetch
window.fetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
  note(input instanceof Request ? input.url : input)
  return fetch.call(this, input, init)
} as typeof fetch

const player = () => currentPlayer() as Player | null
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Make the player load captions once, so we can copy the params of its request. */
async function captionParams(videoId: string, lang: string): Promise<[string, string][] | null> {
  if (captured?.videoId === videoId) return captured.params
  const p = player()
  if (!p) return null
  const wasOn = !!p.getOption?.('captions', 'track')?.languageCode
  p.loadModule?.('captions')
  p.setOption?.('captions', 'track', { languageCode: lang })
  for (let i = 0; i < 50 && captured?.videoId !== videoId; i++) await sleep(100)
  if (!wasOn) p.unloadModule?.('captions')
  return captured?.videoId === videoId ? captured.params : null
}

function reply(data: Record<string, unknown>) {
  window.postMessage({ source: 'lingomingo', ...data }, '*')
}

window.addEventListener('message', async (e) => {
  const d = e.data
  if (e.source !== window || d?.source !== 'lingomingo') return
  if (d.type === 'get-tracks') {
    const res = player()?.getPlayerResponse?.()
    reply({
      type: 'tracks',
      videoId: res?.videoDetails?.videoId ?? null,
      title: res?.videoDetails?.title ?? '',
      tracks: dropDubbed(
        res?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [],
        (res?.streamingData?.adaptiveFormats ?? []).flatMap((f) => f.audioTrack ?? []),
      ),
    })
  } else if (d.type === 'get-caption-params') {
    reply({
      type: 'caption-params',
      videoId: d.videoId,
      params: await captionParams(d.videoId, d.lang),
    })
  }
})
