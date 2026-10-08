import { extractJson } from '@/shared/llm-json'
import { LANGUAGES, type Settings } from '@/shared/types'

async function ask(settings: Settings, system: string, user: string): Promise<string> {
  if (settings.provider === 'claude') {
    if (!settings.claudeKey) throw new Error('Add your Claude API key in Settings.')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.claudeModel,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as { content: { type: string; text?: string }[] }
    return data.content.map((c) => c.text ?? '').join('')
  }

  if (settings.provider === 'openai') {
    if (!settings.openaiKey) throw new Error('Add your OpenAI API key in Settings.')
    return chat(
      'OpenAI API',
      'https://api.openai.com/v1',
      settings.openaiModel,
      system,
      user,
      settings.openaiKey,
      // Reasoning models reject a custom temperature. undefined drops it from the request.
      { temperature: undefined },
    )
  }

  if (settings.provider === 'grok') {
    if (!settings.grokKey) throw new Error('Add your xAI API key in Settings.')
    return chat(
      'xAI API',
      'https://api.x.ai/v1',
      settings.grokModel,
      system,
      user,
      settings.grokKey,
      { temperature: undefined },
    )
  }

  if (settings.provider === 'deepseek') {
    if (!settings.deepseekKey) throw new Error('Add your DeepSeek API key in Settings.')
    return chat(
      'DeepSeek API',
      'https://api.deepseek.com',
      settings.deepseekModel,
      system,
      user,
      settings.deepseekKey,
      // Thinking is on by default; short translations do not need it.
      { thinking: { type: 'disabled' } },
    )
  }

  if (!settings.localModel) throw new Error('Set the local model name in Settings.')
  return chat('Local model', settings.localBaseUrl, settings.localModel, system, user)
}

/** OpenAI-compatible chat completion (OpenAI, xAI, DeepSeek, Ollama, llama.cpp, LM Studio). */
async function chat(
  label: string,
  baseUrl: string,
  model: string,
  system: string,
  user: string,
  key?: string,
  extra?: Record<string, unknown>,
): Promise<string> {
  const base = baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...extra,
    }),
  })
  if (!res.ok) throw new Error(`${label} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message.content ?? ''
}

const name = (code: string) => LANGUAGES[code] ?? code

export async function translateLines(
  settings: Settings,
  lines: string[],
  studyLang: string,
  nativeLang: string,
): Promise<string[]> {
  // Numbered keys keep the model aligned. A plain array lets it merge or split lines, mostly
  // with auto-generated captions, where a sentence runs across several lines.
  const system =
    `You translate subtitle lines from ${name(studyLang)} to ${name(nativeLang)}. ` +
    `Input is a JSON object that maps line numbers to lines. A sentence can start in one line ` +
    `and end in a different line. Answer with ONLY a JSON object with the same keys, and the ` +
    `translation of each line under its own key. Never merge or split lines. ` +
    `Keep each translation short and natural.`
  const user = JSON.stringify(Object.fromEntries(lines.map((line, i) => [i + 1, line])))
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = extractJson(await ask(settings, system, user)) as Record<string, unknown>
      const result = lines.map((_, i) => out[i + 1])
      if (result.every((t) => typeof t === 'string')) return result as string[]
    } catch (e) {
      if (attempt === 1) throw e
    }
  }
  // Still misaligned: smaller requests are easier for the model to keep aligned.
  if (lines.length > 1) {
    const half = Math.ceil(lines.length / 2)
    return [
      ...(await translateLines(settings, lines.slice(0, half), studyLang, nativeLang)),
      ...(await translateLines(settings, lines.slice(half), studyLang, nativeLang)),
    ]
  }
  throw new Error('Model returned a wrong number of lines.')
}

export async function translateWord(
  settings: Settings,
  word: string,
  sentence: string,
  studyLang: string,
  nativeLang: string,
): Promise<string[]> {
  const system =
    `You are a dictionary. Translate a ${name(studyLang)} word to ${name(nativeLang)}, ` +
    `using the sentence for meaning. Answer with ONLY JSON: {"translations":["best","alt1","alt2"]} ` +
    `(1 to 3 short items, the word in its dictionary form if it helps).`
  const out = extractJson(await ask(settings, system, JSON.stringify({ word, sentence }))) as {
    translations?: unknown
  }
  if (!Array.isArray(out.translations)) throw new Error('Bad answer from model.')
  return out.translations.map(String).slice(0, 3)
}
