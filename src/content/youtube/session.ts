import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { alignTranslation, audioLang, findCueIndex, parseJson3, pickTrack } from '@/shared/captions'
import { send } from '@/shared/messages'
import {
  getSavedItems,
  getSettings,
  onStorageKey,
  patchSettings,
  phraseId,
  removeItems,
  upsertItem,
  wordId,
} from '@/shared/storage'
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  type CaptionTrack,
  type Cue,
  type SavedItem,
  type SavedWord,
  type Settings,
  type Stage,
} from '@/shared/types'
import { lemmaOf, loadWordList, type Vocab, type WordList } from '@/shared/vocab'
import { currentPlayer, currentVideoId, isShorts } from './page'

const CHUNK = 40
const RETRY_MS = 15_000

type Status = 'idle' | 'loading' | 'ready' | 'no-subs' | 'error'

/**
 * Send a request to the page-world script (youtube-main.ts) every `everyMs`, until an answer
 * for this video comes back. Answers for other videos are ignored: right after a navigation
 * the player can still hold the previous video.
 */
function askPage<T>(
  request: Record<string, unknown>,
  replyType: string,
  videoId: string,
  { tries, everyMs }: { tries: number; everyMs: number },
): Promise<T | null> {
  return new Promise((resolve) => {
    let count = 0
    const ask = () => {
      if (count++ >= tries) return done(null)
      window.postMessage({ source: 'lingomingo', ...request }, '*')
    }
    const onMsg = (e: MessageEvent) => {
      const d = e.data
      if (e.source !== window || d?.source !== 'lingomingo' || d.type !== replyType) return
      if (d.videoId !== videoId) return
      // A null answer means "not yet" (for example an ad is playing). Ask again later.
      if (d.params === null) return
      done(d as T)
    }
    const timer = setInterval(ask, everyMs)
    const done = (value: T | null) => {
      clearInterval(timer)
      window.removeEventListener('message', onMsg)
      resolve(value)
    }
    window.addEventListener('message', onMsg)
    ask()
  })
}

async function fetchCues(track: CaptionTrack, extra: [string, string][]): Promise<Cue[]> {
  const url = new URL(track.baseUrl, location.href)
  for (const [k, v] of extra) if (!url.searchParams.has(k)) url.searchParams.set(k, v)
  url.searchParams.set('fmt', 'json3')
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`Caption download failed (${res.status}).`)
  const text = await res.text()
  if (!text) throw new Error('YouTube returned empty captions.')
  return parseJson3(JSON.parse(text))
}

const CAPTIONS_TTL = 7 * 86400_000

interface Captions {
  study: Cue[]
  native: Cue[] | null
}

/**
 * Captions of a video, cached by video and tracks for 7 days. Without the cache, each load
 * waits again for the player to load its own captions, which takes seconds (more with ads).
 */
async function videoCaptions(
  id: string,
  studyTrack: CaptionTrack,
  nativeTrack: CaptionTrack | null,
): Promise<Captions> {
  const trackKey = (t: CaptionTrack | null) => (t ? `${t.languageCode}:${t.kind ?? ''}` : '')
  const key = `cues:${id}:${trackKey(studyTrack)}:${trackKey(nativeTrack)}`
  const cached = (await chrome.storage.local.get(key))[key] as
    (Captions & { at: number }) | undefined
  if (cached && Date.now() - cached.at < CAPTIONS_TTL) return cached
  // The page script needs the video to play its own captions once. Ads delay this.
  const pot = await askPage<{ params: [string, string][] }>(
    { type: 'get-caption-params', videoId: id, lang: studyTrack.languageCode },
    'caption-params',
    id,
    { tries: 12, everyMs: 6000 },
  )
  const extra = pot?.params ?? []
  const study = await fetchCues(studyTrack, extra)
  // If the human translation track fails, fall back to AI translation.
  const native = nativeTrack ? await fetchCues(nativeTrack, extra).catch(() => null) : null
  // Do not keep a failed human track: the next load tries it again.
  if (!nativeTrack || native) {
    await chrome.storage.local.set({ [key]: { study, native, at: Date.now() } })
  }
  return { study, native }
}

export function useYoutubeSession() {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  const saved = ref<SavedItem[]>([])
  const videoId = ref<string | null>(null)
  // On Shorts pages, YouTube puts the channel and title over the bottom of the player.
  const onShorts = ref(false)
  const title = ref('')
  const status = ref<Status>('idle')
  const message = ref('')
  const cues = shallowRef<Cue[]>([])
  const human = ref<(string | null)[]>([])
  const machine = ref<(string | null)[]>([])
  const translationError = ref('')
  const activeIdx = ref(-1)
  const cueVisible = ref(false)
  // What the user sees. Both start off, and turn on when the video is in the study language.
  const showSubs = ref(false)
  const showPanel = ref(false)
  const studying = () => showSubs.value || showPanel.value

  const translationOf = (i: number): string | null => human.value[i] ?? machine.value[i] ?? null

  // Word list of the study language: frequency ranks and lemmas.
  const list = shallowRef<WordList | null>(null)
  watch(
    () => settings.value.studyLang,
    async (lang) => {
      list.value = null
      const value = await loadWordList(lang).catch(() => null)
      if (lang === settings.value.studyLang) list.value = value
    },
    { immediate: true },
  )
  const lemma = (word: string) => lemmaOf(word, list.value?.lemmas)

  const savedWords = computed(() =>
    saved.value.filter(
      (i): i is SavedWord => i.itemType === 'WORD' && i.langCode === settings.value.studyLang,
    ),
  )
  /** The saved word with the same lemma ("ging" finds a saved "gehe"). */
  const savedWordOf = (word: string) => savedWords.value.find((i) => lemma(i.text) === lemma(word))

  const stageByWord = computed(() => new Map(savedWords.value.map((i) => [lemma(i.text), i.stage])))

  const vocab = computed<Vocab>(() => ({
    stages: stageByWord.value,
    list: list.value,
    level: settings.value.vocabLevels[settings.value.studyLang],
    showKnownGreen: settings.value.showKnownGreen,
    showSuggested: settings.value.showSuggested,
    darkenRare: settings.value.darkenRare,
  }))

  const savedPhraseIds = computed(
    () => new Set(saved.value.filter((i) => i.itemType === 'PHRASE').map((i) => i.id)),
  )

  const video = () => currentPlayer()?.querySelector<HTMLVideoElement>('video.html5-main-video')

  // ---- loading ----
  let loadToken = 0
  async function load() {
    const id = currentVideoId()
    const token = ++loadToken
    videoId.value = id
    onShorts.value = isShorts()
    cues.value = []
    human.value = []
    machine.value = []
    activeIdx.value = -1
    translationError.value = ''
    message.value = ''
    requested.clear()
    showSubs.value = false
    showPanel.value = false
    if (!id) {
      status.value = 'idle'
      return
    }
    status.value = 'loading'
    try {
      const { studyLang, nativeLang } = settings.value
      const info = await askPage<{ title: string; tracks: CaptionTrack[] }>(
        { type: 'get-tracks' },
        'tracks',
        id,
        { tries: 25, everyMs: 200 },
      )
      if (token !== loadToken) return
      if (!info) throw new Error('Could not read the YouTube player.')
      title.value = info.title
      // No auto-generated track: the language is unknown, so show our UI.
      const spoken = audioLang(info.tracks)
      showSubs.value = !spoken || spoken === studyLang
      // The list covers half of a Shorts player, so it starts closed there.
      showPanel.value = showSubs.value && !isShorts()
      const studyTrack = pickTrack(info.tracks, studyLang)
      if (!studyTrack) {
        status.value = 'no-subs'
        message.value = `No ${LANGUAGES[studyLang] ?? studyLang} subtitles on this video.`
        return
      }
      const nativeTrack = nativeLang === studyLang ? null : pickTrack(info.tracks, nativeLang)
      const { study: studyCues, native: nativeCues } = await videoCaptions(
        id,
        studyTrack,
        nativeTrack,
      )
      if (token !== loadToken) return
      human.value = nativeCues ? alignTranslation(studyCues, nativeCues) : []
      machine.value = studyCues.map(() => null)
      cues.value = studyCues
      status.value = 'ready'
      ensureTranslations(0)
    } catch (e) {
      if (token !== loadToken) return
      status.value = 'error'
      message.value = e instanceof Error ? e.message : String(e)
    }
  }

  // ---- AI translation, by chunks of cues ----
  const requested = new Map<number, 'busy' | number>() // chunk -> busy | time of failure
  async function translateChunk(chunk: number) {
    const id = videoId.value
    const token = loadToken
    const slice = cues.value.slice(chunk * CHUNK, (chunk + 1) * CHUNK)
    if (!id || !slice.length) return
    const failedAt = requested.get(chunk)
    if (failedAt === 'busy' || (failedAt && Date.now() - failedAt < RETRY_MS)) return
    requested.set(chunk, 'busy')
    try {
      const out = await send({
        type: 'translate-chunk',
        videoId: id,
        studyLang: settings.value.studyLang,
        nativeLang: settings.value.nativeLang,
        chunk,
        lines: slice.map((c) => c.text),
      })
      if (token !== loadToken) return
      const next = [...machine.value]
      out.forEach((t, i) => (next[chunk * CHUNK + i] = t))
      machine.value = next
      translationError.value = ''
      requested.delete(chunk)
    } catch (e) {
      if (token !== loadToken) return
      requested.set(chunk, Date.now())
      translationError.value = e instanceof Error ? e.message : String(e)
    }
  }

  function ensureTranslations(idx: number) {
    if (status.value !== 'ready' || !studying()) return
    // A human translation track exists: never use AI for this video.
    if (human.value.length) return
    const chunk = Math.floor(Math.max(idx, 0) / CHUNK)
    void translateChunk(chunk)
    if (idx % CHUNK > CHUNK - 15) void translateChunk(chunk + 1)
  }

  // ---- playback loop ----
  let raf = 0
  let pausedFor = -1
  function tick() {
    const v = video()
    if (v && cues.value.length) {
      const t = v.currentTime
      const idx = findCueIndex(cues.value, t)
      if (idx !== activeIdx.value) {
        activeIdx.value = idx
        ensureTranslations(idx)
      }
      const cue = cues.value[idx]
      if (cue) {
        // Pause only when playback just crossed the end, not after a seek into a gap.
        const atEnd = t >= cue.end - 0.05 && t < cue.end + 0.5
        if (settings.value.autoPause && showSubs.value && !v.paused && idx !== pausedFor && atEnd) {
          pausedFor = idx
          v.pause()
        }
        cueVisible.value = t < cue.end + 0.4 || v.paused
      } else {
        cueVisible.value = false
      }
    }
    raf = requestAnimationFrame(tick)
  }

  function goTo(idx: number) {
    const v = video()
    const cue = cues.value[idx]
    if (!v || !cue) return
    pausedFor = -1
    v.currentTime = cue.start
    void v.play()
  }
  const repeat = () => goTo(Math.max(activeIdx.value, 0))
  const next = () => goTo(Math.min(activeIdx.value + 1, cues.value.length - 1))
  const prev = () => goTo(Math.max(activeIdx.value - 1, 0))
  function togglePlay() {
    const v = video()
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }
  const toggleAutoPause = () => patchSettings({ autoPause: !settings.value.autoPause })
  const toggleSubtitlesOnTop = () =>
    patchSettings({ subtitlesOnTop: !settings.value.subtitlesOnTop })

  // ---- saving ----
  function videoRef(idx: number) {
    const cue = cues.value[idx]
    return {
      source: 'YOUTUBE' as const,
      videoId: videoId.value ?? '',
      title: title.value,
      startMs: Math.round((cue?.start ?? 0) * 1000),
      endMs: Math.round((cue?.end ?? 0) * 1000),
    }
  }

  const phraseKey = (idx: number) =>
    phraseId(settings.value.studyLang, videoId.value ?? '', videoRef(idx).startMs)

  async function togglePhrase(idx: number) {
    const cue = cues.value[idx]
    if (!cue || !videoId.value) return
    const id = phraseKey(idx)
    if (savedPhraseIds.value.has(id)) return removeItems([id])
    const now = Date.now()
    await upsertItem({
      id,
      itemType: 'PHRASE',
      langCode: settings.value.studyLang,
      translationLang: settings.value.nativeLang,
      stage: 'LEARNING',
      createdAt: now,
      updatedAt: now,
      text: cue.text,
      translation: translationOf(idx),
      source: videoRef(idx),
    })
  }

  async function markWord(word: string, idx: number, stage: Stage, translations: string[]) {
    const old = savedWordOf(word)
    // One saved item per lemma: marking "ging" updates a saved "gehe".
    const id = old?.id ?? wordId(settings.value.studyLang, lemma(word))
    const now = Date.now()
    await upsertItem({
      id,
      itemType: 'WORD',
      langCode: settings.value.studyLang,
      translationLang: settings.value.nativeLang,
      stage,
      createdAt: now,
      updatedAt: now,
      text: word,
      // Copy: chrome.storage cannot store Vue proxies.
      translations: [...(translations.length ? translations : (old?.translations ?? []))],
      context: cues.value[idx]
        ? { sentence: cues.value[idx]!.text, translation: translationOf(idx) }
        : null,
      source: videoId.value ? videoRef(idx) : null,
      // Keep the review history when the stage changes.
      ...(old?.review && { review: { ...old.review } }),
    })
  }

  function unmarkWord(word: string) {
    const old = savedWordOf(word)
    if (old) return removeItems([old.id])
  }

  // Translate the current cue when the user turns the subtitles or the list on.
  watch([showSubs, showPanel], () => ensureTranslations(activeIdx.value))

  // ---- lifecycle ----
  const stops: (() => void)[] = []
  async function refreshSettings() {
    const before = settings.value
    settings.value = await getSettings()
    if (
      before.studyLang !== settings.value.studyLang ||
      before.nativeLang !== settings.value.nativeLang
    ) {
      void load()
    }
  }
  async function refreshSaved() {
    saved.value = await getSavedItems()
  }

  onMounted(async () => {
    settings.value = await getSettings()
    await refreshSaved()
    stops.push(onStorageKey('settings', refreshSettings), onStorageKey('savedItems', refreshSaved))
    document.addEventListener('yt-navigate-finish', load)
    stops.push(() => document.removeEventListener('yt-navigate-finish', load))
    raf = requestAnimationFrame(tick)
    void load()
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    stops.forEach((s) => s())
  })

  return {
    settings,
    saved,
    videoId,
    onShorts,
    status,
    message,
    cues,
    activeIdx,
    cueVisible,
    showSubs,
    showPanel,
    studying,
    translationError,
    translationOf,
    vocab,
    savedWordOf,
    savedPhraseIds,
    video,
    goTo,
    repeat,
    next,
    prev,
    togglePlay,
    toggleAutoPause,
    toggleSubtitlesOnTop,
    togglePhrase,
    markWord,
    unmarkWord,
    phraseKey,
  }
}

export type YoutubeSession = ReturnType<typeof useYoutubeSession>
