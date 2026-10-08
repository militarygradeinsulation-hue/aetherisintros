import { describe, expect, it, vi } from 'vitest'

vi.mock('@lovable.dev/mcp-js', () => ({ defineTool: (t: unknown) => t }))
vi.mock('../../supabase', () => ({ supabaseForUser: () => ({}) }))

import { filterByIndustry } from '../search-members'

describe('filterByIndustry', () => {
  const rows = [
    { id: 'a', industries: ['fintech'] },
    { id: 'b', industries: ['Financial Technology', 'Banking'] },
    { id: 'c', industries: null },
  ]
  it('matches regardless of case', () => {
    expect(filterByIndustry(rows, 'Fintech').map(r => r.id)).toEqual(['a'])
  })
  it('matches partial names', () => {
    expect(filterByIndustry(rows, 'financial').map(r => r.id)).toEqual(['b'])
  })
  it('skips members with no industries', () => {
    expect(filterByIndustry(rows, 'bank').map(r => r.id)).toEqual(['b'])
  })
})
