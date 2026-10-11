import { errorMessage, extractJson, finishedLines, matchLine } from '@/shared/llm-json'
import { LANGUAGES, type Settings } from '@/shared/types'

/** `onText` turns on streaming: it gets the whole answer so far after each new piece. */
interface Call {
  signal?: AbortSignal
  onText?: (text: string) => void
}

async function ask(
  settings: Settings,
  system: string,
  user: string,
  call: Call = {},
): Promise<string> {
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
        stream: !!call.onText,
      }),
      signal: call.signal,
    })
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${errorMessage(await res.text())}`)
    if (call.onText) {
      return readStream(
        res,
        (d: { type?: string; delta?: { text?: string } }) =>
          d.type === 'content_block_delta' ? d.delta?.text : undefined,
        call.onText,
      )
    }
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
      call,
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
      call,
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
      call,
      settings.deepseekKey,
      // Thinking is on by default; short translations do not need it.
      { thinking: { type: 'disabled' } },
    )
  }

  if (settings.provider === 'ollama') {
    if (!settings.ollamaModel) throw new Error('Set the Ollama model name in Settings.')
    // Thinking models (gemma4, qwen3, ...) think by default; short translations do not need it.
    // Models without thinking ignore this field.
    return chat(
      'Ollama',
      settings.ollamaBaseUrl,
      settings.ollamaModel,
      system,
      user,
      call,
      undefined,
      {
        reasoning_effort: 'none',
      },
    )
  }

  if (settings.provider === 'lmstudio') {
    if (!settings.lmstudioModel) throw new Error('Set the LM Studio model name in Settings.')
    const args = [
      'LM Studio',
      settings.lmstudioBaseUrl,
      settings.lmstudioModel,
      system,
      user,
      call,
    ] as const
    // LM Studio 0.4.8+ turns thinking off with reasoning_effort "none". Models that always think
    // (DeepSeek R1) can reject it: then ask again without it.
    try {
      return await chat(...args, undefined, { reasoning_effort: 'none' })
    } catch (e) {
      if (!(e instanceof Error && /^LM Studio 4\d\d/.test(e.message))) throw e
      return chat(...args)
    }
  }

  if (!settings.localModel) throw new Error('Set the local model name in Settings.')
  return chat('Local model', settings.localBaseUrl, settings.localModel, system, user, call)
}

/** OpenAI-compatible chat completion (OpenAI, xAI, DeepSeek, Ollama, llama.cpp, LM Studio). */
async function chat(
  label: string,
  baseUrl: string,
  model: string,
  system: string,
  user: string,
  call: Call,
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
      stream: !!call.onText,
      ...extra,
    }),
    signal: call.signal,
  })
  if (!res.ok) throw new Error(`${label} ${res.status}: ${errorMessage(await res.text())}`)
  if (call.onText) {
    return readStream(
      res,
      (d: { choices?: { delta?: { content?: string } }[] }) => d.choices?.[0]?.delta?.content,
      call.onText,
    )
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message.content ?? ''
}

/** Read a server-sent-events answer. `piece` gets the text out of each event. */
async function readStream<T>(
  res: Response,
  piece: (data: T) => string | undefined,
  onText: (text: string) => void,
): Promise<string> {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader()
  let text = ''
  let rest = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text
    const lines = (rest + value).split('\n')
    rest = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : ''
      if (!data || data === '[DONE]') continue
      const p = piece(JSON.parse(data) as T)
      if (!p) continue
      text += p
      onText(text)
    }
  }
}

const name = (code: string) => LANGUAGES[code] ?? code

/**
 * Translate subtitle lines. `onLine` gets each line as soon as the model writes it.
 * Lines that the model leaves out are asked again.
 */
export async function translateLines(
  settings: Settings,
  lines: string[],
  studyLang: string,
  nativeLang: string,
  signal?: AbortSignal,
  onLine?: (index: number, text: string) => void,
): Promise<string[]> {
  const out: (string | undefined)[] = lines.map(() => undefined)
  const put = (i: number, text: string) => {
    if (out[i] !== undefined) return
    out[i] = text
    onLine?.(i, text)
  }
  let todo = lines.map((_, i) => i)
  // Ask again for the missing lines, while each answer brings new lines.
  while (todo.length) {
    const ids = todo
    await askLines(
      settings,
      ids.map((i) => lines[i]!),
      studyLang,
      nativeLang,
      signal,
      (j, text) => put(ids[j]!, text),
    )
    todo = ids.filter((i) => out[i] === undefined)
    if (todo.length === ids.length) break
  }
  if (todo.length === 1) throw new Error('Model returned a wrong number of lines.')
  // No progress: smaller requests are easier for the model to keep aligned.
  const half = Math.ceil(todo.length / 2)
  for (const part of todo.length ? [todo.slice(0, half), todo.slice(half)] : []) {
    await translateLines(
      settings,
      part.map((i) => lines[i]!),
      studyLang,
      nativeLang,
      signal,
      (j, text) => put(part[j]!, text),
    )
  }
  return out as string[]
}

/** One request. `onLine` gets each finished line of the answer, with its index in `lines`. */
async function askLines(
  settings: Settings,
  lines: string[],
  studyLang: string,
  nativeLang: string,
  signal: AbortSignal | undefined,
  onLine: (index: number, text: string) => void,
): Promise<void> {
  // Numbered keys keep the model aligned. A plain array lets it merge or split lines, mostly
  // with auto-generated captions, where a sentence runs across several lines. The model also
  // copies each line: small models still merge a sentence into one key and shift the next
  // lines, and the copy shows which line a translation really belongs to.
  const system =
    `You translate subtitle lines from ${name(studyLang)} to ${name(nativeLang)}. ` +
    `Input is a JSON object that maps line numbers to lines. A sentence can start in one line ` +
    `and end in a different line. Answer with ONLY a JSON object with the same keys. Under ` +
    `each key put an array: [the line copied exactly, its translation]. Never merge or split ` +
    `lines. Keep each translation short and natural.`
  const user = JSON.stringify(Object.fromEntries(lines.map((line, i) => [i + 1, line])))
  const read = (text: string) => {
    for (const [key, source, line] of finishedLines(text)) {
      // One line cannot go to a wrong place: keep it also when the copy is changed or missing.
      if (lines.length === 1) onLine(0, line)
      if (lines.length === 1 || source === null) continue
      const i = matchLine(lines, key - 1, source)
      if (i !== -1) onLine(i, line)
    }
  }
  read(await ask(settings, system, user, { signal, onText: read }))
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
