import { describe, expect, it } from 'vitest'
import { isEligibleOpportunitySignal, reverseDiscovery, type GraphInputs } from '../opportunity-graph'
import { members, type NetworkAsk } from '../social'

const member = { ...members[0]!, needs: [] }
const sample: NetworkAsk = {
  id: 'ask-sample', memberId: member.id, ask: 'hydraulic optimization specialist',
  detail: '', whyNow: 'Our industrial project starts this month.',
  offer: '', industry: '', location: '', urgency: 'high', posted: 'Today',
  responses: 0, visibility: 'network', status: 'active',
}
const context = (asks: NetworkAsk[], profileNeeds: string[] = []): GraphInputs => ({
  me: { name: 'Sample member', offers: ['hydraulic optimization'], expertise: [], industries: [],
    location: '', openTo: [], whatIDo: '' },
  members: [{ ...member, needs: profileNeeds }],
  connections: [], threads: [], asks,
  crm: { people: [], activities: [], tasks: [], opportunities: [], personForMember: () => undefined },
  missions: [], feedback: [], strainedConnectors: [], verifiedIds: new Set(),
})

describe('Phase 2 opportunity signal trust boundary', () => {
  it('accepts active, public, unexpired member Signals', () => {
    const ask = { ...sample, expiresAt: new Date(Date.now() + 86400000).toISOString() }
    expect(isEligibleOpportunitySignal(ask)).toBe(true)
    const matches = reverseDiscovery(context([ask]))
    expect(matches).toHaveLength(1)
    expect(matches[0]?.askId).toBe('ask-sample')
    expect(matches[0]?.whyYouFit.some(x => x.label === 'Published active Signal')).toBe(true)
  })
  it('rejects private, mine, closed, paused, expired, and invalid expiry Signals', () => {
    const rejected: NetworkAsk[] = [
      { ...sample, visibility: 'private' },
      { ...sample, mine: true },
      { ...sample, status: 'closed' },
      { ...sample, status: 'paused' },
      { ...sample, expiresAt: new Date(Date.now() - 86400000).toISOString() },
      { ...sample, expiresAt: 'not-a-date' },
    ]
    for (const ask of rejected) {
      expect(isEligibleOpportunitySignal(ask)).toBe(false)
      expect(reverseDiscovery(context([ask]))).toEqual([])
    }
  })
  it('treats profile needs as self-stated rather than live verified opportunities', () => {
    const results = reverseDiscovery(context([], ['hydraulic optimization']))
    expect(results).toHaveLength(1)
    expect(results[0]?.askId).toBeUndefined()
    expect(results[0]?.whyYouFit.some(x => x.label === 'Profile-stated need')).toBe(true)
    expect(results[0]?.whyNow).toContain('not been verified')
  })
})
