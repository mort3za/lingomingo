<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type Directive,
} from 'vue'
import { getSettings, onStorageKey, patchSettings } from '@/shared/storage'
import { LANGUAGES } from '@/shared/types'
import { pickTrack } from '@/shared/captions'
import {
  CHANNELS,
  cachedChannelPhotos,
  channelPhoto,
  fetchChannelVideos,
  videoTracks,
  type CatalogueVideo,
  type TrackInfo,
} from '../catalogue'

const studyLang = ref('')
const videos = ref<CatalogueVideo[]>([])
const errors = ref<string[]>([])
const loading = ref(false)
const channelId = ref('') // '' = all channels
const sort = ref<'date' | 'views'>('date')
const query = ref('')
const hideShorts = ref(false)

const channels = computed(() => CHANNELS[studyLang.value] ?? [])

// Pinned channels show first. Sort is stable, so each group keeps the catalogue order.
const pinned = ref<string[]>([])
const sortedChannels = computed(() =>
  [...channels.value].sort(
    (a, b) => Number(pinned.value.includes(b.id)) - Number(pinned.value.includes(a.id)),
  ),
)
// Channel search: the header shows a search field in place of its title.
const channelSearch = ref(false)
const channelQuery = ref('')
const channelInput = useTemplateRef<HTMLInputElement>('channelInput')
async function openChannelSearch() {
  channelSearch.value = true
  await nextTick()
  channelInput.value?.focus()
}
function closeChannelSearch() {
  channelSearch.value = false
  channelQuery.value = ''
}
const foundChannels = computed(() => {
  const q = channelQuery.value.toLowerCase()
  return sortedChannels.value.filter((c) => !q || c.name.toLowerCase().includes(q))
})
function togglePin(id: string) {
  // A plain array: chrome.storage saves a Vue proxy as an object, not an array.
  const list = pinned.value.includes(id)
    ? pinned.value.filter((p) => p !== id)
    : [...pinned.value, id]
  pinned.value = list
  void patchSettings({ pinnedChannels: list })
}

async function refreshLang() {
  const settings = await getSettings()
  // Older versions of the settings page saved this list as an object ({0: id, 1: id}).
  pinned.value = Object.values(settings.pinnedChannels)
  const lang = settings.studyLang
  // Cached photos show together with their rows, not after the rows come into view.
  const cached = await cachedChannelPhotos((CHANNELS[lang] ?? []).map((c) => c.id))
  photos.value = { ...photos.value, ...cached }
  studyLang.value = lang
}
let stop = () => {}
onMounted(() => {
  void refreshLang()
  stop = onStorageKey('settings', refreshLang)
})
onBeforeUnmount(() => stop())

watch(channels, async (list) => {
  channelId.value = ''
  loading.value = true
  const results = await Promise.allSettled(list.map(fetchChannelVideos))
  videos.value = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  errors.value = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : []))
  loading.value = false
})

const visible = computed(() => videos.value.filter((v) => !hideShorts.value || !v.isShort))
function pickChannel(id: string) {
  channelId.value = id
  window.scrollTo({ top: 0 })
}
const countOf = (id: string) => visible.value.filter((v) => v.channelId === id).length
const shown = computed(() => {
  const q = query.value.toLowerCase()
  return visible.value
    .filter(
      (v) =>
        (!channelId.value || v.channelId === channelId.value) &&
        (!q || v.title.toLowerCase().includes(q)),
    )
    .sort((a, b) => (sort.value === 'date' ? b.published - a.published : b.views - a.views))
})

// The list shows PAGE videos, and PAGE more each time its end comes into view.
const PAGE = 30
const limit = ref(PAGE)
const page = computed(() => shown.value.slice(0, limit.value))
watch(shown, () => (limit.value = PAGE))

/** `v-visible="fn"` calls fn each time the element comes into view. */
const observers = new WeakMap<Element, IntersectionObserver>()
const vVisible: Directive<HTMLElement, () => void> = {
  mounted(el, { value }) {
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && value())
    io.observe(el)
    observers.set(el, io)
  },
  unmounted: (el) => observers.get(el)?.disconnect(),
}

// Channel photos load when their row comes into view. On error the row keeps its letter.
const photos = ref<Record<string, string>>({})
const asked = new Set<string>()
function loadPhoto(id: string) {
  if (asked.has(id)) return
  asked.add(id)
  channelPhoto(id).then(
    (url) => (photos.value[id] = url),
    () => {},
  )
}

// Subtitle tracks load when their video comes into view, at most 4 at a time (each one reads
// a large page). On error the video has no badge.
const tracks = ref<Record<string, TrackInfo[]>>({})
const queued = new Set<string>()
const queue: string[] = []
let running = 0
function loadTracks(id: string) {
  if (queued.has(id)) return
  queued.add(id)
  queue.push(id)
  next()
}
function next() {
  const id = running < 4 && queue.shift()
  if (!id) return
  running++
  videoTracks(id)
    .then(
      (t) => (tracks.value[id] = t),
      () => {},
    )
    .finally(() => {
      running--
      next()
    })
}
function subsOf(id: string): 'cc' | 'auto' | 'none' | null {
  const t = tracks.value[id]
  if (!t) return null
  const track = pickTrack(t, studyLang.value)
  return !track ? 'none' : track.kind === 'asr' ? 'auto' : 'cc'
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]
function ago(ms: number) {
  const s = (ms - Date.now()) / 1000
  const [unit, size] = units.find(([, size]) => Math.abs(s) >= size) ?? ['minute', 60]
  return rtf.format(Math.trunc(s / size), unit)
}
const compact = new Intl.NumberFormat('en', { notation: 'compact' })

const watchUrl = (v: CatalogueVideo) => `https://www.youtube.com/watch?v=${v.videoId}`
const thumbUrl = (v: CatalogueVideo) => `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`

const field =
  'rounded border border-white/10 bg-surface-deep px-3 py-1.5 text-sm outline-none focus:border-accent'
// Tabler "pin" icon (a tilted push pin), drawn like the icons in the app nav.
const pinIcon = [
  'M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4',
  'M9 15l-4.5 4.5',
  'M14.5 4l5.5 5.5',
]
// Tabler "search" and "x" icons.
const searchIcon = ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6']
const closeIcon = ['M18 6l-12 12', 'M6 6l12 12']
// Tabler "calendar" and "eye" icons for the sort buttons.
const calendarIcon = [
  'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12',
  'M16 3v4',
  'M8 3v4',
  'M4 11h16',
]
const eyeIcon = [
  'M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0',
  'M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6',
]
const iconAttrs = {
  class: 'size-4',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const
const row = 'flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm hover:bg-white/5 '
</script>

<template>
  <div class="flex gap-6">
    <aside class="w-72 shrink-0 space-y-5">
      <div>
        <div class="mb-1 text-xs text-neutral-400">Sort by</div>
        <div class="flex overflow-hidden rounded border border-white/10">
          <button
            v-for="s in [
              ['date', 'Date', calendarIcon],
              ['views', 'Views', eyeIcon],
            ] as const"
            :key="s[0]"
            class="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-sm"
            :class="sort === s[0] ? 'bg-panel text-white' : 'text-neutral-400 hover:bg-white/5'"
            @click="sort = s[0]"
          >
            <svg v-bind="iconAttrs">
              <path v-for="d in s[2]" :key="d" :d="d" />
            </svg>
            {{ s[1] }}
          </button>
        </div>
      </div>
      <div class="relative">
        <svg
          v-bind="iconAttrs"
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
        >
          <path v-for="d in searchIcon" :key="d" :d="d" />
        </svg>
        <input v-model="query" :class="field + ' w-full ps-9'" placeholder="Search videos" />
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="hideShorts" type="checkbox" class="accent-accent" />
        Hide Shorts
      </label>

      <div class="border-t border-white/10 pt-4">
        <!-- Same height in both states, so the list does not move when the search opens. -->
        <div class="mb-2 flex h-8 items-center gap-2 ps-2">
          <input
            v-if="channelSearch"
            ref="channelInput"
            v-model="channelQuery"
            :class="field + ' h-8 min-w-0 flex-1'"
            placeholder="Search channels"
            @keydown.esc="closeChannelSearch"
          />
          <span v-else class="flex-1 text-neutral-400">Channel</span>
          <button
            class="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            :title="channelSearch ? 'Close search' : 'Search channels'"
            :aria-label="channelSearch ? 'Close search' : 'Search channels'"
            @click="channelSearch ? closeChannelSearch() : openChannelSearch()"
          >
            <svg v-bind="iconAttrs">
              <path v-for="d in channelSearch ? closeIcon : searchIcon" :key="d" :d="d" />
            </svg>
          </button>
        </div>
        <button :class="row + (channelId === '' ? 'bg-panel' : '')" @click="pickChannel('')">
          <span class="grid size-9 place-items-center rounded bg-accent font-semibold">
            {{ studyLang.toUpperCase() }}
          </span>
          <span class="flex-1">All channels</span>
        </button>
        <div
          v-for="c in foundChannels"
          :key="c.id"
          class="group relative"
          :class="row + (channelId === c.id ? 'bg-panel' : '')"
          v-visible="() => loadPhoto(c.id)"
        >
          <!-- Covers the whole row, so a click anywhere but the pin picks the channel. -->
          <button
            class="absolute inset-0 rounded"
            :aria-label="c.name"
            :title="c.name"
            @click="pickChannel(c.id)"
          />
          <img
            v-if="photos[c.id]"
            :src="photos[c.id]"
            alt=""
            class="size-9 shrink-0 rounded-full object-cover"
          />
          <span v-else class="grid size-9 place-items-center rounded-full bg-accent font-semibold">
            {{ c.name[0] }}
          </span>
          <span class="flex-1 truncate">{{ c.name }}</span>
          <button
            class="relative z-10 rounded p-0.5 hover:bg-white/10"
            :class="
              pinned.includes(c.id)
                ? 'text-accent'
                : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white focus-visible:opacity-100'
            "
            :title="pinned.includes(c.id) ? 'Unpin channel' : 'Pin channel to top'"
            :aria-label="pinned.includes(c.id) ? 'Unpin channel' : 'Pin channel to top'"
            :aria-pressed="pinned.includes(c.id)"
            @click="togglePin(c.id)"
          >
            <svg v-bind="iconAttrs" :fill="pinned.includes(c.id) ? 'currentColor' : 'none'">
              <path v-for="d in pinIcon" :key="d" :d="d" />
            </svg>
          </button>
          <span class="rounded bg-white/10 px-1.5 text-xs text-neutral-300">{{
            countOf(c.id)
          }}</span>
        </div>
        <p v-if="channelQuery && !foundChannels.length" class="px-2 py-2 text-sm text-neutral-500">
          No channels found.
        </p>
      </div>
    </aside>

    <section class="min-w-0 flex-1 space-y-4">
      <p v-for="e in errors" :key="e" class="rounded bg-red-900/40 px-3 py-2 text-sm text-red-200">
        Could not load channel. {{ e }}
      </p>
      <p v-if="!channels.length" class="py-12 text-center text-neutral-500">
        No channels for {{ LANGUAGES[studyLang] ?? studyLang }} yet.
      </p>
      <p v-else-if="loading" class="py-12 text-center text-neutral-500">Loading videos…</p>
      <p v-else-if="!shown.length" class="py-12 text-center text-neutral-500">No videos found.</p>

      <a
        v-for="v in page"
        :key="v.videoId"
        :href="watchUrl(v)"
        target="_blank"
        class="flex gap-5 rounded p-1 hover:bg-white/5"
        v-visible="() => loadTracks(v.videoId)"
      >
        <img
          :src="thumbUrl(v)"
          alt=""
          loading="lazy"
          class="aspect-video w-54 shrink-0 rounded object-cover"
        />
        <div class="min-w-0 space-y-1 pt-1">
          <div class="truncate text-lg text-white">{{ v.title }}</div>
          <div class="text-sm text-neutral-400">{{ v.channelName }}</div>
          <div class="text-sm text-neutral-400">
            {{ ago(v.published) }} • {{ compact.format(v.views) }} views
            <span
              v-if="v.isShort"
              class="ms-2 rounded border border-white/20 px-1.5 text-xs text-neutral-300"
              >Short</span
            >
            <span
              v-if="subsOf(v.videoId) === 'cc'"
              class="ms-2 rounded bg-accent px-1.5 text-xs text-white"
              title="Human-made subtitles"
              >CC</span
            >
            <span
              v-else-if="subsOf(v.videoId) === 'auto'"
              class="ms-2 rounded border border-white/20 px-1.5 text-xs text-neutral-300"
              title="Only auto-generated subtitles"
              >Auto CC</span
            >
            <span v-else-if="subsOf(v.videoId) === 'none'" class="ms-2 text-xs text-neutral-500"
              >No subtitles</span
            >
          </div>
        </div>
      </a>
      <div v-if="shown.length > limit" v-visible="() => (limit += PAGE)" class="h-px" />
    </section>
  </div>
</template>
