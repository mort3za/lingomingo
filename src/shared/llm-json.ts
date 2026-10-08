/** Pull the first JSON value (array or object) out of a model answer that may have extra text. */
export function extractJson(text: string): unknown {
  const open = text.search(/[[{]/)
  if (open === -1) throw new Error('No JSON in model answer')
  const close = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'))
  return JSON.parse(text.slice(open, close + 1))
}

/** Get the human message from an API error body (OpenAI, Claude or Ollama shape). Falls back to the raw text. */
export function errorMessage(body: string): string {
  try {
    const data = JSON.parse(body) as { error?: string | { message?: string }; message?: string }
    const msg = typeof data.error === 'string' ? data.error : (data.error?.message ?? data.message)
    if (msg) return msg
  } catch {
    // Not JSON.
  }
  return body.slice(0, 200)
}

/**
 * Read the finished `"<number>": "<text>"` pairs from a model answer, also while it is still
 * being written. A pair counts only when its closing quote is there.
 */
export function finishedLines(text: string): Map<number, string> {
  const out = new Map<number, string>()
  for (const m of text.matchAll(/"(\d+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    try {
      out.set(Number(m[1]), JSON.parse(`"${m[2]}"`) as string)
    } catch {
      // Bad escape: skip this line.
    }
  }
  return out
}
