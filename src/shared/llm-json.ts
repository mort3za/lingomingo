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
    const parsed = JSON.parse(body) as unknown
    // Gemini puts the error object in an array.
    const data = (Array.isArray(parsed) ? parsed[0] : parsed) as {
      error?: string | { message?: string }
      message?: string
    }
    const msg = typeof data.error === 'string' ? data.error : (data.error?.message ?? data.message)
    if (msg) return msg
  } catch {
    // Not JSON.
  }
  return body.slice(0, 200)
}

/**
 * Read the finished `"<number>": ["<source>", "<translation>"]` items from a model answer, also
 * while it is still being written. An item counts only when it is closed. Some models leave out
 * the source (`["<translation>"]` or `"<translation>"`): then `source` is null.
 */
export function finishedLines(
  text: string,
): [key: number, source: string | null, translation: string][] {
  const out: [number, string | null, string][] = []
  const str = '"((?:[^"\\\\]|\\\\.)*)"'
  const item = `"(\\d+)"\\s*:\\s*(?:\\[\\s*${str}\\s*(?:,\\s*${str}\\s*)?\\]|${str})`
  for (const m of text.matchAll(new RegExp(item, 'g'))) {
    const parse = (s: string) => JSON.parse(`"${s}"`) as string
    try {
      if (m[3] !== undefined) out.push([Number(m[1]), parse(m[2]!), parse(m[3])])
      else out.push([Number(m[1]), null, parse(m[2] ?? m[4]!)])
    } catch {
      // Bad escape: skip this line.
    }
  }
  return out
}

/**
 * Index of the line that the model copied as `source`, the nearest one to `key` first.
 * -1 if no line is similar. Small local models drop or merge a line and then put the next
 * lines under the wrong keys: the copied text, not the key, tells which line it is.
 */
export function matchLine(lines: string[], key: number, source: string): number {
  const src = normalize(source)
  const order = lines.map((_, i) => i).sort((a, b) => Math.abs(a - key) - Math.abs(b - key))
  return order.find((i) => similarity(normalize(lines[i]!), src) >= 0.9) ?? -1
}

const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * Shared character pairs, out of the pairs of the longer text: 1 is the same text. A line
 * merged with the next line is too long, so it does not match either line.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const pairs = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const p = a.slice(i, i + 2)
    pairs.set(p, (pairs.get(p) ?? 0) + 1)
  }
  let same = 0
  for (let i = 0; i < b.length - 1; i++) {
    const p = b.slice(i, i + 2)
    const n = pairs.get(p) ?? 0
    if (n) {
      same++
      pairs.set(p, n - 1)
    }
  }
  return same / (Math.max(a.length, b.length) - 1)
}
