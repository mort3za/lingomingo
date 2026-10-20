<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { t } from '@/shared/i18n'
import { cleanFontName } from '@/shared/subtitle-style'
import { INPUT, LABEL, useSettings } from './settings'

const emit = defineEmits<{ pick: [] }>()
const { settings } = useSettings()

/** YouTube loads Roboto, so it works on videos even when it is not on this computer. */
const YOUTUBE_FONT = 'Roboto'
// Common fonts on Mac, Windows and Linux. The list shows only the ones on this computer.
const COMMON = [
  'Arial',
  'Helvetica Neue',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Segoe UI',
  'Ubuntu',
  'Georgia',
  'Times New Roman',
  'Palatino',
  'Courier New',
  'Comic Sans MS',
]

const ctx = document.createElement('canvas').getContext('2d')
/** The font is on this computer: text in it has another width than in the fallback fonts. */
function installed(name: string) {
  const font = cleanFontName(name)
  if (!ctx || !font) return true
  const sample = 'mmmmmmmmmmlli WQ@#'
  return ['monospace', 'serif', 'sans-serif'].some((base) => {
    ctx.font = `72px ${base}`
    const width = ctx.measureText(sample).width
    ctx.font = `72px "${font}", ${base}`
    return ctx.measureText(sample).width !== width
  })
}
// '' is the default font.
const fonts = ['', YOUTUBE_FONT, ...COMMON.filter(installed)]

const open = ref(false)
/** What the user typed to filter the list. null: show all. */
const query = ref<string | null>(null)
const active = ref(-1)
const list = ref<HTMLElement>()

const items = computed(() => {
  const q = query.value?.trim().toLowerCase()
  return q ? fonts.filter((f) => f.toLowerCase().includes(q)) : fonts
})
const sameFont = (a: string, b: string) => cleanFontName(a).toLowerCase() === b.toLowerCase()

const status = computed(() => {
  const value = settings.value.subtitleFont
  if (!cleanFontName(value) || installed(value)) return ''
  if (sameFont(value, YOUTUBE_FONT)) return t('look.youtubeOnly')
  return t('look.missingFont')
})

function show() {
  open.value = true
  query.value = null
  active.value = fonts.findIndex((f) => sameFont(settings.value.subtitleFont, f))
}
function type(e: Event) {
  settings.value.subtitleFont = (e.target as HTMLInputElement).value
  query.value = settings.value.subtitleFont
  open.value = true
  active.value = -1
}
function pick(font: string) {
  settings.value.subtitleFont = font
  open.value = false
  emit('pick')
}
async function move(by: number) {
  if (!open.value) return show()
  const n = items.value.length
  if (!n) return
  active.value = (active.value + by + n) % n
  await nextTick()
  list.value?.children[active.value]?.scrollIntoView({ block: 'nearest' })
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    void move(e.key === 'ArrowDown' ? 1 : -1)
  } else if (e.key === 'Enter' && open.value) {
    e.preventDefault()
    const font = items.value[active.value]
    if (font !== undefined) pick(font)
    else open.value = false
  } else if (e.key === 'Escape') open.value = false
}
const family = (font: string) =>
  font ? { fontFamily: `"${cleanFontName(font)}", var(--font-sans)` } : {}
</script>

<template>
  <div>
    <label :class="LABEL" for="subtitle-font">{{ t('look.font') }}</label>
    <div class="relative">
      <input
        id="subtitle-font"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="subtitle-font-list"
        :aria-expanded="open"
        :aria-activedescendant="active >= 0 && open ? `subtitle-font-${active}` : undefined"
        :value="settings.subtitleFont"
        :class="INPUT"
        :style="family(settings.subtitleFont)"
        :placeholder="t('look.defaultFont')"
        autocomplete="off"
        spellcheck="false"
        @input="type"
        @focus="show"
        @click="open || show()"
        @blur="open = false"
        @keydown="onKey"
      />
      <ul
        v-if="open && items.length"
        id="subtitle-font-list"
        ref="list"
        role="listbox"
        class="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded border border-fg/10 bg-panel py-1 shadow-xl"
      >
        <li
          v-for="(font, i) in items"
          :id="`subtitle-font-${i}`"
          :key="font"
          role="option"
          :aria-selected="sameFont(settings.subtitleFont, font)"
          class="flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-sm"
          :class="i === active && 'bg-fg/10'"
          @mousedown.prevent="pick(font)"
          @mousemove="active = i"
        >
          <span class="flex-1 truncate" :style="family(font)">{{
            font || t('look.defaultFont')
          }}</span>
          <span v-if="font === YOUTUBE_FONT" class="text-xs text-neutral-500">{{
            t('look.youtubeFont')
          }}</span>
          <!-- Fixed width, so the names line up with and without the check mark. -->
          <span class="w-3 text-accent">{{
            sameFont(settings.subtitleFont, font) ? '✓' : ''
          }}</span>
        </li>
      </ul>
    </div>
    <!-- Its height is kept, so nothing moves when the message shows. -->
    <p class="mt-1 min-h-4 text-xs text-amber-400">{{ status }}</p>
  </div>
</template>
