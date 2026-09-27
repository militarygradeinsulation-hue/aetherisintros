import type { EvidenceRef, FindingDraft } from './types'

/** Distinct evidence references (kind + ref). Two labels on the same record count once. */
export function independentRefs(evidence: readonly EvidenceRef[]): number {
  return new Set(evidence.filter(e => e.ref).map(e => `${e.kind}:${e.ref}`)).size
}

/**
 * The evidence rule, applied before anything is stored (the database enforces it again):
 * a revenue leak needs two independent references; otherwise it becomes an
 * "Unknown worth checking" with no money attached. Money always needs evidence.
 */
export function enforceEvidenceRule(f: FindingDraft): FindingDraft {
  const refs = independentRefs(f.evidence)
  if (f.kind === 'leak' && refs < 2) {
    const { financial_classification: _c, financial_low: _l, financial_high: _h, currency: _cur, ...rest } = f
    return { ...rest, kind: 'unknown', claim: `Unknown worth checking: ${f.claim.replace(/^[A-Z]/, c => c.toLowerCase())}`, severity: 'low', confidence: Math.min(f.confidence, 35) }
  }
  if ((f.financial_low != null || f.financial_high != null) && refs < 1) {
    const { financial_classification: _c, financial_low: _l, financial_high: _h, currency: _cur, ...rest } = f
    return rest
  }
  return f
}
