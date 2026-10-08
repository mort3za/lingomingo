<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Directive } from 'vue'
import { getSettings, onStorageKey } from '@/shared/storage'
import { LANGUAGES } from '@/shared/types'
import { CHANNELS, channelPhoto, fetchChannelVideos, type CatalogueVideo } from '../catalogue'

const studyLang = ref('')
const videos = ref<CatalogueVideo[]>([])
const errors = ref<string[]>([])
const loading = ref(false)
const channelId = ref('') // '' = all channels
const sort = ref<'date' | 'views'>('date')
const query = ref('')
const hideShorts = ref(true)

const channels = computed(() => CHANNELS[studyLang.value] ?? [])

async function refreshLang() {
  studyLang.value = (await getSettings()).studyLang
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
              ['date', '📅 Date'],
              ['views', '👁 Views'],
            ] as const"
            :key="s[0]"
            class="flex-1 py-1.5 text-sm"
            :class="sort === s[0] ? 'bg-panel text-white' : 'text-neutral-400 hover:bg-white/5'"
            @click="sort = s[0]"
          >
            {{ s[1] }}
          </button>
        </div>
      </div>
      <input v-model="query" :class="field + ' w-full'" placeholder="🔍 Search videos" />
      <label class="flex items-center gap-2 text-sm">
        <input v-model="hideShorts" type="checkbox" class="accent-accent" />
        Hide Shorts
      </label>

      <div class="border-t border-white/10 pt-4">
        <div class="mb-2 text-center text-neutral-400">Channel</div>
        <button :class="row + (channelId === '' ? 'bg-panel' : '')" @click="channelId = ''">
          <span class="grid size-9 place-items-center rounded bg-accent font-semibold">
            {{ studyLang.toUpperCase() }}
          </span>
          <span class="flex-1">All channels</span>
        </button>
        <button
          v-for="c in channels"
          :key="c.id"
          :class="row + (channelId === c.id ? 'bg-panel' : '')"
          v-visible="() => loadPhoto(c.id)"
          @click="channelId = c.id"
        >
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
          <span class="rounded bg-white/10 px-1.5 text-xs text-neutral-300">{{
            countOf(c.id)
          }}</span>
        </button>
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
          </div>
        </div>
      </a>
      <div v-if="shown.length > limit" v-visible="() => (limit += PAGE)" class="h-px" />
    </section>
  </div>
</template>
