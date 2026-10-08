/** Pull the first JSON value (array or object) out of a model answer that may have extra text. */
export function extractJson(text: string): unknown {
  const open = text.search(/[[{]/)
  if (open === -1) throw new Error('No JSON in model answer')
  const close = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'))
  return JSON.parse(text.slice(open, close + 1))
}
