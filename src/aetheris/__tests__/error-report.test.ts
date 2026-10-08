import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }))

describe('browser error reporting', () => {
  beforeEach(() => {
    rpc.mockClear(); vi.resetModules()
    vi.stubGlobal('window', {}); vi.stubGlobal('location', { pathname: '/app', search: '' }); vi.stubGlobal('navigator', { userAgent: 'test' })
  })

  it('reports each distinct error once, with the page', async () => {
    const { reportClientError } = await import('@/lib/error-report')
    const e = new Error('Boom')
    reportClientError(e, 'page'); reportClientError(e, 'page')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('log_app_error', expect.objectContaining({ p_message: '[page] Error: Boom' }))
  })

  it('ignores noise and caps reports per page load', async () => {
    const { reportClientError } = await import('@/lib/error-report')
    reportClientError('Script error.')
    reportClientError('ResizeObserver loop completed with undelivered notifications.')
    expect(rpc).not.toHaveBeenCalled()
    for (let i = 0; i < 25; i++) reportClientError(new Error(`e${i}`))
    expect(rpc).toHaveBeenCalledTimes(10)
  })
})
