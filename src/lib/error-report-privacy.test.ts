import { afterEach, describe, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn(async () => ({ error: null })))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }))
afterEach(() => vi.unstubAllGlobals())
describe('browser diagnostic privacy', () => {
  it('omits rejected row bodies and URL query credentials', async () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('location', { pathname: '/auth', search: '?code=private-oauth-code' })
    vi.stubGlobal('navigator', { userAgent: 'test' })
    const { reportClientError } = await import('./error-report')
    reportClientError({ message: 'Save denied', details: 'Private Memory body', hint: 'secret row context' }, 'save')
    const args = rpc.mock.calls[0] as unknown as [string, Record<string, string>]
    expect(args[1]['p_url']).toBe('/auth')
    expect(JSON.stringify(args)).not.toMatch(/Private Memory|private-oauth-code|secret row context/)
    expect(args[1]['p_message']).toContain('Save denied')
  })
})
