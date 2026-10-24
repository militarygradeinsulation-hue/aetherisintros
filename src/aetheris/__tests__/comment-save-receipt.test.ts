import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), report: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/lib/error-report', () => ({ reportClientError: mocks.report }))
import { saveComment } from '../live'

describe('comment save acknowledgement', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.from.mockReturnValue({ insert: mocks.insert })
    mocks.insert.mockReturnValue({ select: mocks.select })
    mocks.select.mockReturnValue({ maybeSingle: mocks.maybeSingle })
  })

  it('accepts a saved comment only for the requested post and author', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'comment-1', post_id: 'post-1', author_id: 'member-a' }, error: null })
    await expect(saveComment('post-1', 'member-a', 'Useful context')).resolves.toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith('post_comments')
    expect(mocks.insert).toHaveBeenCalledWith({ post_id: 'post-1', author_id: 'member-a', text: 'Useful context' })
  })

  it('rejects absent receipts and receipts for another post or member', async () => {
    for (const data of [null, {}, { id: 'comment-1', post_id: 'other', author_id: 'member-a' }, { id: 'comment-1', post_id: 'post-1', author_id: 'other' }]) {
      mocks.maybeSingle.mockResolvedValue({ data, error: null })
      await expect(saveComment('post-1', 'member-a', 'Useful context')).rejects.toThrow('not confirmed')
    }
  })

  it('rejects a denied write without exposing server details', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'private server detail' } })
    await expect(saveComment('post-1', 'member-a', 'Useful context')).rejects.toThrow('Comment was not saved.')
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ code: '42501' }), 'comment-write')
  })
})
