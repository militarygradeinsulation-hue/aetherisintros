/**
 * Pure rules for member workspace sync (no browser or network access, unit-tested).
 *
 * Each synced store has a local copy (localStorage) and, once the member has saved from any
 * device, a server copy with a version number. The client remembers which server version
 * its local copy is based on and whether it holds changes not yet saved.
 */

/** Server keys a member may save. Mirrors the CHECK in drizzle/migrations/0047. */
export const SYNCED_STORE_KEYS = [
  'aetheris-moat-v1-live',
  'aetheris-relationship-os-v1-live',
  'aetheris-pro-v1-live',
  'aetheris-platform-v1-live',
  'aetheris.ledger.patch',
  'aetheris.business-execution-v1-live',
] as const
export type SyncedStoreKey = typeof SYNCED_STORE_KEYS[number]

export interface StoreReadiness {
  isReady: (key: string) => boolean
  waitFor: (key: string) => Promise<void>
  markReady: (key: string) => void
  clear: (key?: string) => void
}

export function createStoreReadiness(): StoreReadiness {
  const ready = new Set<string>()
  const waiters = new Map<string, Set<() => void>>()
  return {
    isReady: key => ready.has(key),
    waitFor: key => {
      if (ready.has(key)) return Promise.resolve()
      return new Promise(resolve => {
        const pending = waiters.get(key) ?? new Set<() => void>()
        pending.add(resolve)
        waiters.set(key, pending)
      })
    },
    markReady: key => {
      ready.add(key)
      waiters.get(key)?.forEach(resolve => resolve())
      waiters.delete(key)
    },
    clear: key => key === undefined ? ready.clear() : ready.delete(key),
  }
}

/** Server limit on one store (octet_length of the JSON text). */
export const MAX_STORE_BYTES = 2 * 1024 * 1024

export interface RemoteCopy { version: number; data: unknown }

export interface LocalCopy {
  /** Something is saved in this browser for the store. */
  present: boolean
  /** Server version the local copy was last in step with (0 = never synced here). */
  baseVersion: number
  /** Local changes not yet saved to the server. */
  dirty: boolean
  /** The local copy was left by a different signed-in member. */
  foreign: boolean
}

export type InitialPlan =
  | { action: 'noop' }
  /** Replace local with the server copy. */
  | { action: 'apply-remote' }
  /** Upload local as is, based on this server version. */
  | { action: 'upload'; baseVersion: number }
  /** Merge local into the server copy, keep it locally and upload it. */
  | { action: 'merge-upload'; baseVersion: number }
  /** Drop someone else's local data (no server copy to replace it with). */
  | { action: 'reset' }

/** What to do when a signed-in member opens the app on this device. */
export function planInitialSync(local: LocalCopy, remote: RemoteCopy | null): InitialPlan {
  if (local.foreign) return remote ? { action: 'apply-remote' } : { action: 'reset' }
  if (!remote) return local.present ? { action: 'upload', baseVersion: 0 } : { action: 'noop' }
  if (!local.present) return { action: 'apply-remote' }
  // A local copy that was never synced here counts as unsaved work.
  const unsaved = local.dirty || local.baseVersion === 0
  if (remote.version === local.baseVersion) return unsaved ? { action: 'upload', baseVersion: remote.version } : { action: 'noop' }
  // The server moved on (another device saved): remote wins unless there is unsaved work.
  return unsaved ? { action: 'merge-upload', baseVersion: remote.version } : { action: 'apply-remote' }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const idOf = (v: unknown): string | null => {
  if (!isPlainObject(v)) return null
  const id = v['id']
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

/**
 * Combines a local copy with a newer server copy. The server wins wherever both have a
 * value; records only this device has (by `id` in lists, by key in objects) are kept, so
 * nothing created offline is lost. Lists keep the server order with local-only records first
 * (the stores list newest first).
 */
export function mergeStoreData(local: unknown, remote: unknown): unknown {
  if (remote === undefined) return local
  if (isPlainObject(local) && isPlainObject(remote)) {
    const out: Record<string, unknown> = { ...remote }
    for (const [key, value] of Object.entries(local)) {
      out[key] = key in remote ? mergeStoreData(value, remote[key]) : value
    }
    return out
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    const remoteIds = new Set(remote.map(idOf).filter((id): id is string => id !== null))
    const keyed = remote.length === 0 || remoteIds.size > 0
    if (!keyed || local.some(r => idOf(r) === null)) return remote
    const localOnly = local.filter(r => !remoteIds.has(idOf(r)!))
    return [...localOnly, ...remote]
  }
  return remote
}

/** Retry delay after consecutive failures: 2s, 4s, 8s … capped at 60s. */
export function retryDelayMs(failures: number): number {
  return Math.min(60_000, 2_000 * 2 ** Math.max(0, failures - 1))
}

/** Failures in a row before Settings shows that the workspace is not being saved. */
export const FAILURES_BEFORE_NOTICE = 3

/**
 * localStorage keys to clear when a member signs out of a shared computer: everything under
 * `aetheris.` plus the hyphenated live stores. Demo/showcase copies hold no member data and
 * are kept.
 */
export function keysToClearOnSignOut(keys: readonly string[]): string[] {
  return keys.filter(k => k.startsWith('aetheris.') || (k.startsWith('aetheris-') && k.endsWith('-live')))
}
