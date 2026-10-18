import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { isActiveSharedSignal, isEligibleOpportunitySignal } from '../opportunity-graph'
import type { NetworkAsk } from '../social'

const sample: NetworkAsk = {
  id: 'ask-sample', memberId: 'me', ask: 'Looking for an operator', detail: '',
  whyNow: '', offer: '', industry: '', location: '', urgency: 'high',
  posted: 'Today', responses: 0, visibility: 'network', status: 'active',
}

describe('live feed Signal freshness and privacy', () => {
  it('shows an active public self-authored Signal in the feed but never recommends it to yourself', () => {
    expect(isActiveSharedSignal({ ...sample, mine: true })).toBe(true)
    expect(isEligibleOpportunitySignal({ ...sample, mine: true })).toBe(false)
  })
  it('excludes private, closed, paused, expired and malformed-expiry Signals', () => {
    const excluded = [
      { ...sample, visibility: 'private' as const },
      { ...sample, status: 'closed' },
      { ...sample, status: 'paused' },
      { ...sample, expiresAt: new Date(Date.now() - 60_000).toISOString() },
      { ...sample, expiresAt: 'not-an-iso-date' },
    ]
    excluded.forEach(ask => expect(isActiveSharedSignal(ask)).toBe(false))
  })
  it('uses the shared canonical eligibility rule for the real live directory', () => {
    const source = readFileSync(new URL('../live.ts', import.meta.url), 'utf8')
    expect(source).toContain('filter(ask => isActiveSharedSignal(ask))')
  })
})
