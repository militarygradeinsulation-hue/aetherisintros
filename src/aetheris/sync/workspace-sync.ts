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
  FAILURES_BEFORE_NOTICE, MAX_STORE_BYTES, keysToClearOnSignOut, mergeStoreData, planInitialSync,
  retryDelayMs, type RemoteCopy, type SyncedStoreKey,
} from './sync-logic'

export interface SyncedStore {
  /** Allowlisted server key. */
  key: SyncedStoreKey
  /** Where the local copy lives in localStorage. */
  localKey: string
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
}
let status: WorkspaceSyncStatus = { signedIn: false, lastSavedAt: null, failing: false }
const statusListeners = new Set<() => void>()
function setStatus(patch: Partial<WorkspaceSyncStatus>) {
  status = { ...status, ...patch }
  statusListeners.forEach(l => l())
}
const serverStatus: WorkspaceSyncStatus = { signedIn: false, lastSavedAt: null, failing: false }
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
const ready = new Set<SyncedStoreKey>() // initial sync finished for the current member
const changeCounter = new Map<SyncedStoreKey, number>()
let userId: string | null = null
let failures = 0
let started = false

async function client() {
  const { supabase } = await import('@/integrations/supabase/client')
  return supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

function noteFailure(key: SyncedStoreKey) {
  failures += 1
  setStatus({ failing: failures >= FAILURES_BEFORE_NOTICE })
  schedule(key, retryDelayMs(failures))
}
function noteSaved(at: string | null) {
  failures = 0
  setStatus({ failing: false, lastSavedAt: at ?? new Date().toISOString() })
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
  loading.add(store)
  try { await loadFromAccount(store) } finally { loading.delete(store) }
}

async function loadFromAccount(store: SyncedStore) {
  const uid = userId
  if (!uid || stores.get(store.key) !== store || ready.has(store.key)) return
  const meta = readMeta()
  const entry = meta.entries[store.key]
  const local = readLocal(store.localKey)
  const foreign = meta.userId !== null && meta.userId !== uid
  let remote: RemoteCopy | null
  try {
    remote = await fetchRemote(store.key)
  } catch {
    // Offline or not set up yet: keep working locally, try again later.
    noteFailure(store.key)
    return
  }
  if (userId !== uid || stores.get(store.key) !== store) return
  if (foreign || meta.userId === null) writeMeta({ userId: uid, entries: foreign ? {} : meta.entries })

  const plan = planInitialSync({
    present: local.present, baseVersion: foreign ? 0 : entry?.version ?? 0, dirty: !foreign && !!entry?.dirty, foreign,
  }, remote)
  switch (plan.action) {
    case 'noop':
      if (remote) setEntry(store.key, { version: remote.version, dirty: false })
      break
    case 'apply-remote':
      store.apply(remote!.data)
      setEntry(store.key, { version: remote!.version, dirty: false })
      break
    case 'reset':
      store.apply(null)
      setEntry(store.key, { version: 0, dirty: false })
      break
    case 'upload':
      setEntry(store.key, { version: plan.baseVersion, dirty: true })
      break
    case 'merge-upload':
      store.apply(mergeStoreData(local.data, remote!.data))
      setEntry(store.key, { version: plan.baseVersion, dirty: true })
      break
  }
  ready.add(store.key)
  if (plan.action === 'upload' || plan.action === 'merge-upload') await save(store.key)
}

async function saveOnce(key: SyncedStoreKey) {
  const store = stores.get(key)
  if (!store || !userId || !ready.has(key)) return
  const entry = readMeta().entries[key]
  if (!entry?.dirty) return
  const local = readLocal(store.localKey)
  if (!local.present) return
  const body = JSON.stringify(local.data)
  if (new TextEncoder().encode(body).length > MAX_STORE_BYTES) { noteFailure(key); return }
  const sentAt = changeCounter.get(key) ?? 0
  let result: { saved: boolean; current_version: number | string; current_data: unknown; saved_at: string | null } | undefined
  try {
    const db = await client()
    const { data, error } = await db.rpc('save_workspace_state', { p_key: key, p_data: local.data, p_base_version: entry.version })
    if (error) throw error
    result = Array.isArray(data) ? data[0] : data
  } catch {
    noteFailure(key)
    return
  }
  if (!result) { noteFailure(key); return }
  const version = Number(result.current_version)
  if (result.saved) {
    const changedSince = (changeCounter.get(key) ?? 0) !== sentAt
    setEntry(key, { version, dirty: changedSince })
    noteSaved(result.saved_at)
    if (changedSince) schedule(key)
    return
  }
  // Another device saved first: fold our unsaved work into theirs and try again.
  const merged = mergeStoreData(readLocal(store.localKey).data, result.current_data)
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
    if (store && !ready.has(key)) void initialSync(store)
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
  ready.clear()
  failures = 0
  setStatus({ signedIn: !!next, failing: false, lastSavedAt: null })
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
  stores.set(store.key, store)
  ready.delete(store.key)
  ensureStarted()
  if (userId) void initialSync(store)
}

/** Called by a live store after it writes its local copy. */
export function notifyWorkspaceChange(key: SyncedStoreKey) {
  if (!hasWindow() || !stores.has(key)) return
  changeCounter.set(key, (changeCounter.get(key) ?? 0) + 1)
  const entry = readMeta().entries[key]
  setEntry(key, { version: entry?.version ?? 0, dirty: true })
  if (userId && ready.has(key)) schedule(key)
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
