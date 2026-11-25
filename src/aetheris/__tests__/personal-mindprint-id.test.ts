import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { personalMindprintId } from '@/lib/personalMindprint.functions'

describe('browser-safe Mindprint IDs', () => {
  it('retains the exact historical SHA-256 record ID across the change', async () => {
    for (const owner of ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222']) {
      const hex = createHash('sha256').update('askintros:personal-mindprint:v1:' + owner).digest('hex')
      const expected = [hex.slice(0, 8), hex.slice(8, 12), '5' + hex.slice(13, 16), 'a' + hex.slice(17, 20), hex.slice(20, 32)].join('-')
      expect(await personalMindprintId(owner)).toBe(expected)
    }
  })
})
