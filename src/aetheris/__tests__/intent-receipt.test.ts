import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { confirmIntentReceipt } from '../lib/intent-receipt'

const member = '00000000-0000-4000-8000-000000000001'
const id = 'ask-001'

describe('Intent Exchange confirmed writes', () => {
  it('accepts a persisted row matching user, ID and expected state', () => {
    expect(() => confirmIntentReceipt({ id, author_id: member, status: 'active' }, null, id, member, 'active')).not.toThrow()
    expect(() => confirmIntentReceipt({ id, author_id: member, status: 'closed' }, null, id, member, 'closed')).not.toThrow()
  })
  it('rejects zero rows, denial, wrong owner, wrong ID or an unchanged status', () => {
    const valid = { id, author_id: member, status: 'active' }
    for (const [row, error] of [
      [null, null],
      [null, { message: 'permission denied' }],
      [{ ...valid, author_id: null }, null],
      [{ ...valid, id: 'other' }, null],
      [{ ...valid, status: 'closed' }, null],
    ] as const) {
      expect(() => confirmIntentReceipt(row, error, id, member, 'active')).toThrow('did not confirm')
    }
  })
  it('keeps stable retry IDs and disables the editor on pending writes', () => {
    const code = readFileSync(new URL('../opportunity-ui.tsx', import.meta.url), 'utf8')
    expect(code).toContain('retryId.current ??')
    expect(code).toContain("insert.error?.code === '23505'")
    expect(code).toContain('inFlight.current = false')
    expect(code).toContain('disabled={busy || !form.statement.trim()}')
    expect(code).toContain('confirmIntentReceipt(result.data, result.error, id, graph.userId')
  })
})
