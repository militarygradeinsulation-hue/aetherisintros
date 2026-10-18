/**
 * Evidence-aware opportunity readiness.
 * No inferred consent, invented outcomes, or automatic outreach.
 * Deterministic advisory layer for existing matching / opportunity graph.
 */
export type EvidenceKind = 'verified' | 'self_reported' | 'inferred'
export type OpportunityEvidence = {
  id: string
  label: string
  kind: EvidenceKind
  observedAt: string | null
  sourceId: string | null
}
export type ReadinessBlocker = 'missing_evidence' | 'stale_evidence' | 'no_consent' | 'no_mutual_value'
export type ReadinessResult = {
  ready: boolean
  blockers: ReadinessBlocker[]
  nextAction: string
  verifiedEvidence: number
  staleEvidence: number
}
const DAYS_90 = 90 * 24 * 60 * 60 * 1000

/**
 * A ready recommendation requires a recent verified source, reciprocal value
 * and explicit contact permission. Otherwise suggest a safe manual action.
 */
export function opportunityReadiness(
  evidence: readonly OpportunityEvidence[],
  options: { contactConsent: boolean; reciprocalValue: boolean; now?: number },
): ReadinessResult {
  const now = options.now ?? Date.now()
  const verified = evidence.filter(e => e.kind === 'verified' && Boolean(e.sourceId?.trim()))
  const fresh = verified.filter(e => {
    const time = e.observedAt ? Date.parse(e.observedAt) : NaN
    return Number.isFinite(time) && time <= now && now - time <= DAYS_90
  })
  const blockers: ReadinessBlocker[] = []
  if (!fresh.length) blockers.push('missing_evidence')
  if (verified.length > fresh.length) blockers.push('stale_evidence')
  if (!options.contactConsent) blockers.push('no_consent')
  if (!options.reciprocalValue) blockers.push('no_mutual_value')
  const nextAction = !fresh.length ? 'Verify the opportunity with a recent source.'
    : !options.contactConsent ? 'Ask permission before requesting an introduction.'
      : !options.reciprocalValue ? 'Document what both members stand to gain.'
        : 'Review the evidence and request an introduction.'
  return { ready: blockers.length === 0, blockers, nextAction, verifiedEvidence: fresh.length, staleEvidence: verified.length - fresh.length }
}
