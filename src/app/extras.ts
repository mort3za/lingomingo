import { send } from '@/shared/messages'
import { extrasPatch, morePatch } from '@/shared/review'
import { patchWords } from '@/shared/storage'
import type { SavedWord } from '@/shared/types'

/**
 * Gets translations and example sentences from the AI in one request, and saves them on the
 * words. All words must have the same languages. `more` = add new ones to what the words
 * have; else fill only what is missing. Returns the saved changes, by word id.
 */
export async function fetchExtras(
  words: SavedWord[],
  more = false,
): Promise<Record<string, Partial<SavedWord>>> {
  const w0 = words[0]
  if (!w0) return {}
  const out = await send({
    type: 'word-extras',
    words: words.map((w) => ({
      word: w.text,
      sentence: w.context?.sentence ?? null,
      have: more
        ? { translations: w.translations, examples: (w.examples ?? []).map((e) => e.sentence) }
        : undefined,
    })),
    studyLang: w0.langCode,
    nativeLang: w0.translationLang,
  })
  const patches: Record<string, Partial<SavedWord>> = {}
  words.forEach((w, i) => {
    const r = out[i]
    if (r) patches[w.id] = more ? morePatch(w, r) : extrasPatch(w, r)
  })
  await patchWords(patches)
  return patches
}
