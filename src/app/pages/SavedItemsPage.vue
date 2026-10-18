<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { toCsv, toJson } from '@/shared/export'
import { getSavedItems, onStorageKey, removeItems, setStage } from '@/shared/storage'
import SpeakButton from '@/shared/SpeakButton.vue'
import {
  dirOf,
  EXPRESSION_TAG,
  LANGUAGES,
  type SavedItem,
  type SavedWord,
  type Stage,
} from '@/shared/types'
import { ignoreKey } from '../shortcuts'
import WordDialog from '../WordDialog.vue'

const items = ref<SavedItem[]>([])
const tab = ref<'WORD' | 'PHRASE'>('WORD')
const query = ref('')
const lang = ref('')
const stages = ref<Record<Stage, boolean>>({ KNOWN: true, LEARNING: true, SKIPPED: true })
const picked = ref(new Set<string>())
const search = useTemplateRef<HTMLInputElement>('search')
/** The word that shows in the card dialog. The dialog closes when the word is deleted. */
const cardId = ref<string | null>(null)
const card = computed(() =>
  items.value.find((i): i is SavedWord => i.id === cardId.value && i.itemType === 'WORD'),
)

const refresh = async () =>
  (items.value = (await getSavedItems()).sort((a, b) => b.createdAt - a.createdAt))
let stop = () => {}
onMounted(() => {
  void refresh()
  stop = onStorageKey('savedItems', refresh)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('keydown', onKeydown)
})

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
const tabCount = computed(() => items.value.filter((i) => i.itemType === tab.value).length)

// Rows that the filters hide are not selected, so bulk actions change only what you see.
watch(shown, (rows) => {
  const ids = new Set(rows.map((i) => i.id))
  if ([...picked.value].some((id) => !ids.has(id)))
    picked.value = new Set([...picked.value].filter((id) => ids.has(id)))
})

const allPicked = computed(
  () => shown.value.length > 0 && shown.value.every((i) => picked.value.has(i.id)),
)
function toggleAll() {
  picked.value = allPicked.value ? new Set() : new Set(shown.value.map((i) => i.id))
}
/** Row of the last click, for Shift+click range selection. */
let anchor: string | null = null
/** A click on the row or its checkbox toggles it. Shift+click sets the rows up to the last click. */
function onRowClick(id: string, e: MouseEvent) {
  const el = e.target as HTMLElement
  if (el.closest('a') || getSelection()?.toString()) return
  const next = new Set(picked.value)
  const rows = shown.value
  const from = rows.findIndex((i) => i.id === anchor)
  const to = rows.findIndex((i) => i.id === id)
  if (e.shiftKey && from !== -1 && to !== -1) {
    const on = picked.value.has(anchor!)
    for (const i of rows.slice(Math.min(from, to), Math.max(from, to) + 1))
      if (on) next.add(i.id)
      else next.delete(i.id)
  } else if (!next.delete(id)) next.add(id)
  anchor = id
  picked.value = next
  // After Shift+click, the native toggle of the checkbox can be different from the new state.
  if (el instanceof HTMLInputElement) el.checked = next.has(id)
}
async function bulkStage(stage: Stage) {
  await setStage([...picked.value], stage)
}
async function bulkDelete() {
  const n = picked.value.size
  if (!confirm(`Delete ${n} ${n === 1 ? 'item' : 'items'}? You cannot undo this.`)) return
  await removeItems([...picked.value])
  picked.value = new Set()
}

function onKeydown(e: KeyboardEvent) {
  if (card.value) {
    if (e.key === 'Escape') cardId.value = null
    return
  }
  if (e.key === 'Escape' && e.target === search.value) return search.value?.blur()
  if (ignoreKey(e)) return
  const key = e.key.toLowerCase()
  const stage = ({ k: 'KNOWN', l: 'LEARNING', n: 'SKIPPED' } as const)[key as 'k' | 'l' | 'n']
  if (key === '/') search.value?.focus()
  else if (key === 'a') toggleAll()
  else if (key === 'escape' && picked.value.size) picked.value = new Set()
  else if (stage && picked.value.size) void bulkStage(stage)
  else if ((key === 'delete' || key === 'backspace') && picked.value.size) void bulkDelete()
  else return
  e.preventDefault()
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

// Lucide "eye", in the style of the other icons.
const eyeIcon = [
  'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
  'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
]

const field =
  'rounded border border-fg/10 bg-surface-deep px-3 py-1.5 text-sm outline-none focus:border-accent'
const btn = 'rounded px-3 py-1.5 text-sm hover:bg-fg/10 '
const bulkBtn = btn + 'bg-fg/15 disabled:pointer-events-none disabled:opacity-40'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="t in [
          ['WORD', 'Saved Words'],
          ['PHRASE', 'Saved Phrases'],
        ] as const"
        :key="t[0]"
        :class="btn + (tab === t[0] ? 'bg-panel text-fg' : 'text-neutral-400')"
        @click="tab = t[0]"
      >
        {{ t[1] }}
      </button>
      <div class="flex-1" />
      <button :class="btn + 'border border-fg/20'" @click="exportCsv">Export CSV</button>
      <button :class="btn + 'bg-accent text-white [--color-fg:white]'" @click="exportJson">
        Export JSON
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <input ref="search" v-model="query" type="search" :class="field" placeholder="Search (/)" />
      <select v-model="lang" :class="field">
        <option value="">All languages</option>
        <option v-for="l in langs" :key="l" :value="l">{{ LANGUAGES[l] ?? l }}</option>
      </select>
      <label
        v-for="s in ['KNOWN', 'LEARNING', 'SKIPPED'] as const"
        :key="s"
        class="flex items-center gap-1 text-sm"
      >
        <input v-model="stages[s]" type="checkbox" />
        <span :class="stageColor[s]">{{ stageLabel[s] }} ({{ count(s) }})</span>
      </label>
    </div>

    <!-- Always shown, so selecting a row does not move the table. -->
    <div
      class="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded px-3 py-2 text-sm transition-colors md:top-0"
      :class="picked.size ? 'bg-accent text-white [--color-fg:white]' : 'bg-panel text-neutral-400'"
    >
      <span class="mr-2 tabular-nums">
        {{
          picked.size ? `${picked.size} selected` : `${shown.length} shown · click rows to select`
        }}
      </span>
      <button :class="bulkBtn" :disabled="!picked.size" title="K" @click="bulkStage('KNOWN')">
        ✓ Known
      </button>
      <button :class="bulkBtn" :disabled="!picked.size" title="L" @click="bulkStage('LEARNING')">
        Learning
      </button>
      <button :class="bulkBtn" :disabled="!picked.size" title="N" @click="bulkStage('SKIPPED')">
        ⊘ Don't learn
      </button>
      <div class="flex-1" />
      <button v-if="picked.size" :class="btn" title="Esc" @click="picked = new Set()">Clear</button>
      <button :class="bulkBtn" :disabled="!picked.size" title="Delete" @click="bulkDelete">
        Delete
      </button>
    </div>

    <p v-if="!shown.length" class="py-12 text-center text-neutral-500">
      <template v-if="tabCount">No items match the filters.</template>
      <template v-else>Nothing here yet. Save words and phrases while watching YouTube.</template>
    </p>

    <table v-else class="w-full text-left text-sm">
      <thead class="text-xs text-neutral-400 uppercase">
        <tr>
          <th class="w-8 p-2">
            <input type="checkbox" :checked="allPicked" @change="toggleAll" />
          </th>
          <th class="p-2">{{ tab === 'WORD' ? 'Word' : 'Phrase' }}</th>
          <th class="p-2">Translation</th>
          <th class="hidden p-2 sm:table-cell">Stage</th>
          <th class="hidden p-2 md:table-cell">Source</th>
          <th class="w-10 p-2">
            <span class="sr-only">{{ tab === 'WORD' ? 'Card' : 'Play' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="i in shown"
          :key="i.id"
          class="group cursor-pointer border-t border-fg/5"
          :class="picked.has(i.id) ? 'bg-accent/15 hover:bg-accent/20' : 'hover:bg-fg/5'"
          @mousedown="(e) => e.shiftKey && e.preventDefault()"
          @click="onRowClick(i.id, $event)"
        >
          <td class="p-2">
            <input type="checkbox" :checked="picked.has(i.id)" :aria-label="`Select ${i.text}`" />
          </td>
          <td class="p-2 text-start" :class="stageColor[i.stage]" :dir="dirOf(i.langCode)">
            {{ (i.itemType === 'WORD' && i.headword) || i.text }}
            <span
              v-if="i.itemType === 'WORD' && i.tags?.includes(EXPRESSION_TAG)"
              class="ms-1 rounded bg-fg/10 px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wide text-fg/60 uppercase"
              >Expression</span
            >
            <div
              v-if="i.itemType === 'WORD' && (i.ipa || i.plural)"
              class="text-xs text-neutral-400"
            >
              <span v-if="i.ipa" dir="ltr">/{{ i.ipa }}/</span>
              <template v-if="i.ipa && i.plural"> · </template>
              <template v-if="i.plural">pl. {{ i.plural }}</template>
            </div>
            <div v-if="i.itemType === 'WORD' && i.context" class="text-xs text-neutral-500">
              {{ i.context.sentence }}
            </div>
          </td>
          <td class="p-2 text-start text-neutral-300" :dir="dirOf(i.translationLang)">
            {{ translationOf(i) }}
          </td>
          <td class="hidden p-2 sm:table-cell" :class="stageColor[i.stage]">
            {{ stageLabel[i.stage] }}
          </td>
          <td class="hidden p-2 md:table-cell">
            <a
              v-if="i.source"
              :href="watchUrl(i)"
              target="_blank"
              class="text-neutral-500 hover:text-fg hover:underline"
              >{{ i.source.title || 'YouTube' }}</a
            >
          </td>
          <td class="p-2">
            <SpeakButton
              v-if="i.itemType === 'PHRASE'"
              class="p-1.5!"
              :text="i.text"
              :lang="i.langCode"
              on-hover
              @click.stop
            />
            <button
              v-else
              class="grid size-7 place-items-center rounded text-neutral-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-fg/10 hover:text-fg focus-visible:opacity-100"
              title="Show card"
              :aria-label="`Show the card of ${i.text}`"
              @click.stop="cardId = i.id"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-4"
              >
                <path v-for="d in eyeIcon" :key="d" :d="d" />
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <WordDialog v-if="card" :key="card.id" :word="card" @close="cardId = null" />
  </div>
</template>
