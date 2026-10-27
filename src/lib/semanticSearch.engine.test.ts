import { describe, expect, it } from 'vitest'
import { groundSemanticMatches, type SemanticCandidate } from './semanticSearch.engine'

const approved: SemanticCandidate[] = [{
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'B2B Founder',
  company: 'Freight Systems',
  location: 'Indianapolis',
  industries: ['Logistics'],
  expertise: ['Distribution'],
  can_help_with: 'Carrier partnerships',
  looking_for: 'Regional distributors',
}]
describe('Semantic Network Search evidence boundary', () => {
  it('only returns actual directory IDs and literal allowed evidence', () => {
    const matches = groundSemanticMatches({ matches: [
      { id: 'synthetic', fields: ['title'] },
      { id: approved[0]!.id, fields: ['expertise', 'looking_for'], reason: 'Raised a Series A' },
      { id: approved[0]!.id, fields: ['title'] },
    ] }, approved)
    expect(matches).toHaveLength(1)
    expect(matches[0]!.insight).toContain('Distribution')
    expect(matches[0]!.insight).toContain('Regional distributors')
    expect(matches[0]!.insight).not.toContain('Series A')
  })
  it('drops unknown fields, unsupported matches and fabricated labels', () => {
    expect(groundSemanticMatches({ matches: [{ id: approved[0]!.id, fields: ['funding', 'mutual_connection'] }] }, approved)).toEqual([])
    expect(groundSemanticMatches({ matches: [{ id: approved[0]!.id, fields: ['location'] }] }, [])).toEqual([])
  })
  it('limits output to real, unique member IDs even when the model repeats them', () => {
    const rows = Array.from({ length: 30 }, (_, n) => ({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-' + String(n).padStart(12, '0'),
      title: 'Operator', company: '', location: '', industries: [], expertise: [], can_help_with: '', looking_for: '',
    }))
    const results = groundSemanticMatches({ matches: rows.map(m => ({ id: m.id, fields: ['title'] })) }, rows)
    expect(results).toHaveLength(12)
    expect(new Set(results.map(m => m.id)).size).toBe(12)
  })
})
