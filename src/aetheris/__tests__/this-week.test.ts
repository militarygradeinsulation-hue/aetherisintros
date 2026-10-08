import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { askMatch, buildWeek, helpVocabulary, type WeekInputs } from '../this-week'

const empty: WeekInputs = { pendingRequests: [], dueCheckins: 0, helpableAsks: [], quietAsks: [], companyRisk: [] }

describe('buildWeek', () => {
  it('is empty when nothing is waiting — never padded', () => {
    expect(buildWeek(empty)).toEqual([])
    expect(buildWeek({ ...empty, companyRisk: [{ orgName: 'Acme', atRisk: 0, singleOwner: 0 }] })).toEqual([])
  })
  it('puts people waiting on you first, then follow-ups, help, stalled asks and company risk', () => {
    const items = buildWeek({
      pendingRequests: [{ id: 'r1', requesterName: 'Dana', reason: 'Renewal at Northwind', createdAt: '' }],
      dueCheckins: 2,
      helpableAsks: [{ id: 'a1', ask: 'Need a fractional CFO for a PE-backed plant', authorName: 'Sam', matched: ['cfo', 'finance'] }],
      quietAsks: [{ id: 'q1', ask: 'Looking for a COO', daysOld: 9 }],
      companyRisk: [{ orgName: 'Acme', atRisk: 1, singleOwner: 3 }],
    })
    expect(items.map(i => i.kind)).toEqual(['respond', 'checkin', 'help', 'quiet_ask', 'company_risk'])
    expect(items[0]).toMatchObject({ title: 'Dana is waiting on your answer', target: 'intros' })
    expect(items[1]!.title).toBe('2 introductions to follow up')
    expect(items[4]!.title).toBe('Acme: 1 relationship no one here holds now')
  })
  it('collapses a backlog of requests and respects the limit', () => {
    const pendingRequests = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, requesterName: `P${i}`, reason: '', createdAt: '' }))
    const items = buildWeek({ ...empty, pendingRequests, dueCheckins: 1 }, 4)
    expect(items.map(i => i.key)).toEqual(['respond-r0', 'respond-r1', 'respond-r2', 'respond-more'])
  })
})

describe('askMatch', () => {
  it('needs at least two shared words from what the member says they help with', () => {
    const vocab = helpVocabulary({ can_help_with: 'CFO search, PE-backed finance', expertise: ['Manufacturing'] })
    expect(askMatch('Looking for a CFO with PE-backed manufacturing experience', vocab)).toEqual(['cfo', 'backed', 'manufacturing'])
    expect(askMatch('Need a CFO', vocab)).toEqual([])
  })
})
