import { describe, expect, it } from 'vitest'
import { matchesOpportunityFocus, opportunityDaysLeft } from '../opportunity-focus'

const now = Date.parse('2026-10-18T23:59:59Z')
const opportunity = { status: 'open' as const, expiresOn: '2026-10-25', saved: false }

describe('opportunity focus', () => {
  it('includes today and day seven, excludes day eight from closing soon', () => {
    expect(matchesOpportunityFocus(opportunity, 'Closing soon', now)).toBe(true)
    expect(opportunityDaysLeft(opportunity, now)).toBe(7)
    expect(matchesOpportunityFocus({ ...opportunity, expiresOn: '2026-10-18' }, 'Active', now)).toBe(true)
    expect(matchesOpportunityFocus({ ...opportunity, expiresOn: '2026-10-26' }, 'Closing soon', now)).toBe(false)
  })
  it('keeps saved closed opportunities retrievable without treating them as active', () => {
    const closed = { ...opportunity, status: 'closed' as const, saved: true }
    expect(matchesOpportunityFocus(closed, 'Saved', now)).toBe(true)
    expect(matchesOpportunityFocus(closed, 'Active', now)).toBe(false)
    expect(matchesOpportunityFocus(closed, 'Past / closed', now)).toBe(true)
    expect(matchesOpportunityFocus(opportunity, 'Saved', now)).toBe(false)
  })
  it('fails closed for expired, invalid and rolled-over dates', () => {
    for (const expiresOn of ['2026-10-17', '', 'invalid', '2026-02-30', '2026-13-01']) {
      const row = { ...opportunity, expiresOn }
      expect(matchesOpportunityFocus(row, 'Active', now)).toBe(false)
      expect(matchesOpportunityFocus(row, 'Closing soon', now)).toBe(false)
      expect(matchesOpportunityFocus(row, 'Past / closed', now)).toBe(true)
    }
    expect(matchesOpportunityFocus({ ...opportunity, status: 'expired' }, 'Active', now)).toBe(false)
  })
})
