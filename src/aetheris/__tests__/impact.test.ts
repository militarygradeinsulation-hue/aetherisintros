import { describe, expect, it } from 'vitest'

import {
  FEWER_THAN_3, categoryRows, formatCount, formatDays, formatUsd, quarterRange, recentQuarters, slugify, suppressMetrics,
} from '../impact'

describe('suppressMetrics', () => {
  const raw = {
    from: '2026-07-01', to: '2026-09-30',
    members_verified: 41, members_new: 2, asks_posted: 3, asks_answered: 0,
    outcomes_by_category: { customer: 4, hire: 1 },
    deals_won: 2, deals_won_usd: 2, deals_value_usd_cents: 4800000,
    intros_met: 5, median_days_intro_to_meeting: 6.5,
  }
  it('turns every count below 3, including zero and nested ones, into "fewer than 3"', () => {
    const s = suppressMetrics(raw)
    expect(s.members_verified).toBe(41)
    expect(s.asks_posted).toBe(3)
    expect(s.members_new).toBe(FEWER_THAN_3)
    expect(s.asks_answered).toBe(FEWER_THAN_3)
    expect(s.outcomes_by_category).toEqual({ customer: 4, hire: FEWER_THAN_3 })
    expect(s.deals_won).toBe(FEWER_THAN_3)
  })
  it('withholds the deal total behind fewer than 3 USD deals, and keeps dates as they are', () => {
    const s = suppressMetrics(raw)
    expect(s.deals_value_usd_cents).toBeNull()
    expect(s.from).toBe('2026-07-01')
    expect(s.median_days_intro_to_meeting).toBe(6.5)
    expect(suppressMetrics({ ...raw, deals_won_usd: 3 }).deals_value_usd_cents).toBe(4800000)
  })
  it('withholds the median wait when fewer than 3 introductions met', () => {
    expect(suppressMetrics({ ...raw, intros_met: 2 }).median_days_intro_to_meeting).toBeNull()
  })
})

describe('formatting', () => {
  it('formats counts and suppressed values', () => {
    expect(formatCount(1234)).toBe('1,234')
    expect(formatCount(FEWER_THAN_3)).toBe('Fewer than 3')
    expect(formatCount(null)).toBe('—')
  })
  it('formats USD compactly above $10K and exactly below', () => {
    expect(formatUsd(4800000)).toBe('$48K')
    expect(formatUsd(123456789)).toBe('$1.2M')
    expect(formatUsd(250000000)).toBe('$2.5M')
    expect(formatUsd(950000)).toBe('$9,500')
    expect(formatUsd('7000000')).toBe('$70K')
    expect(formatUsd(null)).toBeNull()
    expect(formatUsd(FEWER_THAN_3)).toBeNull()
  })
  it('formats days', () => {
    expect(formatDays(6.5)).toBe('6.5 days')
    expect(formatDays(1)).toBe('1 day')
    expect(formatDays(null)).toBeNull()
  })
  it('orders categories largest first with suppressed ones last', () => {
    expect(categoryRows({ hire: FEWER_THAN_3, customer: 4, investor: 7 })).toEqual([
      { key: 'investor', label: 'Investment', value: '7' },
      { key: 'customer', label: 'New customers', value: '4' },
      { key: 'hire', label: 'Hires', value: 'Fewer than 3' },
    ])
    expect(categoryRows(undefined)).toEqual([])
  })
})

describe('quarters and slugs', () => {
  it('gives inclusive calendar quarter dates', () => {
    expect(quarterRange(2026, 1)).toEqual({ label: 'Q1 2026', from: '2026-01-01', to: '2026-03-31' })
    expect(quarterRange(2024, 1).to).toBe('2024-03-31')
    expect(quarterRange(2026, 4)).toEqual({ label: 'Q4 2026', from: '2026-10-01', to: '2026-12-31' })
  })
  it('lists recent quarters newest first across a year boundary', () => {
    expect(recentQuarters(new Date('2026-02-10T00:00:00Z'), 3).map(q => q.label)).toEqual(['Q1 2026', 'Q4 2025', 'Q3 2025'])
  })
  it('makes URL slugs the same way the database does', () => {
    expect(slugify('Q3 2026')).toBe('q3-2026')
    expect(slugify('  H1 / 2026 — Founders  ')).toBe('h1-2026-founders')
  })
})
