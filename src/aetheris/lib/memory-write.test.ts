import { describe, expect, it, vi } from 'vitest'
import { confirmMemoryWrite, MEMORY_FAILURE } from './memory-write'

const row = { id: 'note-1', user_id: 'member-a', text: 'Follow up Friday', source: 'Private note' }
describe('confirmed Memory writes', () => {
  it('requires a matching owner, record and content receipt', async () => {
    const duplicate = vi.fn()
    await confirmMemoryWrite(async () => ({ data: row, error: null }), duplicate, row)
    expect(duplicate).not.toHaveBeenCalled()
  })
  it.each([
    { ...row, user_id: 'member-b' }, { ...row, id: 'other-note' },
    { ...row, text: 'other content' }, { ...row, source: 'different source' },
  ])('rejects a mismatched receipt: %j', async data => {
    await expect(confirmMemoryWrite(async () => ({ data, error: null }), vi.fn(), row)).rejects.toThrow(MEMORY_FAILURE)
  })
  it('accepts a trigger-suppressed duplicate only after owner-scoped readback', async () => {
    const duplicate = vi.fn(async () => ({ data: { ...row, id: 'existing-note' }, error: null }))
    await confirmMemoryWrite(async () => ({ data: null, error: null }), duplicate, row)
    expect(duplicate).toHaveBeenCalledOnce()
  })
  it.each([null, { ...row, user_id: 'other-member' }])('rejects an absent or foreign duplicate: %j', async data => {
    await expect(confirmMemoryWrite(async () => ({ data: null, error: null }), async () => ({ data, error: null }), row)).rejects.toThrow(MEMORY_FAILURE)
  })
  it('does not turn database denials into success or expose raw errors', async () => {
    await expect(confirmMemoryWrite(async () => ({ data: null, error: { message: 'sensitive database details' } }), vi.fn(), row)).rejects.toThrow(MEMORY_FAILURE)
  })
})
