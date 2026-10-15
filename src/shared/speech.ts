import { ref } from 'vue'
import { send } from '@/shared/messages'
import { onStorageKey } from '@/shared/storage'

let ctx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
// AI audio of this page. null = no AI voice.
const clips = new Map<string, Promise<AudioBuffer | null>>()
// A newer play() call stops an older one that still waits for its audio.
let turn = 0
// A new voice in the settings: get the audio again.
onStorageKey('settings', () => clips.clear())

/** `lang:text` of what loads or plays now, so its button can show it. */
export const speaking = ref<string | null>(null)

/**
 * Says `text` in `lang` with the AI voice, or with a browser voice when there is no AI voice.
 * Stops what plays now. Resolves when it ends or is stopped.
 */
export async function play(text: string, lang: string): Promise<void> {
  stop()
  const mine = ++turn
  const key = `${lang}:${text}`
  speaking.value = key
  try {
    // Made in the click, so the browser lets it play.
    const audio = (ctx ??= new AudioContext())
    let clip = clips.get(key)
    if (!clip) {
      clip = load(audio, text, lang)
      clips.set(key, clip)
    }
    let buf: AudioBuffer | null = null
    try {
      buf = await clip
    } catch (e) {
      clips.delete(key)
      console.warn('LingoMingo: AI voice failed, using the browser voice.', e)
    }
    if (mine !== turn) return
    if (!buf) return await sayInBrowser(text, lang)
    await audio.resume()
    if (mine !== turn) return
    await new Promise<void>((resolve) => {
      const s = audio.createBufferSource()
      s.buffer = buf
      s.connect(audio.destination)
      s.onended = () => resolve()
      source = s
      s.start()
    })
  } finally {
    if (mine === turn) speaking.value = null
  }
}

export function stop() {
  turn++
  speaking.value = null
  source?.stop()
  source = null
  speechSynthesis.cancel()
}

async function load(ctx: AudioContext, text: string, lang: string): Promise<AudioBuffer | null> {
  const b64 = await send({ type: 'speak', text, lang })
  if (!b64) return null
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  try {
    // MP3 or WAV. decodeAudioData takes the buffer, so give it a copy.
    return await ctx.decodeAudioData(bytes.slice().buffer)
  } catch {
    // Raw 16-bit PCM, 24 kHz, mono (older Gemini TTS models).
    const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1)
    const buf = ctx.createBuffer(1, pcm.length, 24000)
    buf.getChannelData(0).set(Float32Array.from(pcm, (v) => v / 32768))
    return buf
  }
}

function sayInBrowser(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    // Best first: a downloaded high-quality voice, then Chrome's online "Google ..." voice, which
    // sounds better than most basic system voices.
    const voices = speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()))
    u.voice =
      voices.find((v) => /premium|enhanced|natural/i.test(v.name)) ??
      voices.find((v) => v.name.startsWith('Google')) ??
      voices[0] ??
      null
    u.onend = u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}
