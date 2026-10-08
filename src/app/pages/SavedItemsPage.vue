<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { toCsv, toJson } from '@/shared/export'
import { getSavedItems, onStorageKey, removeItems, setStage } from '@/shared/storage'
import { dirOf, LANGUAGES, type SavedItem, type Stage } from '@/shared/types'

const items = ref<SavedItem[]>([])
const tab = ref<'WORD' | 'PHRASE'>('WORD')
const query = ref('')
const lang = ref('')
const stages = ref<Record<Stage, boolean>>({ KNOWN: true, LEARNING: true, SKIPPED: true })
const picked = ref(new Set<string>())

const refresh = async () =>
  (items.value = (await getSavedItems()).sort((a, b) => b.createdAt - a.createdAt))
let stop = () => {}
onMounted(() => {
  void refresh()
  stop = onStorageKey('savedItems', refresh)
})
onBeforeUnmount(() => stop())

const langs = computed(() => [...new Set(items.value.map((i) => i.langCode))])
const stageOf = (i: SavedItem) => stages.value[i.stage]
const shown = computed(() => {
  const q = query.value.toLowerCase()
  return items.value.filter(
    (i) =>
      i.itemType === tab.value &&
      stageOf(i) &&
      (!lang.value || i.langCode === lang.value) &&
      (!q || i.text.toLowerCase().includes(q)),
  )
})
const count = (s: Stage) =>
  items.value.filter((i) => i.itemType === tab.value && i.stage === s).length

const allPicked = computed(
  () => shown.value.length > 0 && shown.value.every((i) => picked.value.has(i.id)),
)
function toggleAll() {
  picked.value = allPicked.value ? new Set() : new Set(shown.value.map((i) => i.id))
}
function toggle(id: string) {
  const next = new Set(picked.value)
  if (!next.delete(id)) next.add(id)
  picked.value = next
}
async function bulkStage(stage: Stage) {
  await setStage([...picked.value], stage)
}
async function bulkDelete() {
  await removeItems([...picked.value])
  picked.value = new Set()
}

function download(name: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
const exportRows = () =>
  picked.value.size ? items.value.filter((i) => picked.value.has(i.id)) : shown.value
const exportCsv = () => download('lingomingo.csv', toCsv(exportRows()), 'text/csv')
const exportJson = () => download('lingomingo.json', toJson(exportRows()), 'application/json')

const stageColor: Record<Stage, string> = {
  KNOWN: 'text-emerald-300',
  LEARNING: 'text-orange-300',
  SKIPPED: 'text-violet-300/70',
}
const stageLabel: Record<Stage, string> = {
  KNOWN: 'Known',
  LEARNING: 'Learning',
  SKIPPED: "Don't learn",
}
const translationOf = (i: SavedItem) =>
  i.itemType === 'WORD' ? i.translations.join(', ') : (i.translation ?? '')
const watchUrl = (i: SavedItem) =>
  i.source
    ? `https://www.youtube.com/watch?v=${i.source.videoId}&t=${Math.floor(i.source.startMs / 1000)}s`
    : ''

const field =
  'rounded border border-white/10 bg-surface-deep px-3 py-1.5 text-sm outline-none focus:border-accent'
const btn = 'rounded px-3 py-1.5 text-sm hover:bg-white/10 '
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <button
        v-for="t in [
          ['WORD', 'Saved Words'],
          ['PHRASE', 'Saved Phrases'],
        ] as const"
        :key="t[0]"
        :class="btn + (tab === t[0] ? 'bg-panel text-white' : 'text-neutral-400')"
        @click="((tab = t[0]), (picked = new Set()))"
      >
        {{ t[1] }}
      </button>
      <div class="flex-1" />
      <button :class="btn + 'border border-white/20'" @click="exportCsv">Export CSV</button>
      <button :class="btn + 'bg-accent'" @click="exportJson">Export JSON</button>
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <input v-model="query" :class="field" placeholder="Search" />
      <select v-model="lang" :class="field">
        <option value="">All languages</option>
        <option v-for="l in langs" :key="l" :value="l">{{ LANGUAGES[l] ?? l }}</option>
      </select>
      <label
        v-for="s in ['KNOWN', 'LEARNING', 'SKIPPED'] as const"
        :key="s"
        class="flex items-center gap-1 text-sm"
      >
        <input v-model="stages[s]" type="checkbox" class="accent-accent" />
        <span :class="stageColor[s]">{{ stageLabel[s] }} ({{ count(s) }})</span>
      </label>
    </div>

    <div v-if="picked.size" class="flex items-center gap-2 rounded bg-accent px-3 py-2 text-sm">
      <span class="mr-2">{{ picked.size }} selected:</span>
      <button :class="btn + 'bg-white/15'" @click="bulkStage('KNOWN')">✓ Known</button>
      <button :class="btn + 'bg-white/15'" @click="bulkStage('LEARNING')">Learning</button>
      <button :class="btn + 'bg-white/15'" @click="bulkStage('SKIPPED')">⊘ Don't learn</button>
      <div class="flex-1" />
      <button :class="btn + 'bg-white/15'" @click="bulkDelete">Delete</button>
    </div>

    <p v-if="!shown.length" class="py-12 text-center text-neutral-500">
      Nothing here yet. Save words and phrases while watching YouTube.
    </p>

    <table v-else class="w-full text-left text-sm">
      <thead class="text-xs text-neutral-400 uppercase">
        <tr>
          <th class="w-8 p-2">
            <input type="checkbox" class="accent-accent" :checked="allPicked" @change="toggleAll" />
          </th>
          <th class="p-2">{{ tab === 'WORD' ? 'Word' : 'Phrase' }}</th>
          <th class="p-2">Translation</th>
          <th class="p-2">Stage</th>
          <th class="p-2">Source</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in shown" :key="i.id" class="border-t border-white/5 hover:bg-white/5">
          <td class="p-2">
            <input
              type="checkbox"
              class="accent-accent"
              :checked="picked.has(i.id)"
              @change="toggle(i.id)"
            />
          </td>
          <td class="p-2 text-start" :class="stageColor[i.stage]" :dir="dirOf(i.langCode)">
            {{ i.text }}
            <div v-if="i.itemType === 'WORD' && i.context" class="text-xs text-neutral-500">
              {{ i.context.sentence }}
            </div>
          </td>
          <td class="p-2 text-start text-neutral-300" :dir="dirOf(i.translationLang)">
            {{ translationOf(i) }}
          </td>
          <td class="p-2" :class="stageColor[i.stage]">{{ stageLabel[i.stage] }}</td>
          <td class="p-2">
            <a
              v-if="i.source"
              :href="watchUrl(i)"
              target="_blank"
              class="text-accent hover:underline"
              >{{ i.source.title || 'YouTube' }}</a
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
