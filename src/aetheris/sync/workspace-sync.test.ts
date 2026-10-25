import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: { user: { id: string } } | null) => void),
  read: vi.fn(), write: vi.fn(), memberClient: vi.fn(),
}))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  onAuthStateChange: (fn: typeof state.listener) => { state.listener = fn },
  getSession: async () => ({ data: { session: { user: { id: 'a' } } } }),
} } }))
vi.mock('@/integrations/supabase/member-client', () => ({ memberClient: state.memberClient }))
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
const key = 'aetheris-pro-v1-live'
let storage: Map<string, string>
let apply: ReturnType<typeof vi.fn<(data: unknown) => void>>

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); state.listener = null
  storage = new Map()
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) })
  vi.stubGlobal('window', { addEventListener: vi.fn() })
  vi.stubGlobal('document', { addEventListener: vi.fn(), visibilityState: 'visible' })
  state.memberClient.mockImplementation(async (uid: string) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), abortSignal: vi.fn(() => query), maybeSingle: () => state.read(uid) }
    return { from: () => query, rpc: () => ({ abortSignal: () => state.write(uid) }) }
  })
  apply = vi.fn(data => { if (data === null) storage.delete('local-pro'); else storage.set('local-pro', JSON.stringify(data)) })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('workspace account isolation', () => {
  it('ignores an old initial read, resets immediately, and loads the new account', async () => {
    const old = deferred<{ data: unknown; error: null }>()
    state.read.mockImplementation((uid: string) => uid === 'a' ? old.promise : Promise.resolve({ data: { version: 1, data: { owner: 'b' } }, error: null }))
    const sync = await import('./workspace-sync')
    sync.registerSyncedStore({ key, localKey: 'local-pro', apply })
    await vi.waitFor(() => expect(state.read).toHaveBeenCalledWith('a'))
    state.listener!('SIGNED_IN', { user: { id: 'b' } })
    expect(apply).toHaveBeenCalledWith(null)
    old.resolve({ data: { version: 99, data: { secret: 'a-only' } }, error: null })
    await vi.waitFor(() => expect(apply).toHaveBeenCalledWith({ owner: 'b' }))
    expect(apply).not.toHaveBeenCalledWith({ secret: 'a-only' })
  })
  it.each([true, false])('ignores a stale save receipt/conflict after switching accounts (saved=%s)', async saved => {
    const pending = deferred<{ data: unknown; error: null }>()
    state.read.mockImplementation(async (uid: string) => ({ data: { version: 1, data: { owner: uid } }, error: null }))
    state.write.mockImplementation(() => pending.promise)
    const sync = await import('./workspace-sync')
    sync.registerSyncedStore({ key, localKey: 'local-pro', apply })
    await sync.waitForWorkspaceStoreReady(key)
    storage.set('local-pro', JSON.stringify({ owner: 'a', draft: 'private-a' }))
    sync.notifyWorkspaceChange(key)
    const flush = sync.flushWorkspaceSync()
    await vi.waitFor(() => expect(state.write).toHaveBeenCalledWith('a'))
    state.listener!('SIGNED_IN', { user: { id: 'b' } })
    await vi.waitFor(() => expect(apply).toHaveBeenCalledWith({ owner: 'b' }))
    pending.resolve({ data: [{ saved, current_version: 99, current_data: { secret: 'a-only' }, saved_at: '2099-01-01' }], error: null })
    await flush
    expect(storage.get('local-pro')).toBe(JSON.stringify({ owner: 'b' }))
    expect(storage.get('aetheris.sync.meta')).not.toContain('99')
    expect(apply).not.toHaveBeenCalledWith(expect.objectContaining({ secret: 'a-only' }))
  })
})
