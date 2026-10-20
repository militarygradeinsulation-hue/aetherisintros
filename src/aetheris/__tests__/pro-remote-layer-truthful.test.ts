import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRemoteProLayer } from '../domain/pro-repository'
import type { TableGateway } from '../domain/repository'

const gateway = (over: Partial<TableGateway> = {}): TableGateway => ({
  select: async () => [],
  insert: async (_t, row) => row,
  update: async (_t, id, patch) => ({ id, ...patch }),
  delete: async () => {},
  ...over,
})

describe('remote professional layer — truthful instrumentation', () => {
  it('reports load errors and never keeps sample rows in live mode', async () => {
    const layer = createRemoteProLayer(gateway({
      select: async table => { if (table === 'deal_rooms') throw new Error('permission denied'); return [] },
    }))
    await layer.ready
    expect(layer.loadErrors().dealRooms).toBe('permission denied')
    expect(layer.snapshot().dealRooms).toEqual([])
    expect(layer.loadErrors().passportProfiles).toBeUndefined()
  })

  it('refuses to surface an unconfirmed create as saved', async () => {
    const layer = createRemoteProLayer(gateway({ insert: async () => null as unknown as Record<string, unknown> }))
    await layer.ready
    await expect(layer.repo('dealRooms').create({ id: 'x' } as never)).rejects.toThrow(/did not confirm/)
    expect(layer.snapshot().dealRooms).toEqual([])
  })

  it('uses the server-returned row on confirmed create/update', async () => {
    const layer = createRemoteProLayer(gateway({
      insert: async (_t, row) => ({ ...row, serverStamp: 's1' }),
      update: async (_t, id, patch) => ({ id, ...patch, serverStamp: 's2' }),
    }))
    await layer.ready
    const repo = layer.repo('dealRooms')
    const saved = await repo.create({ id: 'r1' } as never) as unknown as Record<string, unknown>
    expect(saved['serverStamp']).toBe('s1')
    const updated = await repo.update('r1', {} as never) as unknown as Record<string, unknown>
    expect(updated['serverStamp']).toBe('s2')
  })
})

describe('server functions surface read failures instead of empty results', () => {
  it('track record and referral reads throw on error', () => {
    const tr = readFileSync('src/lib/trackRecord.functions.ts', 'utf8')
    const wr = readFileSync('src/lib/warmReferral.functions.ts', 'utf8')
    expect(tr).toContain('Score was computed but not saved')
    expect(wr).not.toMatch(/if \(error\) return \[\]/)
  })

  it('passport shows a live empty state and the live track record', () => {
    const page = readFileSync('src/aetheris/pages/PassportPage.tsx', 'utf8')
    expect(page).toContain('<CurrentUserTrackRecord />')
    expect(page).toContain('No passport recorded for your account yet')
  })
})
