import { describe, expect, it } from 'vitest'
import { NetworkWriteError, requireSavedNetworkRecord } from './network-write-receipt'

const id = 'post-1'
const owner = 'member-1'
const confirmed = { data: { id, author_id: owner }, error: null }

describe('requireSavedNetworkRecord', () => {
  it('accepts only the matching server receipt', async () => {
    await expect(requireSavedNetworkRecord(async () => confirmed, id, owner, 'post')).resolves.toBeUndefined()
  })

  it('rejects a receipt for another owner', async () => {
    await expect(requireSavedNetworkRecord(async () => ({
      data: { id, author_id: 'another-member' }, error: null,
    }), id, owner, 'post')).rejects.toMatchObject({ reason: 'unconfirmed' })
  })

  it('rejects an empty successful response', async () => {
    await expect(requireSavedNetworkRecord(async () => ({ data: null, error: null }), id, owner, 'need'))
      .rejects.toMatchObject({ reason: 'unconfirmed' })
  })

  it('classifies permission and validation failures', async () => {
    for (const [code, reason] of [['42501', 'permission'], ['23514', 'validation']] as const) {
      await expect(requireSavedNetworkRecord(async () => ({
        data: null, error: { code },
      }), id, owner, 'post')).rejects.toMatchObject({ reason })
    }
  })

  it('treats a transport exception as an unconfirmed network write', async () => {
    await expect(requireSavedNetworkRecord(async () => { throw new Error('offline') }, id, owner, 'post'))
      .rejects.toMatchObject({ reason: 'network' })
  })

  it('requires an authenticated owner', async () => {
    await expect(requireSavedNetworkRecord(async () => confirmed, id, '', 'post'))
      .rejects.toBeInstanceOf(NetworkWriteError)
  })
})
