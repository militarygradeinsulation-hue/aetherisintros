import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { requireSavedNetworkRecord } from '../lib/network-write-receipt'

const person = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const post = 'post-1'

describe('live network post and need acknowledgement', () => {
  it('requires a matching persisted id and signed-in author', async () => {
    await expect(requireSavedNetworkRecord(
      async () => ({ data: { id: post, author_id: person }, error: null }), post, person, 'post',
    )).resolves.toBeUndefined()
  })
  it('rejects no-row insert responses, RLS denials and wrong author', async () => {
    for (const response of [
      { data: null, error: null },
      { data: null, error: { message: 'permission denied' } },
      { data: { id: post, author_id: other }, error: null },
      { data: { id: 'different', author_id: person }, error: null },
    ]) {
      await expect(requireSavedNetworkRecord(async () => response, post, person, 'need')).rejects.toThrow('not confirmed')
    }
  })
  it('uses a retryable, redacted message when transport throws', async () => {
    await expect(requireSavedNetworkRecord(
      async () => { throw new Error('private Supabase token') }, post, person, 'post',
    )).rejects.toThrow('could not be confirmed')
  })
  it('rejects a missing authenticated member before attempting the write', async () => {
    await expect(requireSavedNetworkRecord(async () => { throw new Error('should not execute') }, post, '', 'post'))
      .rejects.toThrow('Sign in')
  })
  it('both live writers read back ids before reporting success', () => {
    const source = readFileSync(new URL('../db.ts', import.meta.url), 'utf8')
    expect(source.match(/\.select\('id,author_id'\)\.maybeSingle\(\)/g)).toHaveLength(2)
    expect(source.match(/await requireSavedNetworkRecord\(/g)).toHaveLength(2)
    expect(source).toContain("reportClientError(result.error, 'post-persist')")
    expect(source).toContain("reportClientError(result.error, 'ask-persist')")
  })
})
