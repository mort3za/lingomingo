export interface Channel {
  /** YouTube channel ID (starts with `UC`). */
  id: string
  name: string
}

/** Curated YouTube channels per study language. Pick channels with human-made subtitles. */
export const CHANNELS: Record<string, Channel[]> = {
  de: [
    { id: 'UCbxb2fqe9oNgglAoYqsYOtQ', name: 'Easy German' },
    { id: 'UC4zcMHyrT_xyWlgy5WGpFFQ', name: 'BILD' },
    { id: 'UCmN5AEULh0GsQ2mwNlyQG-A', name: 'DER GLÜCKSRITTER' },
    { id: 'UC1lcA9yIr-6brMzptYk_fwA', name: 'Krall & Bubeck' },
    { id: 'UCMIgOXM2JEQ2Pv2d0_PVfcg', name: 'DW Deutsch' },
    { id: 'UC_dZp8bZipnjntBGLVHm6rw', name: 'AfD-Fraktion Bundestag' },
    { id: 'UCSeil5V81-mEGB1-VNR7YEA', name: 'ntv Nachrichten' },
    { id: 'UC5NOEUbkLheQcaaRldYW5GA', name: 'tagesschau' },
    { id: 'UCB37CFICVTUlewYdbMSChIA', name: 'Tichys Einblick' },
    { id: 'UCxU1a-2vec6ljU43I0F2Jwg', name: 'Stuttgarter Zeitung' },
    { id: 'UCZMsvbAhhRblVGXmEXW8TSA', name: 'WELT Nachrichtensender' },
    { id: 'UCBA2L-XIgGYVn_t_8B0VMMg', name: 'Tobias Huch' },
    { id: 'UCyQpfuhftLvrmjxgEzVH78Q', name: 'OE24.TV' },
    { id: 'UCObT1HxDVGDWtvmJxG3E4Cw', name: 'DACH Medien' },
    { id: 'UCcweJsCV2TUP_kzMX25U-oQ', name: 'BR24' },
    { id: 'UCq-b0dwW97YRZWgSCikWQRA', name: 'DIE WELTWOCHE' },
    { id: 'UCqboxXgo9yQ0oVO5anr_jtQ', name: 'Sascha Pallenberg' },
    { id: 'UCFemltyr6criZZsWFHUSHPQ', name: 'Tagesspiegel' },
    { id: 'UCeqKIgPQfNInOswGRWt48kQ', name: 'ZDFheute Nachrichten' },
    { id: 'UCfluzhYpawqHUYNcFdw68Gg', name: 'Carsten Jahn - TEAM HEIMAT' },
    { id: 'UCgAPgHNmQSG_ySHRiOVeF4Q', name: 'FOCUS online' },
    { id: 'UCnk0-FU1ybs9MpWg8g3yqMw', name: 'Politik & Co' },
    { id: 'UC4qhj5cnX0MkbwXQ5vlI1NQ', name: 'Kronen Zeitung' },
    { id: 'UC9kZ6FlOQfusBV8LS2x2fAA', name: 'Militär & Geschichte mit Torsten Heinrich' },
    { id: 'UCMpW4tdyZUid2Ka9_FuDDhQ', name: 'Handelsblatt' },
    { id: 'UCR_iFmLcHBFxc3x3CA71xvw', name: 'Apollo News' },
    { id: 'UCQGqiGhMjc_p4lZEhSTb12g', name: 'NIUS' },
    { id: 'UCPhsnKyNcH3huafz_wNG_5A', name: 'hessenschau' },
    { id: 'UCanbTgWMvESZy3xhXcxjHcg', name: 'WELT Netzreporter' },
    { id: 'UCwyiPnNlT8UABRmGmU0T9jg', name: 'phoenix' },
    { id: 'UCAKB9wGGRccBDrvbbbmgetw', name: 'NDR Info' },
    { id: 'UCy4_zQ59zmS7zO4Dc6vbT_w', name: 'SWR' },
    { id: 'UCRdEdkAlZetdf74bYaBRv3g', name: 'FPÖ TV' },
    { id: 'UCfb7LAYCeJJiT3gyquv7V5Q', name: 'DIE DA OBEN!' },
    { id: 'UCiTKi7Ahf3E2yMGpmIxSvgw', name: 'Deutschland Kurier' },
    { id: 'UCeP-mETJStV6mg34dfUl6rA', name: 'AfD-Fraktion NRW' },
    { id: 'UCsygZtQQSplGF6JA3XWvsdg', name: 'Irgendwas mit ARTE und Kultur' },
    { id: 'UCq2ej2M1Fb62hZxfahZ536A', name: 'ANDI in Deutschland' },
    { id: 'UC6hrzR7smGOGQgOh5q5HZYQ', name: 'HeyWolfi' },
    { id: 'UC_YnP7DDnKzkkVl3BaHiZoQ', name: 'DIE ZEIT' },
  ],
}

export interface CatalogueVideo {
  videoId: string
  title: string
  channelId: string
  channelName: string
  published: number // ms
  views: number
  isShort: boolean
}

const first = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]

/** Latest videos of a channel (YouTube RSS feed, about 15 items). */
export async function fetchChannelVideos(channel: Channel): Promise<CatalogueVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`)
  if (!res.ok) throw new Error(`${channel.name}: HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'application/xml')
  return [...doc.getElementsByTagName('entry')].map((e) => ({
    videoId: first(e, 'yt:videoId')?.textContent ?? '',
    title: first(e, 'title')?.textContent ?? '',
    channelId: channel.id,
    channelName: channel.name,
    published: Date.parse(first(e, 'published')?.textContent ?? ''),
    views: Number(first(e, 'media:statistics')?.getAttribute('views') ?? 0),
    isShort: (first(e, 'link')?.getAttribute('href') ?? '').includes('/shorts/'),
  }))
}
