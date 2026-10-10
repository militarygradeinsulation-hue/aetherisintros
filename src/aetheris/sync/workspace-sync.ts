/**
 * Member workspace sync.
 *
 * Stores that keep a member's work in localStorage register here. While a member is signed
 * in, each store is loaded from their account on start (the newer copy wins; unsaved local
 * work is merged in) and saved about two seconds after each change, and again when the page
 * is hidden. Demo/showcase stores never register, so seed data is never uploaded. Saving
 * goes through save_workspace_state, which rejects stale writes from another device.
 */
import { useSyncExternalStore } from 'react'
import {
  createStoreReadiness, FAILURES_BEFORE_NOTICE, MAX_STORE_BYTES, keysToClearOnSignOut, mergeStoreData, planInitialSync,
  retryDelayMs, shouldRetryInitialSync, syncSkeleton, SYNCED_STORE_KEYS, type RemoteCopy, type SyncedStoreKey,
} from './sync-logic'

export interface SyncedStore {
  /** Allowlisted server key. */
  key: SyncedStoreKey
  /** Where the local copy lives in localStorage. */
  localKey: string
  /** Retry an initial fetch if auth changes while it is in flight. */
  retryOnAccountChange?: boolean
  /** Replace the store's state (and its local copy) with this data; null = empty. */
  apply: (data: unknown | null) => void
}

interface MetaEntry { version: number; dirty: boolean }
interface Meta { userId: string | null; entries: Partial<Record<SyncedStoreKey, MetaEntry>> }

const META_KEY = 'aetheris.sync.meta'
const DEBOUNCE_MS = 2_000

const hasWindow = () => typeof window !== 'undefined'

function readMeta(): Meta {
  try {
    const raw = hasWindow() ? localStorage.getItem(META_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Meta>
      return { userId: parsed.userId ?? null, entries: parsed.entries ?? {} }
    }
  } catch { /* unreadable: start over */ }
  return { userId: null, entries: {} }
}
function writeMeta(meta: Meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)) } catch { /* storage full */ }
}
function setEntry(key: SyncedStoreKey, entry: MetaEntry) {
  const meta = readMeta()
  meta.entries[key] = entry
  writeMeta(meta)
  refreshPending()
}

/*
 * Base skeleton per store: the keys/ids of the last copy this device and the server agreed
 * on. Merges use it so a record deleted on either side is not brought back by the next sync.
 */
const baseKey = (key: SyncedStoreKey) => `aetheris.sync.base.${key}`
function readBase(key: SyncedStoreKey): unknown {
  try {
    const raw = localStorage.getItem(baseKey(key))
    return raw == null ? undefined : JSON.parse(raw) as unknown
  } catch { return undefined }
}
function writeBase(key: SyncedStoreKey, data: unknown | null) {
  try {
    if (data == null) localStorage.removeItem(baseKey(key))
    else localStorage.setItem(baseKey(key), JSON.stringify(syncSkeleton(data)))
  } catch { /* storage full: merges fall back to keeping everything */ }
}

function readLocal(localKey: string): { present: boolean; data: unknown } {
  try {
    const raw = localStorage.getItem(localKey)
    if (raw == null) return { present: false, data: null }
    return { present: true, data: JSON.parse(raw) as unknown }
  } catch {
    return { present: false, data: null }
  }
}

/* ------------------------------------------------------------------ status */

export interface WorkspaceSyncStatus {
  signedIn: boolean
  lastSavedAt: string | null
  /** Saving has failed several times in a row. */
  failing: boolean
  /** Stores with changes not yet saved to the account. */
  pending: SyncedStoreKey[]
  /** Stores whose last save attempt failed (retrying). */
  failed: SyncedStoreKey[]
  /** Stores too large to save. Not retried until they change; the member must trim them. */
  oversized: SyncedStoreKey[]
  /** Most recent save error, for display. */
  lastError: string | null
}
const idleStatus: WorkspaceSyncStatus = { signedIn: false, lastSavedAt: null, failing: false, pending: [], failed: [], oversized: [], lastError: null }
let status: WorkspaceSyncStatus = idleStatus
const statusListeners = new Set<() => void>()
function setStatus(patch: Partial<WorkspaceSyncStatus>) {
  status = { ...status, ...patch }
  statusListeners.forEach(l => l())
}
const serverStatus: WorkspaceSyncStatus = idleStatus
const withKey = (list: SyncedStoreKey[], key: SyncedStoreKey, on: boolean) =>
  on ? (list.includes(key) ? list : [...list, key]) : list.filter(k => k !== key)
function refreshPending() {
  const entries = readMeta().entries
  const pending = SYNCED_STORE_KEYS.filter(k => stores.has(k) && entries[k]?.dirty)
  if (pending.join() !== status.pending.join()) setStatus({ pending })
}
export function useWorkspaceSyncStatus(): WorkspaceSyncStatus {
  return useSyncExternalStore(
    l => { statusListeners.add(l); return () => statusListeners.delete(l) },
    () => status,
    () => serverStatus,
  )
}

/* ------------------------------------------------------------------ engine */

const stores = new Map<SyncedStoreKey, SyncedStore>()
const timers = new Map<SyncedStoreKey, ReturnType<typeof setTimeout>>()
const inFlight = new Map<SyncedStoreKey, Promise<void>>()
const storeReadiness = createStoreReadiness()
const changeCounter = new Map<SyncedStoreKey, number>()
let userId: string | null = null
let failures = 0
let started = false

async function client() {
  const { supabase } = await import('@/integrations/supabase/client')
  return supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

function noteFailure(key: SyncedStoreKey, error?: unknown) {
  failures += 1
  const message = error instanceof Error ? error.message : (error as { message?: string } | undefined)?.message
  setStatus({ failing: failures >= FAILURES_BEFORE_NOTICE, failed: withKey(status.failed, key, true), lastError: message ?? status.lastError })
  schedule(key, retryDelayMs(failures))
}
function noteSaved(key: SyncedStoreKey, at: string | null) {
  failures = 0
  const failed = withKey(status.failed, key, false)
  setStatus({ failing: false, failed, oversized: withKey(status.oversized, key, false), lastSavedAt: at ?? new Date().toISOString(), ...(failed.length ? {} : { lastError: null }) })
}
/** Too big to save: a retry can never succeed, so report it and wait for the store to change. */
function noteOversized(key: SyncedStoreKey, bytes: number) {
  const message = `${key} is ${(bytes / 1024 / 1024).toFixed(1)} MB, over the ${MAX_STORE_BYTES / 1024 / 1024} MB account limit. Remove some items to resume saving.`
  console.error(`workspace sync: ${message}`)
  setStatus({ oversized: withKey(status.oversized, key, true), failed: withKey(status.failed, key, false), lastError: message })
}

async function fetchRemote(key: SyncedStoreKey): Promise<RemoteCopy | null> {
  const db = await client()
  const { data, error } = await db.from('member_workspace_state')
    .select('version, data, updated_at').eq('store_key', key).maybeSingle()
  if (error) throw error
  if (!data) return null
  if (data.updated_at && (!status.lastSavedAt || data.updated_at > status.lastSavedAt)) setStatus({ lastSavedAt: data.updated_at })
  return { version: Number(data.version), data: data.data }
}

const loading = new Set<SyncedStore>()
async function initialSync(store: SyncedStore) {
  if (loading.has(store)) return
  const requestedUserId = userId
  loading.add(store)
  try { await loadFromAccount(store) } finally {
    loading.delete(store)
    const currentStore = stores.get(store.key)
    if (store.retryOnAccountChange && currentStore && shouldRetryInitialSync(
      requestedUserId,
      userId,
      currentStore === store,
      storeReadiness.isReady(store.key),
    )) void initialSync(currentStore)
  }
}

async function loadFromAccount(store: SyncedStore) {
  const uid = userId
  if (!uid || stores.get(store.key) !== store || storeReadiness.isReady(store.key)) return
  const meta = readMeta()
  const entry = meta.entries[store.key]
  const local = readLocal(store.localKey)
  const foreign = meta.userId !== null && meta.userId !== uid
  let remote: RemoteCopy | null
  try {
    remote = await fetchRemote(store.key)
  } catch (error) {
    // Offline or not set up yet: keep working locally, try again later.
    if (userId === uid) noteFailure(store.key, error)
    return
  }
  if (userId !== uid || stores.get(store.key) !== store) return
  if (foreign || meta.userId === null) writeMeta({ userId: uid, entries: foreign ? {} : meta.entries })

  const plan = planInitialSync({
    present: local.present, baseVersion: foreign ? 0 : entry?.version ?? 0, dirty: !foreign && !!entry?.dirty, foreign,
  }, remote)
  switch (plan.action) {
    case 'noop':
      if (remote) { setEntry(store.key, { version: remote.version, dirty: false }); writeBase(store.key, remote.data) }
      break
    case 'apply-remote':
      store.apply(remote!.data)
      setEntry(store.key, { version: remote!.version, dirty: false })
      writeBase(store.key, remote!.data)
      break
    case 'reset':
      store.apply(null)
      setEntry(store.key, { version: 0, dirty: false })
      writeBase(store.key, null)
      break
    case 'upload':
      setEntry(store.key, { version: plan.baseVersion, dirty: true })
      break
    case 'merge-upload':
      // A foreign copy never merges (planInitialSync), so the base is this member's.
      store.apply(mergeStoreData(local.data, remote!.data, readBase(store.key)))
      setEntry(store.key, { version: plan.baseVersion, dirty: true })
      break
  }
  storeReadiness.markReady(store.key)
  if (plan.action === 'upload' || plan.action === 'merge-upload') await save(store.key)
}

async function saveOnce(key: SyncedStoreKey) {
  const store = stores.get(key)
  const uid = userId
  if (!store || !uid || !storeReadiness.isReady(key)) return
  const entry = readMeta().entries[key]
  if (!entry?.dirty) return
  const local = readLocal(store.localKey)
  if (!local.present) return
  const bytes = new TextEncoder().encode(JSON.stringify(local.data)).length
  if (bytes > MAX_STORE_BYTES) { noteOversized(key, bytes); return }
  const sentAt = changeCounter.get(key) ?? 0
  let result: { saved: boolean; current_version: number | string; current_data: unknown; saved_at: string | null } | undefined
  let failure: unknown
  try {
    const db = await client()
    const { data, error } = await db.rpc('save_workspace_state', { p_key: key, p_data: local.data, p_base_version: entry.version })
    if (error) throw error
    result = Array.isArray(data) ? data[0] : data
  } catch (error) {
    failure = error
  }
  // The member signed out or switched accounts (or the store was replaced) while saving:
  // this result belongs to someone else's session, so it must not touch meta or local data.
  if (userId !== uid || stores.get(key) !== store) return
  if (failure !== undefined || !result) { noteFailure(key, failure ?? new Error('Empty save response')); return }
  const version = Number(result.current_version)
  if (result.saved) {
    const changedSince = (changeCounter.get(key) ?? 0) !== sentAt
    setEntry(key, { version, dirty: changedSince })
    writeBase(key, local.data)
    noteSaved(key, result.saved_at)
    if (changedSince) schedule(key)
    return
  }
  // Another device saved first: fold our unsaved work into theirs and try again.
  const merged = mergeStoreData(readLocal(store.localKey).data, result.current_data, readBase(key))
  store.apply(merged)
  setEntry(key, { version, dirty: true })
  schedule(key, 0)
}

function save(key: SyncedStoreKey): Promise<void> {
  const running = inFlight.get(key)
  if (running) return running.then(() => save(key))
  const p = saveOnce(key).finally(() => inFlight.delete(key))
  inFlight.set(key, p)
  return p
}

function schedule(key: SyncedStoreKey, delay = DEBOUNCE_MS) {
  if (!hasWindow()) return
  const t = timers.get(key)
  if (t) clearTimeout(t)
  timers.set(key, setTimeout(() => {
    timers.delete(key)
    const store = stores.get(key)
    // Not loaded from the account yet (offline at start): retry the load, not a save.
    if (store && !storeReadiness.isReady(key)) void initialSync(store)
    else void save(key)
  }, delay))
}

/** Saves every store with unsaved changes now. Resolves when done (or failed). */
export async function flushWorkspaceSync(): Promise<void> {
  for (const [key, t] of timers) { clearTimeout(t); timers.delete(key) }
  await Promise.all([...stores.keys()].map(key => save(key)))
}

function onUser(next: string | null) {
  if (next === userId) return
  userId = next
  storeReadiness.clear()
  failures = 0
  setStatus({ ...idleStatus, signedIn: !!next })
  refreshPending()
  if (next) for (const store of stores.values()) void initialSync(store)
}

function ensureStarted() {
  if (started || !hasWindow()) return
  started = true
  void (async () => {
    try {
      const db = await client()
      db.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => onUser(session?.user?.id ?? null))
      const { data } = await db.auth.getSession()
      onUser(data.session?.user?.id ?? null)
    } catch { /* no backend configured: stay local-only */ }
  })()
  const flushHidden = () => { if (document.visibilityState === 'hidden') void flushWorkspaceSync() }
  document.addEventListener('visibilitychange', flushHidden)
  window.addEventListener('pagehide', () => { void flushWorkspaceSync() })
}

/** Called by a live store when it is created. Re-registering a key replaces the old one. */
export function registerSyncedStore(store: SyncedStore) {
  if (!hasWindow()) return
  // The server CHECK rejects any other key; fail loudly here instead of retrying forever.
  if (!(SYNCED_STORE_KEYS as readonly string[]).includes(store.key)) { console.error(`workspace sync: ${store.key} is not an allowed store key`); return }
  const clash = [...stores.values()].find(s => s.key !== store.key && s.localKey === store.localKey)
  if (clash) { console.error(`workspace sync: ${store.localKey} is already synced as ${clash.key}`); return }
  stores.set(store.key, store)
  storeReadiness.clear(store.key)
  ensureStarted()
  if (userId) void initialSync(store)
}

/** Resolves after the current member's initial account copy has been loaded. */
export function waitForWorkspaceStoreReady(key: SyncedStoreKey): Promise<void> {
  return storeReadiness.waitFor(key)
}

/** Called by a live store after it writes its local copy. */
export function notifyWorkspaceChange(key: SyncedStoreKey) {
  if (!hasWindow() || !stores.has(key)) return
  changeCounter.set(key, (changeCounter.get(key) ?? 0) + 1)
  const entry = readMeta().entries[key]
  setEntry(key, { version: entry?.version ?? 0, dirty: true })
  // A change may have brought an oversized store back under the limit; try again.
  if (status.oversized.includes(key)) setStatus({ oversized: withKey(status.oversized, key, false) })
  if (userId && storeReadiness.isReady(key)) schedule(key)
}

/**
 * Signs the member out: saves pending work to their account first (bounded wait), then
 * clears this browser's copies of their data so the next person on a shared computer
 * does not see them. Demo copies are left alone.
 */
export async function signOutMember(redirect = '/auth') {
  try {
    await Promise.race([flushWorkspaceSync(), new Promise(resolve => setTimeout(resolve, 4_000))])
  } catch { /* best effort */ }
  try {
    const db = await client()
    await db.auth.signOut()
  } catch { /* still clear local data */ }
  finally {
    try { keysToClearOnSignOut(Object.keys(localStorage)).forEach(k => localStorage.removeItem(k)) } catch { /* unavailable */ }
    window.location.replace(redirect)
  }
}
