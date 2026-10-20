import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), linkIdentity: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth } }))
import { startLinkedInAuthentication } from '../linkedin-auth'

describe('LinkedIn authentication handoff', () => {
  beforeEach(() => vi.resetAllMocks())

  it('starts sign-in using only OIDC scopes and the membership-gated callback', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://provider.test/authorize' }, error: null })
    await startLinkedInAuthentication('signin', 'https://askintros.vip/early-access')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'linkedin_oidc', options: { scopes: 'openid profile email', redirectTo: 'https://askintros.vip/early-access' } })
    expect(auth.linkIdentity).not.toHaveBeenCalled()
  })

  it('links the signed-in identity instead of starting a second sign-in', async () => {
    auth.linkIdentity.mockResolvedValue({ data: { url: 'https://provider.test/authorize' }, error: null })
    await startLinkedInAuthentication('link', 'https://askintros.vip/app')
    expect(auth.linkIdentity).toHaveBeenCalledWith({ provider: 'linkedin_oidc', options: { scopes: 'openid profile email', redirectTo: 'https://askintros.vip/app' } })
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
  })

  it('reports disabled providers without treating the connection as complete', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'provider disabled' } })
    await expect(startLinkedInAuthentication('signin', 'https://askintros.vip/early-access')).rejects.toThrow('Try email')
  })

  it('rejects a missing redirect and propagates network failures', async () => {
    auth.linkIdentity.mockResolvedValue({ data: { url: null }, error: null })
    await expect(startLinkedInAuthentication('link', 'https://askintros.vip/app')).rejects.toThrow('did not return')
    auth.linkIdentity.mockRejectedValue(new Error('Network unavailable'))
    await expect(startLinkedInAuthentication('link', 'https://askintros.vip/app')).rejects.toThrow('Network unavailable')
  })
})
