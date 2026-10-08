// Makes, in public/freq/:
// - <lang>.txt: "word count" lines, the 20,000 most frequent word forms, most frequent first.
//   From hermitdave/FrequencyWords (OpenSubtitles 2018), CC BY-SA 4.0.
// - <lang>-lemmas.txt: "lemma<TAB>form" lines, for the forms in <lang>.txt.
//   From michmech/lemmatization-lists, ODbL.
// The two sources have share-alike licenses that do not mix, so each file holds data from one
// source only. The extension joins them at runtime (parseWordList in src/shared/vocab.ts).
// Run: bun scripts/freq-lists.ts
import { LEMMA_LANGS, LEVEL_LANGS } from '../src/shared/vocab'

const SIZE = 20_000
// File names in the frequency repo, when they are not the language code.
const SOURCE_NAME: Record<string, string> = { zh: 'zh_cn' }

async function get(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return (await res.text()).replace(/\r/g, '')
}

for (const lang of LEVEL_LANGS) {
  const name = SOURCE_NAME[lang] ?? lang
  const text = await get(
    `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${name}/${name}_50k.txt`,
  )
  const counts = new Map<string, number>()
  for (const line of text.split('\n')) {
    const [word, n] = line.split(' ')
    const key = word?.toLocaleLowerCase()
    // Skip punctuation-only entries.
    if (key && n && /\p{L}/u.test(key)) counts.set(key, (counts.get(key) ?? 0) + Number(n))
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, SIZE)
  await Bun.write(`public/freq/${lang}.txt`, top.map(([w, n]) => `${w} ${n}`).join('\n') + '\n')

  let pairs = 0
  if (LEMMA_LANGS.includes(lang)) {
    const forms = new Set(top.map(([w]) => w))
    const lines = new Set<string>()
    const source = await get(
      `https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-${lang}.txt`,
    )
    for (const line of source.split('\n')) {
      const [lemma, form] = line.toLocaleLowerCase().split('\t')
      if (lemma && form && forms.has(form)) lines.add(`${lemma}\t${form}`)
    }
    await Bun.write(`public/freq/${lang}-lemmas.txt`, [...lines].join('\n') + '\n')
    pairs = lines.size
  }
  console.log(lang, top.length, 'forms', pairs, 'lemma pairs')
}
