import { describe, expect, it } from 'vitest'
import { opportunityReadiness, type OpportunityEvidence } from '../opportunity-readiness'

const now = Date.parse('2026-10-18T12:00:00Z')
const verified: OpportunityEvidence = { id: '1', label: 'Confirmed opportunity', kind: 'verified', observedAt: '2026-10-17T12:00:00Z', sourceId: 'source-1' }

describe('opportunity readiness', () => {
  it('requires fresh sourced evidence, consent and reciprocal value', () => {
    expect(opportunityReadiness([verified], { contactConsent: true, reciprocalValue: true, now }).ready).toBe(true)
    expect(opportunityReadiness([verified], { contactConsent: false, reciprocalValue: true, now }).blockers).toContain('no_consent')
    expect(opportunityReadiness([verified], { contactConsent: true, reciprocalValue: false, now }).blockers).toContain('no_mutual_value')
  })
  it('does not treat self-reported or unsourced information as verified', () => {
    expect(opportunityReadiness([{ ...verified, kind: 'self_reported' }], { contactConsent: true, reciprocalValue: true, now }).ready).toBe(false)
    expect(opportunityReadiness([{ ...verified, sourceId: null }], { contactConsent: true, reciprocalValue: true, now }).ready).toBe(false)
  })
  it('rejects stale and future dated evidence', () => {
    const stale = opportunityReadiness([{ ...verified, observedAt: '2025-01-01T00:00:00Z' }], { contactConsent: true, reciprocalValue: true, now })
    expect(stale.blockers).toContain('stale_evidence')
    expect(opportunityReadiness([{ ...verified, observedAt: '2027-01-01T00:00:00Z' }], { contactConsent: true, reciprocalValue: true, now }).ready).toBe(false)
  })
})
