import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ user: 'owner', writes: 0, match: true, error: false, filters: [] as Array<[string, unknown]> }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: state.user } }, error: null }) },
  from: () => ({ update: () => {
    state.writes++
    const query = { eq: (key: string, value: unknown) => { state.filters.push([key, value]); return query },
      is: (key: string, value: unknown) => { state.filters.push([key, value]); return query },
      select: () => ({ maybeSingle: async () => ({ data: state.match ? { id: 'owner' } : null, error: state.error ? { message: 'denied' } : null }) }) }
    return query
  } }),
} }))
import { saveReviewedProfileScan } from '../profile-scan-save'

describe('reviewed scan owner and concurrency guards', () => {
  beforeEach(() => { state.user = 'owner'; state.writes = 0; state.match = true; state.error = false; state.filters = [] })
  it('rejects a switched account before any write', async () => {
    state.user = 'other'
    await expect(saveReviewedProfileScan({ title: 'CEO' }, { userId: 'owner', baseline: { title: 'Founder' } })).rejects.toThrow('account changed')
    expect(state.writes).toBe(0)
  })
  it('compares selected saved columns and scopes writes to the same member', async () => {
    await saveReviewedProfileScan({ title: 'CEO' }, { userId: 'owner', baseline: { title: 'Founder' } })
    expect(state.filters).toEqual([['id', 'owner'], ['title', 'Founder']])
  })
  it('does not report saved when a concurrent edit prevents the receipt', async () => {
    state.match = false
    await expect(saveReviewedProfileScan({ title: 'CEO' }, { userId: 'owner', baseline: { title: 'Founder' } })).rejects.toThrow('profile changed')
  })
  it('does not report saved after a permission failure', async () => {
    state.error = true
    await expect(saveReviewedProfileScan({ title: 'CEO' }, { userId: 'owner', baseline: { title: 'Founder' } })).rejects.toThrow('could not be saved')
  })
  it('rejects unsupported-only changes without writing', async () => {
    await expect(saveReviewedProfileScan({ credentials: 'Certificate' }, { userId: 'owner', baseline: {} })).rejects.toThrow('No supported')
    expect(state.writes).toBe(0)
  })
  it('compares the photo baseline in the same guarded write as selected profile fields', async () => {
    await saveReviewedProfileScan({ title: 'CEO' }, { userId: 'owner', baseline: { title: 'Founder', avatar_url: null } }, 'owner/avatar.jpg')
    expect(state.filters).toEqual([['id', 'owner'], ['title', 'Founder'], ['avatar_url', null]])
    expect(state.writes).toBe(1)
  })
})