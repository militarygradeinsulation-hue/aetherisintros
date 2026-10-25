import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ getSession: vi.fn(), createClient: vi.fn((..._args: unknown[]) => ({})) }))
vi.mock('./client', () => ({ supabase: { auth: { getSession: mock.getSession } } }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mock.createClient }))
import { memberClient } from './member-client'
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test') })
describe('account-bound transport', () => {
  it('keeps the initiating token after the browser changes accounts', async () => {
    const session = { user: { id: 'a' }, access_token: 'a-token' }
    mock.getSession.mockResolvedValue({ data: { session }, error: null })
    await memberClient('a')
    const options = mock.createClient.mock.calls[0]?.[2] as { accessToken: () => Promise<string> }
    session.access_token = 'b-token'; session.user.id = 'b'
    expect(await options.accessToken()).toBe('a-token')
  })
  it('rejects a different current account before creating a request client', async () => {
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: 'b' }, access_token: 'b-token' } }, error: null })
    await expect(memberClient('a')).rejects.toThrow('account changed')
    expect(mock.createClient).not.toHaveBeenCalled()
  })
})
