import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { requireConfirmedAdminWrite } from '../lib/admin-launch-receipt'

describe('owner launch-control write acknowledgements', () => {
  it('only accepts a matching server-confirmed row', async () => {
    await expect(requireConfirmedAdminWrite(
      async () => ({ data: { mode: 'closed', capacity: 1000 }, error: null }),
      row => row.mode === 'closed' && row.capacity === 1000, 'Launch settings',
    )).resolves.toEqual({ mode: 'closed', capacity: 1000 })
  })
  it('rejects a denied or zero-row update', async () => {
    await expect(requireConfirmedAdminWrite(
      async () => ({ data: null, error: null }),
      () => true, 'Member status',
    )).rejects.toThrow('not confirmed')
    await expect(requireConfirmedAdminWrite(
      async () => ({ data: null, error: { message: 'permission denied' } }),
      () => true, 'Member status',
    )).rejects.toThrow('not confirmed')
  })
  it('rejects a mismatched record rather than claiming success', async () => {
    await expect(requireConfirmedAdminWrite(
      async () => ({ data: { user_id: 'other', status: 'approved' }, error: null }),
      row => row.user_id === 'requested', 'Member status',
    )).rejects.toThrow('not confirmed')
  })
  it('handles an actual network rejection without raw secrets', async () => {
    await expect(requireConfirmedAdminWrite(
      async () => { throw new Error('private provider details') },
      () => true, 'Invitation creation',
    )).rejects.toThrow('could not reach')
  })
  it('guards every existing admin mutation and avoids Math.random invites', () => {
    const page = readFileSync(new URL('../../routes/_authenticated/admin.early-access.tsx', import.meta.url), 'utf8')
    expect(page.match(/requireConfirmedAdminWrite</g)?.length).toBe(4)
    expect(page).toContain('crypto.randomUUID()')
    expect(page).not.toContain('Math.random().toString')
    expect(page).toContain('savingRef.current')
    expect(page).toContain('role="alert"')
  })
})
