import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ viewer: 'a' as string | null, download: vi.fn(), client: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: mock.viewer ? { user: { id: mock.viewer } } : null } }) } } }))
vi.mock('@/integrations/supabase/member-client', () => ({ memberClient: mock.client }))
import { clearAvatarCache, resolveAvatarUrl } from '../avatar'
beforeEach(() => {
  mock.viewer = 'a'; vi.clearAllMocks()
  mock.client.mockImplementation(async (viewer: string) => ({ storage: { from: () => ({ download: (path: string) => mock.download(viewer,path) }) } }))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:private-avatar')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => { clearAvatarCache(); vi.restoreAllMocks() })
describe('private avatar account isolation', () => {
  it('never reuses another account cached download', async () => {
    mock.download.mockResolvedValueOnce({ data: new Blob(['a']), error: null }).mockResolvedValueOnce({ data: null, error: { code: 'denied' } })
    expect(await resolveAvatarUrl('a/private.png')).toBe('blob:private-avatar')
    mock.viewer = 'b'
    expect(await resolveAvatarUrl('a/private.png')).toBeNull()
    expect(mock.download).toHaveBeenLastCalledWith('b','a/private.png')
  })
  it('does not publish an old download after an account change', async () => {
    let resolve!: (value: unknown) => void
    mock.download.mockReturnValue(new Promise(r => { resolve = r }))
    const work = resolveAvatarUrl('a/private.png')
    await vi.waitFor(() => expect(mock.download).toHaveBeenCalled())
    mock.viewer = 'b'; clearAvatarCache()
    resolve({ data: new Blob(['a']), error: null })
    expect(await work).toBeNull()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('does not return cached private media to a signed-out visitor', async () => {
    mock.download.mockResolvedValue({ data: new Blob(['a']), error: null })
    await resolveAvatarUrl('a/private.png')
    mock.viewer = null
    expect(await resolveAvatarUrl('a/private.png')).toBeNull()
  })
  it('keeps ordinary bundled portraits working without an account', async () => {
    mock.viewer = null
    expect(await resolveAvatarUrl('/demo/portrait.webp')).toBe('/demo/portrait.webp')
    expect(mock.client).not.toHaveBeenCalled()
  })
})
