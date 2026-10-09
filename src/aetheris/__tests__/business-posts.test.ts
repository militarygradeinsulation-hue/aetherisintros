import { describe, expect, it } from 'vitest'
import {
  FEED_LANES, businessAction, businessFacts, canAct, isHttpsLink, matchesLane, parseBusinessDetails, validateBusinessDraft,
  type BusinessDraft,
} from '../business-posts'

const base: BusinessDraft = { title: 'Need a fractional CFO', description: 'Series A prep for a logistics company.', category: 'Finance & capital' }
const today = '2026-06-01'

describe('Need validation', () => {
  it('accepts a minimal need and a full one', () => {
    expect(validateBusinessDraft('Need', base, today).ok).toBe(true)
    const full = validateBusinessDraft('Need', { ...base, budgetMin: '5,000', budgetMax: '12000.50', currency: 'USD', deadline: '2026-07-01', geography: 'Toronto' }, today)
    expect(full).toMatchObject({ ok: true, details: { budgetMin: 5000, budgetMax: 12000.5, currency: 'USD', deadline: '2026-07-01', geography: 'Toronto' } })
  })
  it('rejects inverted, negative, zero, non-numeric and huge budgets', () => {
    const cases: Array<[string, string]> = [['10', '5'], ['-1', ''], ['0', ''], ['abc', ''], ['', '1e9'], ['', '2000000000']]
    for (const [min, max] of cases) {
      expect(validateBusinessDraft('Need', { ...base, budgetMin: min, budgetMax: max, currency: 'USD' }, today).ok, `${min}-${max}`).toBe(false)
    }
  })
  it('requires a supported currency with an amount, and rejects unknown ones', () => {
    expect(validateBusinessDraft('Need', { ...base, budgetMin: '5' }, today)).toMatchObject({ ok: false, errors: { currency: expect.any(String) } })
    expect(validateBusinessDraft('Need', { ...base, budgetMin: '5', currency: 'XXX' }, today).ok).toBe(false)
  })
  it('rejects past, impossible and malformed deadlines', () => {
    for (const deadline of ['2026-05-31', '2026-02-31', 'tomorrow', '01/07/2026']) expect(validateBusinessDraft('Need', { ...base, deadline }, today).ok, deadline).toBe(false)
    expect(validateBusinessDraft('Need', { ...base, deadline: today }, today).ok).toBe(true)
  })
  it('enforces title, description, category and geography limits', () => {
    expect(validateBusinessDraft('Need', { ...base, title: 'ab' }, today).ok).toBe(false)
    expect(validateBusinessDraft('Need', { ...base, title: 'x'.repeat(141) }, today).ok).toBe(false)
    expect(validateBusinessDraft('Need', { ...base, description: 'short' }, today).ok).toBe(false)
    expect(validateBusinessDraft('Need', { ...base, category: 'Weapons' }, today).ok).toBe(false)
    expect(validateBusinessDraft('Need', { ...base, geography: 'x'.repeat(81) }, today).ok).toBe(false)
  })
})

describe('Offer and Proof of work validation', () => {
  it('validates an offer price and availability', () => {
    expect(validateBusinessDraft('Offer', { ...base, startingPrice: '2500', currency: 'EUR', availability: 'From March' }, today))
      .toMatchObject({ ok: true, details: { startingPrice: 2500, currency: 'EUR', availability: 'From March' } })
    expect(validateBusinessDraft('Offer', { ...base, startingPrice: '2500' }, today).ok).toBe(false)
  })
  it('ignores need-only fields on an offer', () => {
    const r = validateBusinessDraft('Offer', { ...base, budgetMax: '9', deadline: '2020-01-01' }, today)
    expect(r.ok && Object.keys(r.details)).toEqual(['category'])
  })
  it('needs https portfolio links for proof of work', () => {
    expect(validateBusinessDraft('Proof of work', base, today)).toMatchObject({ ok: false, errors: { links: expect.any(String) } })
    for (const links of ['http://x.com', 'javascript:alert(1)', 'https://' + 'user:pw' + '@x.com', 'https://localhost', 'https://a.com b']) {
      expect(validateBusinessDraft('Proof of work', { ...base, links }, today).ok, links).toBe(false)
    }
    expect(validateBusinessDraft('Proof of work', { ...base, links: Array.from({ length: 6 }, (_, i) => `https://a${i}.com`).join('\n') }, today).ok).toBe(false)
    expect(validateBusinessDraft('Proof of work', { ...base, links: 'https://a.com/p, https://a.com/p\nhttps://b.io' }, today))
      .toMatchObject({ ok: true, details: { links: ['https://a.com/p', 'https://b.io'] } })
  })
  it('isHttpsLink rejects overlong links', () => expect(isHttpsLink(`https://a.com/${'x'.repeat(2100)}`)).toBe(false))
})

describe('stored details', () => {
  it('round-trips valid details and drops anything else', () => {
    const ok = validateBusinessDraft('Need', { ...base, budgetMin: '1', budgetMax: '2', currency: 'GBP' }, today)
    if (!ok.ok) throw new Error('invalid')
    expect(parseBusinessDetails('Need', ok.details)).toEqual(ok.details)
    expect(parseBusinessDetails('Insight', ok.details)).toBeUndefined()
    expect(parseBusinessDetails('Need', { ...ok.details, privateMemory: 'x' })).toBeUndefined()
    expect(parseBusinessDetails('Need', { ...ok.details, budgetMin: 9 })).toBeUndefined()
    expect(parseBusinessDetails('Offer', { category: 'Other', budgetMin: 1, currency: 'USD' })).toBeUndefined()
    expect(parseBusinessDetails('Proof of work', { category: 'Other' })).toBeUndefined()
    expect(parseBusinessDetails('Need', null)).toBeUndefined()
  })
})

describe('rendering facts and actions', () => {
  it('formats a budget range, a starting price and a one-sided range', () => {
    expect(businessFacts('Need', { category: 'Other', budgetMin: 5000, budgetMax: 10000, currency: 'USD', geography: 'EU' }).map(f => f.value))
      .toEqual(['Other', '$5,000 – $10,000', 'EU'])
    expect(businessFacts('Offer', { category: 'Other', startingPrice: 99, currency: 'EUR' })[1]).toEqual({ label: 'Starting at', value: '€99' })
    expect(businessFacts('Need', { category: 'Other', budgetMax: 10, currency: 'USD' })[1]?.value).toBe('Up to $10')
    expect(businessFacts('Need', undefined)).toEqual([])
  })
  it('offers the right action per type and none for ordinary posts', () => {
    expect(businessAction('Need')?.label).toBe('Respond to this Need')
    expect(businessAction('Offer')?.label).toBe('Request a quote')
    expect(businessAction('Proof of work')?.label).toBe('Contact author')
    expect(businessAction('Insight')).toBeNull()
  })
  it('lets you act only on another known member’s post', () => {
    expect(canAct({ memberId: 'u2' }, { id: 'u2' })).toBe(true)
    expect(canAct({ memberId: 'me' }, { id: 'me' })).toBe(false)
    expect(canAct({ memberId: 'u2' }, undefined)).toBe(false)
    expect(canAct({ memberId: 'u2' }, { id: 'u3' })).toBe(false)
  })
})

describe('feed filters', () => {
  it('filters by type and keeps ordinary lanes working', () => {
    const rows = [
      { type: 'post' as const, kind: 'Need' }, { type: 'post' as const, kind: 'Offer' }, { type: 'post' as const, kind: 'Proof of work' },
      { type: 'post' as const, kind: 'Insight' }, { type: 'post' as const, kind: 'Strategic ask' }, { type: 'ask' as const },
    ]
    const count = (lane: typeof FEED_LANES[number]) => rows.filter(r => matchesLane(lane, r)).length
    expect(count('ALL SIGNALS')).toBe(6)
    expect(count('NEEDS')).toBe(1); expect(count('OFFERS')).toBe(1); expect(count('PROOF OF WORK')).toBe(1)
    expect(count('INSIGHTS')).toBe(1); expect(count('ASKS')).toBe(2)
    expect(count('PARTNERSHIPS')).toBe(0)
  })
})
