import { describe, expect, it, vi } from 'vitest'
import { requireConfirmedProfileSave } from '../lib/onboarding-save'

const MEMBER = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'

describe('confirmed onboarding profile persistence', () => {
  it('accepts only a server-confirmed save for the signed-in member', async () => {
    const write = vi.fn().mockResolvedValue({ data: { id: MEMBER }, error: null })
    await expect(requireConfirmedProfileSave(MEMBER, write)).resolves.toBeUndefined()
    expect(write).toHaveBeenCalledTimes(1)
  })
  it('rejects a no-row database response instead of activating the account', async () => {
    await expect(requireConfirmedProfileSave(MEMBER, async () => ({ data: null, error: null })))
      .rejects.toThrow('not confirmed')
  })
  it('rejects a mismatched member ID', async () => {
    await expect(requireConfirmedProfileSave(MEMBER, async () => ({ data: { id: OTHER }, error: null })))
      .rejects.toThrow('not confirmed')
  })
  it('does not treat an RLS denial as a saved profile', async () => {
    await expect(requireConfirmedProfileSave(MEMBER, async () => ({ data: null, error: { message: 'permission denied' } })))
      .rejects.toThrow('could not be saved')
  })
  it('recovers a rejected request without leaking raw transport errors', async () => {
    await expect(requireConfirmedProfileSave(MEMBER, async () => { throw new Error('private internal detail') }))
      .rejects.toThrow('could not be reached')
  })
})
