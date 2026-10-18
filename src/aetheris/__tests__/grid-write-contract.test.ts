import { describe, expect, it } from 'vitest'
import { requireSavedGridRecord } from '../crm/grid-write-contract'

describe('CRM and Grid acknowledged writes', () => {
  it('accepts the persisted record returned by the canonical CRM repo', async () => {
    const row = { id: 'row-1', values: { name: 'Updated' } }
    await expect(requireSavedGridRecord(Promise.resolve(row))).resolves.toBe(row)
  })
  it('rejects an RLS-denied or missing record without claiming a saved edit', async () => {
    await expect(requireSavedGridRecord(Promise.resolve(null))).rejects.toThrow('could not be saved')
  })
  it('returns a safe, retryable error on a rejected database promise', async () => {
    await expect(requireSavedGridRecord(Promise.reject(new Error('private DB detail'))))
      .rejects.toThrow('Check your connection or permissions')
  })
})
