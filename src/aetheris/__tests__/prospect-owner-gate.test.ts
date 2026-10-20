import { describe, it, expect } from 'vitest'
import { requirePrivateOwner, NOT_CONFIGURED, DENIED, type GateRpc } from '@/aetheris/prospect/owner-gate'
const rpcOf = (r: { data: unknown; error: { code?: string } | null }, calls: string[] = []): GateRpc => async fn => { calls.push(fn); return r }
describe('prospect owner gate', () => {
  it('missing grant function is denied with no admin fallback', async () => {
    const calls: string[] = []
    await expect(requirePrivateOwner(rpcOf({ data: null, error: { code: 'PGRST202' } }, calls))).rejects.toThrow(NOT_CONFIGURED)
    expect(calls).toEqual(['has_private_owner_grant'])
  })
  it('other database errors are denied', async () => {
    await expect(requirePrivateOwner(rpcOf({ data: null, error: { code: '42501' } }))).rejects.toThrow(DENIED)
  })
  it('admin without grant (false) is denied', async () => {
    await expect(requirePrivateOwner(rpcOf({ data: false, error: null }))).rejects.toThrow(DENIED)
  })
  it('only a literal true grant is approved', async () => {
    await expect(requirePrivateOwner(rpcOf({ data: 'true', error: null }))).rejects.toThrow(DENIED)
    await expect(requirePrivateOwner(rpcOf({ data: true, error: null }))).resolves.toBeUndefined()
  })
})
