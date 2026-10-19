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
import { ignoreKey } from '../shortcuts'
import {
  CHANNELS,
  cachedChannelPhotos,
  channelPhoto,
  fetchChannelVideos,
  findChannel,
  videoTracks,
  type CatalogueVideo,
  type Channel,
  type TrackInfo,
} from '../catalogue'

const studyLang = ref('')
const videos = ref<CatalogueVideo[]>([])
const errors = ref<Record<string, string>>({}) // by channel ID
const loadingAll = ref(false)
const pending = ref(new Set<string>()) // channel IDs whose videos are loading
const channelId = ref('') // '' = all channels
const sort = ref<'date' | 'views'>('date')
const query = ref('')
const hideShorts = ref(false)

// Channels the user added come first, newest first.
const custom = ref<Channel[]>([])
const channels = computed(() => [...custom.value, ...(CHANNELS[studyLang.value] ?? [])])
const isCustom = (id: string) => custom.value.some((c) => c.id === id)

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
  closeAddChannel()
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

// Add channel: the header shows a form in place of its title.
const addOpen = ref(false)
const addQuery = ref('')
const addBusy = ref(false)
const addError = ref('')
const addInput = useTemplateRef<HTMLInputElement>('addInput')
async function openAddChannel() {
  closeChannelSearch()
  addOpen.value = true
  await nextTick()
  addInput.value?.focus()
}
function closeAddChannel() {
  addOpen.value = false
  addQuery.value = ''
  addError.value = ''
}
async function addChannel() {
  if (addBusy.value || !addQuery.value.trim()) return
  addBusy.value = true
  addError.value = ''
  try {
    const found = await findChannel(addQuery.value)
    // A channel already in the list is only picked.
    if (!channels.value.some((c) => c.id === found.id)) await saveCustom([found, ...custom.value])
    closeAddChannel()
    pickChannel(found.id)
  } catch (e) {
    addError.value = e instanceof Error ? e.message : String(e)
  } finally {
    addBusy.value = false
  }
}
async function removeChannel(id: string) {
  if (pinned.value.includes(id)) togglePin(id)
  await saveCustom(custom.value.filter((c) => c.id !== id))
}
async function saveCustom(list: Channel[]) {
  // Plain objects: chrome.storage cannot save Vue proxies correctly.
  const plain = list.map(({ id, name }) => ({ id, name }))
  custom.value = plain
  const { customChannels } = await getSettings()
  await patchSettings({ customChannels: { ...customChannels, [studyLang.value]: plain } })
}

async function refreshLang() {
  const settings = await getSettings()
  // Older versions of the settings page saved this list as an object ({0: id, 1: id}).
  pinned.value = Object.values(settings.pinnedChannels)
  hideShorts.value = settings.hideShorts
  const lang = settings.studyLang
  const added = settings.customChannels[lang] ?? []
  // Cached photos show together with their rows, not after the rows come into view.
  const cached = await cachedChannelPhotos([...added, ...(CHANNELS[lang] ?? [])].map((c) => c.id))
  photos.value = { ...photos.value, ...cached }
  custom.value = added
  studyLang.value = lang
}
// "/" puts the cursor in the video search. Esc takes it out.
const search = useTemplateRef<HTMLInputElement>('search')
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && e.target === search.value) return search.value?.blur()
  if (ignoreKey(e) || e.key !== '/') return
  search.value?.focus()
  e.preventDefault()
}

let stop = () => {}
onMounted(() => {
  void refreshLang()
  stop = onStorageKey('settings', refreshLang)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('keydown', onKeydown)
})

// A new study language loads the videos of all its channels. An added channel loads only its
// own videos, and a removed channel takes its videos away.
let loadedLang = ''
const loaded = new Set<string>()
watch(channels, async (list) => {
  const lang = studyLang.value
  if (lang !== loadedLang) {
    loadedLang = lang
    loaded.clear()
    channelId.value = ''
    videos.value = []
    errors.value = {}
    loadingAll.value = true
  }
  const ids = new Set(list.map((c) => c.id))
  for (const id of loaded) if (!ids.has(id)) loaded.delete(id)
  videos.value = videos.value.filter((v) => ids.has(v.channelId))
  errors.value = Object.fromEntries(Object.entries(errors.value).filter(([id]) => ids.has(id)))
  if (channelId.value && !ids.has(channelId.value)) channelId.value = ''

  const todo = list.filter((c) => !loaded.has(c.id))
  todo.forEach((c) => loaded.add(c.id))
  pending.value = new Set([...pending.value, ...todo.map((c) => c.id)])
  const results = await Promise.allSettled(todo.map(fetchChannelVideos))
  if (lang !== loadedLang) return // the language changed while these loaded
  results.forEach((r, i) => {
    const id = todo[i]!.id
    if (!loaded.has(id)) return // removed while it loaded
    if (r.status === 'fulfilled') videos.value = [...videos.value, ...r.value]
    else errors.value = { ...errors.value, [id]: String(r.reason) }
  })
  pending.value = new Set([...pending.value].filter((id) => !todo.some((c) => c.id === id)))
  if (!pending.value.size) loadingAll.value = false
})
// One channel shows its own loading state. All channels show it only on the first load.
const loading = computed(() =>
  channelId.value ? pending.value.has(channelId.value) : loadingAll.value,
)

const visible = computed(() => videos.value.filter((v) => !hideShorts.value || !v.isShort))
function pickChannel(id: string) {
  channelId.value = id
  window.scrollTo({ top: 0 })
}
const countOf = (id: string) => visible.value.filter((v) => v.channelId === id).length
const channelName = computed(
  () => channels.value.find((c) => c.id === channelId.value)?.name ?? 'All channels',
)
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
  'rounded border border-fg/10 bg-surface-deep px-3 py-1.5 text-sm outline-none focus:border-accent'
// Tabler "pin" icon (a tilted push pin), drawn like the icons in the app nav.
const pinIcon = [
  'M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4',
  'M9 15l-4.5 4.5',
  'M14.5 4l5.5 5.5',
]
// Tabler "search" and "x" icons.
const searchIcon = ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6']
const closeIcon = ['M18 6l-12 12', 'M6 6l12 12']
// Tabler "plus" and "trash" icons.
const plusIcon = ['M12 5l0 14', 'M5 12l14 0']
const trashIcon = [
  'M4 7l16 0',
  'M10 11l0 6',
  'M14 11l0 6',
  'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
  'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
]
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
const row = 'flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm hover:bg-fg/5 '
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row">
    <aside class="w-full shrink-0 lg:w-72">
      <!-- Narrow windows: the list scrolls, so the videos stay near the top of the page. -->
      <div
        class="max-h-72 [scrollbar-width:thin] [scrollbar-gutter:stable] overflow-y-auto lg:max-h-none lg:overflow-visible"
      >
        <!-- Same height in all states, so the list does not move when the search opens. -->
        <form
          v-if="addOpen"
          class="mb-2 flex h-8 items-center gap-2 ps-2"
          @submit.prevent="addChannel"
        >
          <input
            ref="addInput"
            v-model="addQuery"
            :class="field + ' h-8 min-w-0 flex-1'"
            placeholder="Channel link or @handle"
            aria-label="Channel link, @handle or channel ID"
            :aria-invalid="!!addError"
            aria-describedby="add-channel-hint"
            :disabled="addBusy"
            @input="addError = ''"
            @keydown.esc="closeAddChannel"
          />
          <button
            type="submit"
            class="rounded p-1 text-neutral-400 hover:bg-fg/10 hover:text-fg disabled:opacity-40"
            title="Add channel"
            aria-label="Add channel"
            :disabled="addBusy || !addQuery.trim()"
          >
            <svg v-bind="iconAttrs"><path v-for="d in plusIcon" :key="d" :d="d" /></svg>
          </button>
          <button
            type="button"
            class="rounded p-1 text-neutral-400 hover:bg-fg/10 hover:text-fg"
            title="Close"
            aria-label="Close"
            @click="closeAddChannel"
          >
            <svg v-bind="iconAttrs"><path v-for="d in closeIcon" :key="d" :d="d" /></svg>
          </button>
        </form>
        <div v-else class="mb-2 flex h-8 items-center gap-2 ps-2">
          <input
            v-if="channelSearch"
            ref="channelInput"
            v-model="channelQuery"
            :class="field + ' h-8 min-w-0 flex-1'"
            placeholder="Search channels"
            @keydown.esc="closeChannelSearch"
          />
          <template v-else>
            <span class="flex-1 text-neutral-400">Channel</span>
            <button
              class="rounded p-1 text-neutral-400 hover:bg-fg/10 hover:text-fg"
              title="Add a YouTube channel"
              aria-label="Add a YouTube channel"
              @click="openAddChannel"
            >
              <svg v-bind="iconAttrs"><path v-for="d in plusIcon" :key="d" :d="d" /></svg>
            </button>
          </template>
          <button
            class="rounded p-1 text-neutral-400 hover:bg-fg/10 hover:text-fg"
            :title="channelSearch ? 'Close search' : 'Search channels'"
            :aria-label="channelSearch ? 'Close search' : 'Search channels'"
            @click="channelSearch ? closeChannelSearch() : openChannelSearch()"
          >
            <svg v-bind="iconAttrs">
              <path v-for="d in channelSearch ? closeIcon : searchIcon" :key="d" :d="d" />
            </svg>
          </button>
        </div>
        <!-- Two lines are reserved, so the list does not move when the message changes. -->
        <p
          v-if="addOpen"
          id="add-channel-hint"
          class="mb-2 line-clamp-2 h-8 px-2 text-xs"
          :class="addError ? 'text-red-400' : 'text-neutral-400'"
          aria-live="polite"
        >
          {{
            addBusy
              ? 'Looking for the channel…'
              : addError || 'Paste a channel link, @handle or channel ID, then press Enter.'
          }}
        </p>
        <button :class="row + (channelId === '' ? 'bg-panel' : '')" @click="pickChannel('')">
          <span class="grid size-9 place-items-center rounded bg-accent font-semibold text-white">
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
          <span
            v-else
            class="grid size-9 place-items-center rounded-full bg-accent font-semibold text-white"
          >
            {{ c.name[0] }}
          </span>
          <span class="flex-1 truncate text-start" dir="auto">{{ c.name }}</span>
          <button
            v-if="isCustom(c.id)"
            class="relative z-10 rounded p-0.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-fg/10 hover:text-fg focus-visible:opacity-100"
            title="Remove channel"
            :aria-label="`Remove ${c.name}`"
            @click="removeChannel(c.id)"
          >
            <svg v-bind="iconAttrs"><path v-for="d in trashIcon" :key="d" :d="d" /></svg>
          </button>
          <button
            class="relative z-10 rounded p-0.5 hover:bg-fg/10"
            :class="
              pinned.includes(c.id)
                ? 'text-accent'
                : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100'
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
          <span class="rounded bg-fg/10 px-1.5 text-xs text-neutral-300">{{ countOf(c.id) }}</span>
        </div>
        <p v-if="channelQuery && !foundChannels.length" class="px-2 py-2 text-sm text-neutral-500">
          No channels found.
        </p>
      </div>
    </aside>

    <section class="min-w-0 flex-1 space-y-4">
      <!-- Controls for the video list: search, sort, Hide Shorts. They stay on top when the list
        scrolls (below the header bar on narrow windows). -->
      <div class="sticky top-14 z-20 -mt-3 space-y-2 bg-surface-deep py-3 md:top-0">
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative min-w-48 flex-1">
            <svg
              v-bind="iconAttrs"
              class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            >
              <path v-for="d in searchIcon" :key="d" :d="d" />
            </svg>
            <input
              ref="search"
              v-model="query"
              :class="field + ' w-full ps-9'"
              placeholder="Search videos"
              title="Search videos (/)"
            />
          </div>
          <div class="flex overflow-hidden rounded border border-fg/10" title="Sort by">
            <button
              v-for="s in [
                ['date', 'Date', calendarIcon],
                ['views', 'Views', eyeIcon],
              ] as const"
              :key="s[0]"
              class="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm"
              :class="sort === s[0] ? 'bg-panel text-fg' : 'text-neutral-400 hover:bg-fg/5'"
              @click="sort = s[0]"
            >
              <svg v-bind="iconAttrs">
                <path v-for="d in s[2]" :key="d" :d="d" />
              </svg>
              {{ s[1] }}
            </button>
          </div>
          <label class="flex items-center gap-2 text-sm whitespace-nowrap">
            <input v-model="hideShorts" type="checkbox" @change="patchSettings({ hideShorts })" />
            Hide Shorts
          </label>
        </div>
        <!-- Fixed height, so the list does not move when the count appears. -->
        <div class="h-5 truncate text-sm text-neutral-400">
          <bdi>{{ channelName }}</bdi
          ><template v-if="!loading && channels.length">
            · {{ shown.length }} {{ shown.length === 1 ? 'video' : 'videos' }}</template
          >
        </div>
      </div>

      <p
        v-for="(e, id) in errors"
        :key="id"
        class="rounded bg-red-900/40 px-3 py-2 text-sm text-red-200"
      >
        Could not load channel. {{ e }}
      </p>
      <p v-if="!channels.length" class="py-12 text-center text-neutral-500">
        No channels for {{ LANGUAGES[studyLang] ?? studyLang }} yet.
        <button class="text-accent hover:underline" @click="openAddChannel">Add a channel</button>
      </p>
      <p v-else-if="loading" class="py-12 text-center text-neutral-500">Loading videos…</p>
      <p v-else-if="!shown.length" class="py-12 text-center text-neutral-500">No videos found.</p>

      <a
        v-for="v in page"
        :key="v.videoId"
        :href="watchUrl(v)"
        target="_blank"
        class="flex flex-col gap-2 rounded p-1 hover:bg-fg/5 sm:flex-row sm:gap-5"
        v-visible="() => loadTracks(v.videoId)"
      >
        <img
          :src="thumbUrl(v)"
          alt=""
          loading="lazy"
          class="aspect-video w-full shrink-0 rounded object-cover sm:w-54"
        />
        <div class="min-w-0 space-y-1 px-1 sm:px-0 sm:pt-1">
          <div class="line-clamp-2 text-fg sm:truncate sm:text-lg" dir="auto">{{ v.title }}</div>
          <div class="text-sm text-neutral-400" dir="auto">{{ v.channelName }}</div>
          <div class="text-sm text-neutral-400">
            {{ ago(v.published) }} • {{ compact.format(v.views) }} views
            <span
              v-if="v.isShort"
              class="ms-2 rounded border border-fg/20 px-1.5 text-xs text-neutral-300"
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
              class="ms-2 rounded border border-fg/20 px-1.5 text-xs text-neutral-300"
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
