import { describe, expect, it } from 'vitest'
import { areaFor, draftAsk, routeFinding } from '../route'
import type { Member } from '../../social'

const member = (id: string, p: Partial<Member>): Member => ({
  id, name: id, initials: id.slice(0, 2), title: '', company: '', location: '', tags: [], needs: [], offers: [], expertise: [],
  focus: '', thesis: '', availability: '', mutuals: [], introState: 'recommended', joined: '2026', role: 'Operator', industry: '',
  lastInteractionDays: 0, relationshipStatus: 'new', score: {} as Member['score'], scoreTotal: 0, radar: 'quiet' as Member['radar'],
  whyThem: '', whyYou: '', whyNow: '', bestPath: [], nextAction: '', dontDo: '', confidence: 0, ...p,
})

const members = [
  member('cro', { title: 'Chief Revenue Officer', expertise: ['Sales pipeline', 'Revenue operations'] }),
  member('cfo', { title: 'CFO', expertise: ['Treasury', 'Capital allocation'] }),
  member('blank', {}),
  member('me', { expertise: ['Sales', 'Pipeline'] }),
]

describe('routeFinding', () => {
  it('ranks members by experience stated on their own profiles, with quoted reasons', () => {
    const r = routeFinding({ provider: 'revenue' }, members, { excludeIds: ['me'] })
    expect(r[0]!.member.id).toBe('cro')
    expect(r[0]!.reasons.some(x => x.startsWith('States expertise'))).toBe(true)
    expect(r.map(x => x.member.id)).not.toContain('me')
  })
  it('never invents a fit for members with no matching stated experience', () => {
    const r = routeFinding({ provider: 'revenue' }, members, { excludeIds: ['me'] })
    expect(r.map(x => x.member.id)).not.toContain('blank')
    expect(r.map(x => x.member.id)).not.toContain('cfo')
  })
  it('falls back to a general operating area for unknown providers', () => {
    expect(areaFor({ provider: 'web' as never }).id).toBe('general')
  })
})

describe('draftAsk', () => {
  it('is de-identified: built only from the area, never from the finding claim or money', () => {
    const finding = { provider: 'revenue', claim: 'Acme Corp lost $480,000 on stalled deals', financial_high: 480000 } as const
    const { statement } = draftAsk(finding, { industry: 'Manufacturing' })
    expect(statement).not.toMatch(/Acme|480|\$/)
    expect(statement).toContain('Manufacturing')
  })
})
