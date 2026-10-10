import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  createStoreReadiness, shouldRetryInitialSync, SYNCED_STORE_KEYS, keysToClearOnSignOut, mergeStoreData, planInitialSync, retryDelayMs, type LocalCopy,
} from '../sync-logic'

const local = (over: Partial<LocalCopy> = {}): LocalCopy => ({ present: true, baseVersion: 0, dirty: false, foreign: false, ...over })

describe('planInitialSync', () => {
  it('does nothing when neither side has data', () => {
    expect(planInitialSync(local({ present: false }), null)).toEqual({ action: 'noop' })
  })
  it('uploads local data on the first sync', () => {
    expect(planInitialSync(local(), null)).toEqual({ action: 'upload', baseVersion: 0 })
  })
  it('loads the account copy on a new device', () => {
    expect(planInitialSync(local({ present: false }), { version: 4, data: {} })).toEqual({ action: 'apply-remote' })
  })
  it('lets a newer account copy win when this device has no unsaved work', () => {
    expect(planInitialSync(local({ baseVersion: 2 }), { version: 5, data: {} })).toEqual({ action: 'apply-remote' })
  })
  it('merges unsaved work into a newer account copy', () => {
    expect(planInitialSync(local({ baseVersion: 2, dirty: true }), { version: 5, data: {} })).toEqual({ action: 'merge-upload', baseVersion: 5 })
  })
  it('treats never-synced local data as unsaved work when the account already has a copy', () => {
    expect(planInitialSync(local(), { version: 3, data: {} })).toEqual({ action: 'merge-upload', baseVersion: 3 })
  })
  it('uploads unsaved work that is based on the current version', () => {
    expect(planInitialSync(local({ baseVersion: 3, dirty: true }), { version: 3, data: {} })).toEqual({ action: 'upload', baseVersion: 3 })
  })
  it('does nothing when both copies are in step', () => {
    expect(planInitialSync(local({ baseVersion: 3 }), { version: 3, data: {} })).toEqual({ action: 'noop' })
  })
  it("never uploads another member's leftover data", () => {
    expect(planInitialSync(local({ foreign: true, dirty: true }), null)).toEqual({ action: 'reset' })
    expect(planInitialSync(local({ foreign: true, dirty: true }), { version: 1, data: {} })).toEqual({ action: 'apply-remote' })
  })
})

describe('account store readiness', () => {
  it('keeps a store unready until initial hydration completes', async () => {
    const readiness = createStoreReadiness()
    let resolved = false
    const loaded = readiness.waitFor('private-blueprints').then(() => { resolved = true })
    expect(readiness.isReady('private-blueprints')).toBe(false)
    expect(resolved).toBe(false)

    readiness.markReady('private-blueprints')
    await loaded
    expect(readiness.isReady('private-blueprints')).toBe(true)
    expect(resolved).toBe(true)
  })

  it('resets account readiness after the active member changes', () => {
    const readiness = createStoreReadiness()
    readiness.markReady('private-blueprints')
    readiness.markReady('crm-ledger')
    readiness.clear('private-blueprints')
    expect(readiness.isReady('crm-ledger')).toBe(true)
    expect(readiness.isReady('private-blueprints')).toBe(false)
    readiness.markReady('private-blueprints')
    readiness.clear()
    expect(readiness.isReady('private-blueprints')).toBe(false)
    expect(readiness.isReady('crm-ledger')).toBe(false)
  })

  it('retries a stale initial load only when the same store is still waiting for the current account', () => {
    expect(shouldRetryInitialSync('a', 'b', true, false)).toBe(true)
    expect(shouldRetryInitialSync('a', 'a', true, false)).toBe(false)
    expect(shouldRetryInitialSync('a', 'b', false, false)).toBe(false)
    expect(shouldRetryInitialSync('a', 'b', true, true)).toBe(false)
    expect(shouldRetryInitialSync('a', null, true, false)).toBe(false)
  })
})

describe('mergeStoreData', () => {
  it('keeps the server version of a record both sides have', () => {
    const merged = mergeStoreData({ rooms: [{ id: 'a', name: 'local' }] }, { rooms: [{ id: 'a', name: 'remote' }] })
    expect(merged).toEqual({ rooms: [{ id: 'a', name: 'remote' }] })
  })
  it('keeps records created only on this device, newest first', () => {
    const merged = mergeStoreData(
      { rooms: [{ id: 'new' }, { id: 'a' }] },
      { rooms: [{ id: 'b' }, { id: 'a' }] },
    )
    expect(merged).toEqual({ rooms: [{ id: 'new' }, { id: 'b' }, { id: 'a' }] })
  })
  it('keeps collections only one side has', () => {
    expect(mergeStoreData({ a: [{ id: '1' }] }, { b: [{ id: '2' }] })).toEqual({ a: [{ id: '1' }], b: [{ id: '2' }] })
  })
  it('merges keyed objects (workspace edit patches) with the server winning per field', () => {
    const merged = mergeStoreData(
      { deals: { d1: { stage: 'won', value: 10 }, d2: { stage: 'lost' } } },
      { deals: { d1: { stage: 'proposal' } } },
    )
    expect(merged).toEqual({ deals: { d1: { stage: 'proposal', value: 10 }, d2: { stage: 'lost' } } })
  })
  it('uses the server value for lists without ids and for plain values', () => {
    expect(mergeStoreData({ tags: ['x'], n: 1 }, { tags: ['y'], n: 2 })).toEqual({ tags: ['y'], n: 2 })
  })
  it('returns local data when the server has none', () => {
    expect(mergeStoreData({ a: 1 }, undefined)).toEqual({ a: 1 })
  })
})

describe('sign-out cleanup', () => {
  it('clears member keys and live stores but keeps demo copies', () => {
    const keys = [
      'aetheris.sync.meta', 'aetheris.ledger.patch.u1', 'aetheris-moat-v1-live', 'aetheris-relationship-os-v1-live',
      'aetheris-pro-v1-live', 'aetheris-platform-v1-live', 'aetheris.business-execution-v1-live.u1',
      'aetheris-moat-v1-demo', 'aetheris-pro-v1-demo', 'theme', 'aetherisx',
    ]
    expect(keysToClearOnSignOut(keys).sort()).toEqual([
      'aetheris-moat-v1-live', 'aetheris-platform-v1-live', 'aetheris-pro-v1-live', 'aetheris-relationship-os-v1-live',
      'aetheris.business-execution-v1-live.u1', 'aetheris.ledger.patch.u1', 'aetheris.sync.meta',
    ])
  })
})

describe('retries and allowlist', () => {
  it('backs off and caps the retry delay', () => {
    expect(retryDelayMs(1)).toBe(2000)
    expect(retryDelayMs(3)).toBe(8000)
    expect(retryDelayMs(20)).toBe(60000)
  })
  it('matches the database allowlist and never includes demo stores', () => {
    const sql = [
      readFileSync(new URL('../../../../drizzle/migrations/0047_workspace_sync.sql', import.meta.url), 'utf8'),
      readFileSync(new URL('../../../../drizzle/migrations/0059_business_execution_workbench.sql', import.meta.url), 'utf8'),
    ].join('\n')
    for (const key of SYNCED_STORE_KEYS) expect(sql).toContain(`'${key}'`)
    expect(SYNCED_STORE_KEYS.some(k => k.endsWith('-demo'))).toBe(false)
  })
})
