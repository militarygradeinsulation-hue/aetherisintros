import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), insert: vi.fn(), select: vi.fn(), single: vi.fn(), showcase: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }))
vi.mock('../showcase', () => ({ isShowcase: mocks.showcase }))
import { saveQuickNote } from '../quick-note-save'
import { ACCOUNT_FAILURE, DEMO_KEY, DEVICE_FAILURE } from '../quick-note'

describe('quick note persistence connection', () => {
  const storage = { getItem: vi.fn(), setItem: vi.fn() }
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('localStorage', storage)
    storage.getItem.mockReturnValue(null)
    mocks.showcase.mockReturnValue(false)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'member-a' } }, error: null })
    mocks.from.mockReturnValue({ insert: mocks.insert })
    mocks.insert.mockReturnValue({ select: mocks.select })
    mocks.select.mockReturnValue({ single: mocks.single })
    mocks.single.mockResolvedValue({ data: { id: 'persisted-note' }, error: null })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('requires a saved row receipt and writes a private account note', async () => {
    expect(await saveQuickNote(' private thought ')).toBe('account')
    expect(mocks.from).toHaveBeenCalledWith('memories')
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'member-a', text: 'private thought', scope: 'private', kind: 'note' }))
    expect(mocks.select).toHaveBeenCalledWith('id')
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('never reports account success without a receipt or after a denied write', async () => {
    for (const result of [{ data: null, error: null }, { data: null, error: { message: 'private database detail' } }]) {
      mocks.single.mockResolvedValue(result)
      await expect(saveQuickNote('private thought')).rejects.toThrow(ACCOUNT_FAILURE)
    }
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('does not silently send an auth failure to device storage', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthRetryableFetchError' } })
    await expect(saveQuickNote('private thought')).rejects.toThrow(ACCOUNT_FAILURE)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('keeps showcase notes on the device even when a real user is signed in', async () => {
    mocks.showcase.mockReturnValue(true)
    expect(await saveQuickNote('demo thought')).toBe('device')
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    expect(storage.setItem).toHaveBeenCalledWith(DEMO_KEY, expect.stringContaining('demo thought'))
  })
  it('supports an actual guest but reports unavailable device storage', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError' } })
    expect(await saveQuickNote('guest thought')).toBe('device')
    storage.setItem.mockImplementation(() => { throw new Error('quota exceeded') })
    await expect(saveQuickNote('guest thought')).rejects.toThrow(DEVICE_FAILURE)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
