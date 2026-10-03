import { describe, expect, it } from 'vitest'
import { buildLookupQuery, contextualLabel, diffFields, isStale, linkedinHandle, parseCandidateBlock, rankCandidates, withinLookupWindow, CandidateListSchema } from '../enrichment'
import { recognizeCapabilityIntent, recognizeCommand } from '../match'

const person = { fullName: 'Mara Solis', companyName: 'Northwind', title: 'COO', location: 'Lisbon', linkedinUrl: '' }

describe('professional enrichment', () => {
  it('strips unknown fields and caps at 10', () => {
    const { candidates } = parseCandidateBlock(JSON.stringify([{ name: 'Mara Solis', headline: 'COO', url: 'https://linkedin.com/in/mara', photo: 'x', email: 'e' }]))
    expect(candidates[0]).toEqual({ full_name: 'Mara Solis', title: 'COO', profile_url: 'https://linkedin.com/in/mara' })
    expect(() => CandidateListSchema.parse(Array.from({ length: 11 }, () => ({ full_name: 'x' })))).toThrow()
  })
  it('rejects invalid JSON with a readable message', () => { expect(() => parseCandidateBlock('nope')).toThrow(/not valid JSON/) })
  it('builds a lookup query from name/company/title/location only', () => {
    const q = buildLookupQuery({ ...person, email: 'x@y', notes: 'secret' } as never)
    expect(Object.keys(q).sort()).toEqual(['company', 'first_name', 'full_name', 'last_name', 'location', 'title'])
  })
  it('preselects only one strong match', () => {
    const a = { full_name: 'Mara Solis', company: 'Northwind', title: 'COO' }
    const b = { full_name: 'Mara Solis', company: 'Other' }
    expect(rankCandidates([b, a], person).preselect).toBe(0)
    expect(rankCandidates([a, { ...a }], person).preselect).toBe(-1)
  })
  it('handle match is strongest', () => {
    const r = rankCandidates([{ full_name: 'M. Solis', profile_url: 'https://www.linkedin.com/in/Mara-S' }], { ...person, linkedinUrl: 'linkedin.com/in/mara-s' })
    expect(r.scored[0]!.strong).toBe(true)
  })
  it('diffs fields as fill or conflict', () => {
    const d = diffFields({ title: 'COO', companyName: '', location: 'Lisbon' }, { title: 'CEO', company: 'Northwind', location: 'lisbon' })
    expect(d.map(x => [x.field, x.kind])).toEqual([['title', 'conflict'], ['company_name', 'fill']])
  })
  it('stale after 90 days, lookup window 24h', () => {
    const now = Date.parse('2026-06-01T00:00:00Z')
    expect(isStale('2026-02-01T00:00:00Z', now)).toBe(true)
    expect(isStale('2026-05-01T00:00:00Z', now)).toBe(false)
    expect(withinLookupWindow('2026-05-31T12:00:00Z', now)).toBe(true)
    expect(withinLookupWindow('2026-05-30T00:00:00Z', now)).toBe(false)
  })
  it('contextual labels', () => {
    expect(contextualLabel({ confirmed: false })).toBe('Find on LinkedIn')
    expect(contextualLabel({ confirmed: true, lastCheckedAt: '2000-01-01' })).toBe('Refresh professional info')
    expect(contextualLabel({ confirmed: true, lastCheckedAt: new Date().toISOString(), differs: true })).toBe('Verify role/company')
  })
  it('linkedin handle parsing', () => { expect(linkedinHandle('https://www.linkedin.com/in/Ab-c/')).toBe('ab-c'); expect(linkedinHandle('x')).toBeNull() })
  it('routes phrases to the capability without breaking others', () => {
    for (const p of ['find this person on LinkedIn', 'verify her title', 'is he still at this company?', 'refresh professional info'])
      expect(recognizeCapabilityIntent(p)?.capabilityId).toBe('enrich.person.professional')
    expect(recognizeCapabilityIntent('Where are we losing money?')?.capabilityId).toBe('company.diagnose')
    expect(recognizeCommand('who should I meet')?.capabilityId ?? null).not.toBe('enrich.person.professional')
  })
})
