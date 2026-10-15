import { errorMessage } from '@/shared/llm-json'
import { LANGUAGES, type Settings, type Voice } from '@/shared/types'

/** Audio not played for this long is removed. */
export const TTS_TTL = 30 * 86400_000

export interface CachedAudio {
  audio: string
  /** Last play. */
  at: number
}

/** The voice that `settings` select. `auto` picks OpenAI or Gemini when there is a key. */
function voiceOf(s: Settings): Exclude<Voice, 'auto'> {
  if (s.voice !== 'auto') return s.voice
  if (s.geminiKey && (s.provider === 'gemini' || !s.openaiKey)) return 'gemini'
  return s.openaiKey ? 'openai' : 'browser'
}

/**
 * `text` spoken by the selected voice, as base64 audio (MP3, WAV, or raw 16-bit PCM at 24 kHz).
 * null = the browser voice is selected: the page speaks it. Audio is cached in storage, so a
 * text costs one request, also across reloads.
 */
export async function speak(
  settings: Settings,
  text: string,
  lang: string,
): Promise<string | null> {
  const voice = voiceOf(settings)
  if (voice === 'browser') return null
  const s = settings
  const id =
    voice === 'local'
      ? `${s.voiceBaseUrl}:${s.voiceModel}:${s.voiceName}`
      : voice === 'gemini'
        ? `${s.geminiVoiceModel}:${s.geminiVoice}`
        : `${s.openaiVoiceModel}:${s.openaiVoice}`
  const key = `tts:v1:${voice}:${id}:${lang}:${text}`
  const cached = (await chrome.storage.local.get(key))[key] as CachedAudio | undefined
  let audio = cached?.audio
  if (!audio) {
    if (voice === 'gemini') {
      if (!settings.geminiKey) throw new Error('Add your Gemini API key in Settings.')
      audio = await gemini(settings.geminiKey, s.geminiVoiceModel, s.geminiVoice, text)
    } else if (voice === 'openai') {
      if (!settings.openaiKey) throw new Error('Add your OpenAI API key in Settings.')
      audio = await speech('OpenAI API', 'https://api.openai.com/v1', settings.openaiKey, {
        model: s.openaiVoiceModel,
        voice: s.openaiVoice,
        input: text,
        instructions: `Speak ${LANGUAGES[lang] ?? lang} clearly, for a language learner.`,
      })
    } else {
      if (!s.voiceModel) throw new Error('Add the model name of your voice server in Settings.')
      audio = await speech('Voice server', s.voiceBaseUrl, null, {
        model: s.voiceModel,
        voice: s.voiceName,
        input: text,
      })
    }
  }
  await chrome.storage.local.set({ [key]: { audio, at: Date.now() } satisfies CachedAudio })
  return audio
}

/** OpenAI-style `/audio/speech` request (OpenAI, Kokoro-FastAPI, Speaches, ...). */
async function speech(
  label: string,
  base: string,
  key: string | null,
  body: Record<string, string>,
): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${base.replace(/\/+$/, '')}/audio/speech`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key && { authorization: `Bearer ${key}` }),
      },
      // MP3: much smaller than WAV in the cache.
      body: JSON.stringify({ ...body, response_format: 'mp3' }),
    })
  } catch {
    throw new Error(`${label}: no connection to ${base}.`)
  }
  if (!res.ok) throw new Error(`${label} ${res.status}: ${errorMessage(await res.text())}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  // In parts: one String.fromCharCode call with all bytes overflows the stack.
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

async function gemini(key: string, model: string, voice: string, text: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          // Gemini 3.8 and newer name the voice in `voice`. Older models use `prebuiltVoiceConfig`.
          speechConfig: {
            voiceConfig: /^gemini-(2|3\.[0-7])\b/.test(model)
              ? { prebuiltVoiceConfig: { voiceName: voice } }
              : { voice },
          },
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${errorMessage(await res.text())}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[]
  }
  const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!audio) throw new Error('No audio from Gemini.')
  return audio
}
