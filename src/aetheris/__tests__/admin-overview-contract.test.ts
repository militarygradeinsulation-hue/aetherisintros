import { describe, expect, it } from 'vitest'
import { ADMIN_COUNT_KEYS, parseAdminOverview } from '../lib/admin-overview-contract'

const valid = () => Object.fromEntries([
  ...ADMIN_COUNT_KEYS.map(key => [key, 0]),
  ['generated_at', '2026-10-17T20:00:00Z'],
])

describe('admin analytics RPC payload contract', () => {
  it('accepts complete nonnegative counts and a timestamp', () => {
    const payload = { ...valid(), registered_accounts: 9822, messages: 12 }
    expect(parseAdminOverview(payload).registered_accounts).toBe(9822)
    expect(parseAdminOverview(payload).messages).toBe(12)
  })
  it('rejects a partial response rather than showing fake zero counts', () => {
    const payload = valid()
    delete payload.asks
    expect(() => parseAdminOverview(payload)).toThrow('invalid response')
  })
  it('rejects NaN, negative values, strings and fractional counts', () => {
    for (const count of [NaN, -1, '10', 2.5, Infinity]) {
      expect(() => parseAdminOverview({ ...valid(), posts: count })).toThrow('invalid response')
    }
  })
  it('rejects arrays and missing or malformed generated timestamps', () => {
    expect(() => parseAdminOverview([])).toThrow('invalid response')
    expect(() => parseAdminOverview({ ...valid(), generated_at: null })).toThrow('invalid response')
    expect(() => parseAdminOverview({ ...valid(), generated_at: 'not-a-date' })).toThrow('invalid response')
  })
})
