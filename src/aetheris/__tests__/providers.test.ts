import { describe, expect, it } from 'vitest'

import {
  dollarsToCents, endorsedBy, filterProviders, nominationError, normalizeWebsite, parseRegions, requestError,
  type DirectoryProvider,
} from '../providers'

const provider = (over: Partial<DirectoryProvider>): DirectoryProvider => ({
  id: 'p', name: 'Leak Fixers', category: 'ai_automation', description: 'Finds where time and revenue leak.', website: null, regions: ['US'],
  client_size: 'any', status: 'approved', contact_user_id: null, contact_name: null, mine_contact: false, endorsement_count: 0, endorsements: [], ...over,
})

describe('providers helpers', () => {
  it('parses dollar amounts into cents', () => {
    expect(dollarsToCents('48,000')).toBe(4_800_000)
    expect(dollarsToCents('$48k')).toBe(4_800_000)
    expect(dollarsToCents('1.5m')).toBe(150_000_000)
    expect(dollarsToCents('')).toBeNull()
    expect(dollarsToCents('lots')).toBeNull()
  })

  it('normalizes websites and rejects junk', () => {
    expect(normalizeWebsite('leakfixers.com')).toBe('https://leakfixers.com')
    expect(normalizeWebsite('http://a.io/x')).toBe('http://a.io/x')
    expect(normalizeWebsite('')).toBe('')
    expect(normalizeWebsite('not a site')).toBeNull()
    expect(normalizeWebsite('localhost')).toBeNull()
  })

  it('splits and de-dupes regions', () => {
    expect(parseRegions('US, UK , us,,Texas')).toEqual(['US', 'UK', 'Texas'])
    expect(parseRegions(Array.from({ length: 20 }, (_, i) => `R${i}`).join(','))).toHaveLength(12)
  })

  it('validates nominations and requests', () => {
    expect(nominationError({ name: 'A', category: 'legal', description: 'x'.repeat(30), website: '', regions: '', clientSize: 'any' })).toMatch(/name/)
    expect(nominationError({ name: 'Firm', category: 'astrology', description: 'x'.repeat(30), website: '', regions: '', clientSize: 'any' })).toMatch(/category/)
    expect(nominationError({ name: 'Firm', category: 'legal', description: 'short', website: '', regions: '', clientSize: 'any' })).toMatch(/Describe/)
    expect(nominationError({ name: 'Firm', category: 'legal', description: 'x'.repeat(30), website: 'bad site', regions: '', clientSize: 'any' })).toMatch(/website/)
    expect(nominationError({ name: 'Firm', category: 'legal', description: 'x'.repeat(30), website: 'firm.com', regions: 'US', clientSize: 'any' })).toBeNull()
    expect(requestError({ category: 'legal', need: 'too short', budget: '', urgency: 'this_week' })).toMatch(/need/)
    expect(requestError({ category: 'legal', need: 'A shareholder agreement for three founders.', budget: 'huge', urgency: 'this_week' })).toMatch(/budget/)
    expect(requestError({ category: 'legal', need: 'A shareholder agreement for three founders.', budget: '', urgency: 'this_week' })).toBeNull()
  })

  it('filters by category and text, including endorser names', () => {
    const list = [
      provider({ id: '1' }),
      provider({ id: '2', name: 'Second Law', category: 'legal', endorsements: [{ id: 'e', user_id: 'u', note: 'n', updated_at: '', mine: false, name: 'Ana Avery', company: '' }] }),
    ]
    expect(filterProviders(list, 'legal', '').map(p => p.id)).toEqual(['2'])
    expect(filterProviders(list, '', 'avery').map(p => p.id)).toEqual(['2'])
    expect(filterProviders(list, '', 'automation').map(p => p.id)).toEqual(['1'])
  })

  it('summarises endorsers', () => {
    expect(endorsedBy([])).toBe('No endorsements yet')
    expect(endorsedBy(['Ana'])).toBe('Endorsed by Ana')
    expect(endorsedBy(['Ana', 'Bea'])).toBe('Endorsed by Ana and Bea')
    expect(endorsedBy(['Ana', 'Bea', 'Cal', 'Dee'])).toBe('Endorsed by Ana, Bea and 2 others')
  })
})
