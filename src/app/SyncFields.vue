<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { download } from '@/shared/download'
import { DRIVE_KEY, getDriveState, GOOGLE_CLIENT_ID, type DriveState } from '@/shared/drive'
import { locale, t } from '@/shared/i18n'
import { send } from '@/shared/messages'
import {
  getItemsData,
  getSettings,
  mergeIntoLocal,
  onStorageKey,
  patchSettings,
} from '@/shared/storage'
import { makeBackup, parseBackup, restoreSettings } from '@/shared/sync'
import { saveNow, useSettings } from './settings'

const { settings } = useSettings()

// ---- backup file ----
const fileInput = ref<HTMLInputElement>()
const note = ref<{ ok: boolean; text: string } | null>(null)

async function saveBackup() {
  await saveNow()
  const backup = makeBackup(await getSettings(), await getItemsData())
  const day = new Date().toISOString().slice(0, 10)
  download(`lingomingo-backup-${day}.json`, JSON.stringify(backup), 'application/json')
}

async function restore(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const backup = parseBackup(await file.text())
    await saveNow()
    await patchSettings(restoreSettings(backup.settings))
    const { items } = await mergeIntoLocal({ items: backup.items, deleted: backup.deleted })
    note.value = { ok: true, text: t('sync.restored', { n: items.length }) }
  } catch {
    note.value = { ok: false, text: t('sync.badFile') }
  }
}

// ---- Google Drive ----
const drive = ref<DriveState>({ connected: false })
const busy = ref(false)
const driveError = ref('')
let stop = () => {}
onMounted(async () => {
  stop = onStorageKey(DRIVE_KEY, async () => (drive.value = await getDriveState()))
  drive.value = await getDriveState()
})
onUnmounted(() => stop())

async function run(type: 'drive-connect' | 'drive-sync' | 'drive-disconnect') {
  busy.value = true
  driveError.value = ''
  try {
    await send({ type })
  } catch (e) {
    // The sync errors are in the Drive state. This is for a closed sign-in window and such.
    if (type === 'drive-connect') driveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

const when = (at: number) =>
  new Date(at).toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })

const btn = 'rounded border border-fg/20 px-3 py-1.5 text-sm hover:bg-fg/10 disabled:opacity-50'
const hint = 'text-xs text-neutral-500'
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-2">
      <h3 class="text-sm font-medium">{{ t('sync.backup') }}</h3>
      <p :class="hint">{{ t('sync.backupHint') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <button :class="btn" @click="saveBackup">{{ t('sync.download') }}</button>
        <button :class="btn" @click="fileInput?.click()">{{ t('sync.restore') }}</button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="restore"
        />
        <span
          v-if="note"
          class="text-sm"
          :class="note.ok ? 'text-emerald-400' : 'text-red-300'"
          role="status"
          >{{ note.text }}</span
        >
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium">{{ t('sync.settings') }}</h3>
      <p :class="hint">{{ t('sync.settingsHint') }}</p>
      <label class="flex cursor-pointer items-start gap-2">
        <input v-model="settings.syncKeys" type="checkbox" class="mt-1" />
        <span class="flex-1">
          <span class="block text-sm">{{ t('sync.keys') }}</span>
          <span :class="hint" class="block">{{ t('sync.keysHint') }}</span>
        </span>
      </label>
    </div>

    <div v-if="GOOGLE_CLIENT_ID" class="space-y-2">
      <h3 class="text-sm font-medium">{{ t('sync.drive') }}</h3>
      <p :class="hint">{{ t('sync.driveHint') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="drive.connected && drive.error !== 'signin'"
          :class="btn"
          :disabled="busy"
          @click="run('drive-sync')"
        >
          {{ t('sync.syncNow') }}
        </button>
        <button
          v-else
          class="rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
          :disabled="busy"
          @click="run('drive-connect')"
        >
          {{ drive.connected ? t('sync.signInAgain') : t('sync.connect') }}
        </button>
        <button
          v-if="drive.connected"
          :class="btn"
          :disabled="busy"
          @click="run('drive-disconnect')"
        >
          {{ t('sync.disconnect') }}
        </button>
        <span v-if="busy" class="text-sm text-neutral-400">{{ t('sync.syncing') }}</span>
        <span v-else-if="drive.connected && drive.lastSyncAt" class="text-sm text-neutral-400">
          {{ t('sync.lastSync', { time: when(drive.lastSyncAt) }) }}
        </span>
      </div>
      <p
        v-if="driveError || (drive.error && drive.error !== 'signin')"
        class="text-sm break-words text-red-300"
      >
        {{ driveError || drive.error }}
      </p>
      <p v-else-if="drive.error === 'signin'" class="text-sm text-yellow-300">
        {{ t('sync.signInNeeded') }}
      </p>
    </div>
  </div>
</template>
