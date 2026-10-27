import { describe, expect, it } from 'vitest'
import { canBrowseExpertiseOffer } from '../domain/pro-engine'
import type { ExpertiseOffer } from '../domain/pro-models'

const offer = (over: Partial<ExpertiseOffer> = {}): ExpertiseOffer => ({
  id: 'ex-1',
  memberId: 'member-2',
  topic: 'Pricing review for a specific decision',
  offer: 'A bounded 30 minute conversation on pricing a first paid plan.',
  audience: 'Founders with a specific question',
  format: '30 minute call',
  availability: 'Two slots a week',
  durationMinutes: 30,
  constraints: 'No sales conversations.',
  terms: 'Free',
  proofNodeIds: [],
  industries: [],
  geography: 'Remote',
  visibility: 'network',
  expiresOn: '2026-12-31',
  requests: [],
  saved: false,
  createdAt: '2026-10-27',
  ...over,
})

describe('expertise offer browsing rule', () => {
  it('lets another member browse an offer its owner listed to the network', () => {
    expect(canBrowseExpertiseOffer(offer({ visibility: 'network' }))).toBe(true)
    expect(canBrowseExpertiseOffer(offer({ visibility: 'public' }))).toBe(true)
  })

  it('withholds an offer another member kept private or limited to connections', () => {
    expect(canBrowseExpertiseOffer(offer({ visibility: 'private' }))).toBe(false)
    expect(canBrowseExpertiseOffer(offer({ visibility: 'connections' }))).toBe(false)
  })

  it('always lets the owner browse their own offer, whatever its visibility', () => {
    expect(canBrowseExpertiseOffer(offer({ memberId: 'me', visibility: 'private' }))).toBe(true)
  })
})
