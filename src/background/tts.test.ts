import { afterEach, expect, test } from 'bun:test'
import { DEFAULT_SETTINGS } from '@/shared/types'
import { speak } from './tts'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

/** Gemini request of one `speak` call. */
async function geminiRequest(lang: string, model = DEFAULT_SETTINGS.geminiVoiceModel) {
  const store: Record<string, unknown> = {}
  ;(globalThis as { chrome?: unknown }).chrome = {
    storage: {
      local: {
        get: async (k: string) => ({ [k]: store[k] }),
        set: async (v: Record<string, unknown>) => void Object.assign(store, v),
      },
    },
  }
  let url = ''
  let body = {} as { input: unknown; generationConfig: { speechConfig: unknown } }
  globalThis.fetch = (async (u: string, init: RequestInit) => {
    url = u
    body = JSON.parse(init.body as string)
    return Response.json(
      u.endsWith('/interactions')
        ? { steps: [{ type: 'model_output', content: [{ type: 'audio', data: 'AA' }] }] }
        : { candidates: [{ content: { parts: [{ inlineData: { data: 'AA' } }] } }] },
    )
  }) as typeof fetch
  const settings = {
    ...DEFAULT_SETTINGS,
    voice: 'gemini' as const,
    geminiKey: 'k',
    geminiVoiceModel: model,
  }
  expect(await speak(settings, 'will', lang)).toBe('AA')
  return { url, body, keys: Object.keys(store) }
}

test('Gemini voice gets the language in the style, and the text stays as it is', async () => {
  const { url, body, keys } = await geminiRequest('de')
  expect(url).toEndWith('/v1beta/interactions')
  expect(body.input).toEqual([
    {
      type: 'user_input',
      content: [
        {
          type: 'text',
          text: 'will',
          annotations: [{ type: 'speech_metadata', style: 'German pronunciation' }],
        },
      ],
    },
  ])
  // Not the v1 or v2 cache, which can have audio in a wrong language.
  expect(keys[0]).toStartWith('tts:v3:gemini:')
})

test('Gemini voice: every language, also one with no Gemini locale', async () => {
  const { body } = await geminiRequest('sv')
  expect(body.input).toMatchObject([
    { content: [{ annotations: [{ style: 'Swedish pronunciation' }] }] },
  ])
})

test('Gemini 3.7 and older keep generateContent', async () => {
  const { url, body } = await geminiRequest('de', 'gemini-2.5-flash-preview-tts')
  expect(url).toEndWith(':generateContent')
  expect(body.generationConfig.speechConfig).toEqual({
    voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_SETTINGS.geminiVoice } },
  })
})
