import { describe, expect, it } from 'vitest'
import { clampBudget, grantScopes, isEntityType, isSafeId, redactEntity } from './scope'
import { buildContextEnvelope } from './context.server'

describe('grantScopes', () => {
  it('grants only the intersection of declared and requested', () => {
    expect(grantScopes(['entity:read', 'links:read'], ['entity:read', 'events:read'], false)).toEqual(['entity:read'])
  })
  it('never grants web access implicitly', () => {
    expect(grantScopes(['entity:read', 'web:read'], undefined, false)).toEqual(['entity:read'])
    expect(grantScopes(['web:read'], ['web:read'], true)).toEqual(['web:read'])
  })
  it('cannot escalate beyond declared scopes', () => {
    expect(grantScopes(['entity:read'], ['entity:read', 'links:read', 'record:propose'], true)).toEqual(['entity:read'])
  })
})

describe('guards', () => {
  it('clamps budgets', () => {
    expect(clampBudget({ maxRecords: 10_000, maxWebCalls: -3 })).toEqual({ maxRecords: 100, maxWebCalls: 0 })
    expect(clampBudget(undefined)).toEqual({ maxRecords: 25, maxWebCalls: 0 })
  })
  it('validates types and ids', () => {
    expect(isEntityType('company')).toBe(true)
    expect(isEntityType('profiles')).toBe(false)
    expect(isSafeId("x' or 1=1")).toBe(false)
  })
  it('redacts private fields', () => {
    expect(redactEntity({ id: '1', name: 'A', email: 'a@b.c', owner_id: 'o', custom: {} })).toEqual({ id: '1', name: 'A' })
  })
})

/** Fake client that records every table read, so we can prove what the builder touches. */
function fakeDb() {
  const reads: string[] = []
  const chain = (table: string) => {
    const q: Record<string, unknown> = {}
    const self = () => q
    Object.assign(q, {
      select: self, eq: self, order: self, limit: () => Promise.resolve({ data: [] }),
      maybeSingle: () => Promise.resolve({ data: { id: 's', name: 'Acme', email: 'x@y.z', owner_id: 'o' } }),
    })
    reads.push(table)
    return q
  }
  return { reads, db: { from: chain } as never }
}

describe('buildContextEnvelope', () => {
  const base = { requestId: 'r', ownerId: 'o', actorId: 'o', actor: 'member' as const, subject: { type: 'company' as const, id: 's' }, budget: { maxRecords: 5, maxWebCalls: 0 } }
  it('reads nothing without scopes', async () => {
    const f = fakeDb()
    const env = await buildContextEnvelope(f.db, { ...base, granted: [] })
    expect(f.reads).toEqual([])
    expect(env.data).toEqual({})
  })
  it('reads only the subject table for entity:read and redacts it', async () => {
    const f = fakeDb()
    const env = await buildContextEnvelope(f.db, { ...base, granted: ['entity:read'] })
    expect(f.reads).toEqual(['crm_companies'])
    expect(env.data.entity).toEqual({ id: 's', name: 'Acme' })
  })
  it('never reads memories, messages or profiles', async () => {
    const f = fakeDb()
    await buildContextEnvelope(f.db, { ...base, granted: ['entity:read', 'links:read', 'events:read', 'web:read', 'record:propose'] })
    expect(f.reads.every(t => ['crm_companies', 'entity_links', 'entity_events'].includes(t))).toBe(true)
  })
})
