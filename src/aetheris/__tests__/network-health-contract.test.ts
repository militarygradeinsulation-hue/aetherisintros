import { describe, expect, it } from 'vitest'
import { parseNetworkHealth, parseAdminErrorReports } from '../lib/network-health-contract'

const valid = () => ({
  checked_at: '2026-10-17T20:00:00Z',
  members: { total: 3, onboarded: 2, verified: 1, blocked: 2 },
  marketplace: { live_asks: 0, open_intros: 2, demo_rows_still_present: 0 },
  incomplete_profiles: [{ name: 'Member', email: 'member@example.test', strength: 42,
    joined: '2026-10-17', last_sign_in: null, days_since_sign_in: null }],
  stalled_verifications: [{ name: 'Member', status: 'manual_review', days: 2 }],
  likely_duplicates: [{ name: 'Member', accounts: [{ email: 'member@example.test' }] }],
  suspect_field_values: [{ name: 'Member', field: 'location', value: 'USA', issue: 'Country only' }],
  isolated_members: ['Member'],
})

describe('existing admin network health response contract', () => {
  it('preserves genuine zeros and valid nested diagnostic lists', () => {
    const result = parseNetworkHealth(valid())
    expect(result.marketplace.live_asks).toBe(0)
    expect(result.stalled_verifications[0]!.status).toBe('manual_review')
  })
  it('refuses partial server responses instead of silently displaying zeros', () => {
    for (const key of ['members','marketplace','checked_at','incomplete_profiles','isolated_members']) {
      const v = { ...valid(), [key]: undefined }
      expect(() => parseNetworkHealth(v)).toThrow('incomplete or invalid')
    }
    expect(() => parseNetworkHealth({ ...valid(), members: { total: 3 } })).toThrow('incomplete')
  })
  it('refuses unsafe counts, impossible totals and malformed detail arrays', () => {
    for (const n of [-1, '4', 1.5, NaN, Infinity]) {
      expect(() => parseNetworkHealth({ ...valid(), marketplace: { ...valid().marketplace, live_asks: n } })).toThrow()
    }
    expect(() => parseNetworkHealth({ ...valid(), members: { total: 1, onboarded: 2, verified: 0, blocked: 0 } })).toThrow()
    expect(() => parseNetworkHealth({ ...valid(), stalled_verifications: [{ name: 'A', status: null }] })).toThrow()
    expect(() => parseNetworkHealth({ ...valid(), likely_duplicates: [{ name: 'A', accounts: {} }] })).toThrow()
  })
  it('accepts nullable dates and member names but never invents metric values', () => {
    const result = parseNetworkHealth({ ...valid(), incomplete_profiles: [{ ...valid().incomplete_profiles[0], name: null, strength: null }] })
    expect(result.incomplete_profiles[0]).toMatchObject({ name: '', strength: null, last_sign_in: null })
  })
})

describe('owner error-report service contract', () => {
  const report = () => ({ id: 'sample-id', source: 'server', message: 'Example failure',
    created_at: '2026-10-17T20:00:00Z', stack: null, url: null, user_agent: null })
  it('shows a confirmed empty log only for an actual empty response', () => {
    expect(parseAdminErrorReports([])).toEqual([])
    expect(parseAdminErrorReports([report()])).toMatchObject([{ source: 'server', url: '', stack: '' }])
  })
  it('never turns null/partial/malformed replies into zero incident reports', () => {
    for (const result of [null, undefined, {}, [{ ...report(), message: null }],
      [{ ...report(), source: 'other' }], [{ ...report(), created_at: 'invalid' }]]) {
      expect(() => parseAdminErrorReports(result)).toThrow('incomplete or invalid')
    }
  })
})
