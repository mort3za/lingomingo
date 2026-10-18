import { errorMessage, extractJson, finishedLines, matchLine } from '@/shared/llm-json'
import type { Have, WordExtras, WordTranslation } from '@/shared/messages'
import { wordKey } from '@/shared/tokenize'
import { LANGUAGES, type Settings } from '@/shared/types'
import { createQueue } from './queue'

/** `onText` turns on streaming: it gets the whole answer so far after each new piece. */
interface Call {
  signal?: AbortSignal
  onText?: (text: string) => void
  /** Place in the local model queue, see `PRIORITY`. Default: `PRIORITY.lines`. */
  priority?: number
}

/** Lower goes first: the user waits for a word, but subtitle lines are asked ahead of time. */
const PRIORITY = { word: 0, extras: 1, lines: 2 }

// A local server does one request at a time, and the others wait there in order. Here they wait
// in our queue, so a word request does not wait behind subtitle lines that are not needed yet.
const localQueue = createQueue()
const LOCAL = new Set(['ollama', 'lmstudio', 'local'])

function ask(settings: Settings, system: string, user: string, call: Call = {}): Promise<string> {
  const send = () => request(settings, system, user, call)
  if (!LOCAL.has(settings.provider)) return send()
  return localQueue(call.priority ?? PRIORITY.lines, send, call.signal)
}

async function request(
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

  if (settings.provider === 'gemini') {
    if (!settings.geminiKey) throw new Error('Add your Gemini API key in Settings.')
    return chat(
      'Gemini API',
      'https://generativelanguage.googleapis.com/v1beta/openai',
      settings.geminiModel,
      system,
      user,
      call,
      settings.geminiKey,
      // Google recommends the default temperature for Gemini 3: lower values can make it loop.
      // Gemini 3 cannot turn thinking off; "minimal" is the lowest level.
      { temperature: undefined, reasoning_effort: 'minimal' },
    )
  }

  if (settings.provider === 'openrouter') {
    if (!settings.openrouterKey) throw new Error('Add your OpenRouter API key in Settings.')
    const args = [
      'OpenRouter',
      'https://openrouter.ai/api/v1',
      settings.openrouterModel,
      system,
      user,
      call,
      settings.openrouterKey,
    ] as const
    // Models that always think reject effort "none": then ask again without it.
    try {
      return await chat(...args, { reasoning: { effort: 'none' } })
    } catch (e) {
      if (!(e instanceof Error && /^OpenRouter 400/.test(e.message))) throw e
      return chat(...args)
    }
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
        // Small models can drop a quote or a bracket. JSON mode makes the answer always valid JSON.
        response_format: { type: 'json_object' },
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

/** OpenAI-compatible chat completion (OpenAI, xAI, DeepSeek, Gemini, OpenRouter, Ollama, llama.cpp, LM Studio). */
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
  }).catch((e: unknown) => {
    // No server at the address: fetch gives only "Failed to fetch".
    if (e instanceof TypeError) {
      throw new Error(`${label}: cannot connect to ${base}. Is the server running at this address?`)
    }
    throw e
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

/** `before` and `after` = the subtitle lines around the sentence, if any. */
export async function translateWord(
  settings: Settings,
  input: { word: string; sentence: string; before?: string; after?: string },
  studyLang: string,
  nativeLang: string,
): Promise<WordTranslation> {
  const noun = NOUN_EXAMPLES[studyLang]
  const study = name(studyLang)
  const system =
    `You are a dictionary. Translate a ${study} word to ${name(nativeLang)}, ` +
    `using the sentence for meaning. "before" and "after" are the subtitle lines around the ` +
    `sentence: when the sentence continues there, read them as one sentence. The word can be ` +
    `a name: then keep it as it is. Never ` +
    `translate a different word of the sentence. Answer with ONLY JSON: {"translations":["best","alt1","alt2"],` +
    (noun
      ? `"pos":"<part of speech of the word in this sentence>",` +
        `"headword":"<noun with article>","plural":"<plural with article>",`
      : '') +
    `"ipa":"<pronunciation>","phrase":{"text":"<expression>","translation":"<its translation>"}} ` +
    `(1 to 3 short items, the word in its dictionary form if it helps). ` +
    (noun
      ? `"pos" is one word, like "noun", "verb" or "adjective". Add "headword" and "plural" ` +
        `only when "pos" is "noun": the ` +
        `singular with the ${study} article that dictionaries use (like "${noun}"), and the ` +
        `plural with its article. Leave out "plural" when the noun has none. Leave out both ` +
        `for a verb or an adjective, also when a noun with the same stem exists. `
      : '') +
    `"ipa" is the IPA of the ${study} word itself in its dictionary form (singular, ` +
    `infinitive), not of the translation or the expression, without an article and without ` +
    `slashes. ` +
    `Add "phrase" only when the word is part of a ${study} multi-word expression in this ` +
    `sentence: a phrasal verb, a separable verb, or an idiom whose meaning is different from ` +
    `the meaning of its words. "text" is the ${study} expression in its dictionary form. Most ` +
    `words have no expression: then leave "phrase" out. Words that are only used together (a ` +
    `verb with its object, place or adverb, like "go to the park" or "run fast") are not an ` +
    `expression. Never give only the dictionary form of the word.`
  const { word, before, sentence, after } = input
  const user = JSON.stringify({ word, before, sentence, after })
  return parseWordAnswer(await ask(settings, system, user, { priority: PRIORITY.word }), word)
}

/** Study languages where nouns have an article that shows their gender, with an example. */
const NOUN_EXAMPLES: Record<string, string> = {
  de: 'die Arbeit',
  nl: 'het huis',
  fr: 'la maison',
  es: 'la casa',
  it: 'la casa',
  pt: 'a casa',
  sv: 'en bok',
}

/** Reads the `translateWord` answer. Only bad or missing translations give an error. */
export function parseWordAnswer(text: string, word: string): WordTranslation {
  const out = extractJson(text) as Record<string, unknown>
  if (!Array.isArray(out.translations)) throw new Error('Bad answer from model.')
  const p = (out.phrase ?? {}) as { text?: unknown; translation?: unknown }
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const phrase = { text: str(p.text), translation: str(p.translation) }
  // Only for a noun, and with its article ("die Arbeit", "l'eau").
  const noun = !('pos' in out) || str(out.pos).toLowerCase() === 'noun'
  const headword = noun && /\s|['’]/.test(str(out.headword)) ? str(out.headword) : null
  const ipa = str(out.ipa).replace(/^[/[]+|[/\]]+$/g, '')
  return {
    translations: out.translations.map(String).slice(0, 3),
    headword,
    plural: (headword && str(out.plural)) || null,
    ipa: ipa || null,
    phrase:
      phrase.text && phrase.translation && wordKey(phrase.text) !== wordKey(word) ? phrase : null,
  }
}

/** Number of new examples for a word that has `have`. */
const MORE = 3

/**
 * Translations, the sentence translation and `count` example sentences for each word, in one
 * request. Same order as `words`; null when the model leaves a word out.
 */
export async function wordExtras(
  settings: Settings,
  words: { word: string; sentence: string | null; have?: Have }[],
  studyLang: string,
  nativeLang: string,
  count = 2,
): Promise<(WordExtras | null)[]> {
  const system =
    `You help a learner of ${name(studyLang)} who speaks ${name(nativeLang)}. Input is a JSON ` +
    `object that maps numbers to {"word","sentence"}. The sentence shows the meaning of the ` +
    `word, or is empty. The word can be a name: then keep it as it is. Never use a different ` +
    `word of the sentence. Answer with ONLY a JSON object with the same keys. Under each key put ` +
    `{"translations":["best","alt"],"sentence":"<the sentence in ${name(nativeLang)}, or empty>",` +
    `"examples":[["<example>","<its translation>"],["<example>","<its translation>"]]}. ` +
    `Give 1 to 3 short translations of the word. Write ${count} new examples in ${name(studyLang)}: ` +
    `short (under 12 words), simple, natural, with the word in the same meaning. In each ` +
    `example, put the word between asterisks, like *word*, also when its form changes.` +
    (words.some((w) => w.have)
      ? ` When an item has "have", the learner has those translations and examples already: ` +
        `give only other translations (an empty list when there are none) and ${MORE} ` +
        `examples that are different from them.`
      : '')
  const user = JSON.stringify(
    Object.fromEntries(
      words.map((w, i) => [i + 1, { word: w.word, sentence: w.sentence ?? '', have: w.have }]),
    ),
  )
  const out = extractJson(
    await ask(settings, system, user, { priority: PRIORITY.extras }),
  ) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return words.map((w, i) => {
    const r = out[i + 1] as
      { translations?: unknown; sentence?: unknown; examples?: unknown } | undefined
    if (!r || typeof r !== 'object') return null
    const examples = (Array.isArray(r.examples) ? r.examples : [])
      .filter((e): e is unknown[] => Array.isArray(e))
      .map(([s, t]) => ({ sentence: str(s), translation: str(t).replaceAll('*', '') }))
      .filter((e) => e.sentence && e.translation)
      .slice(0, w.have ? MORE : count)
    return {
      translations: (Array.isArray(r.translations) ? r.translations : [])
        .map(str)
        .filter(Boolean)
        .slice(0, 3),
      sentence: str(r.sentence) || null,
      examples,
    }
  })
}
