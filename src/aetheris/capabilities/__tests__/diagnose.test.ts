import { describe, expect, it } from 'vitest'
import { enforceEvidenceRule, independentRefs } from '../evidence'
import { normalizeExposure } from '../finance'
import { rankCapabilities, suggestChips } from '../registry'
import { recognizeCapabilityIntent, recognizeCommand } from '../match'
import { evaluateProviders, publicDomainOf, type DiagnoseCtx } from '@/lib/capabilities/diagnose.server'
import type { FindingDraft, FindingRow } from '../types'

const base: FindingDraft = { key: 'k', kind: 'leak', claim: 'Deal is stalling', severity: 'high', confidence: 70, evidence: [], unknowns: [], provider: 'revenue', layer: 'fact', financial_classification: 'estimated_exposure', financial_low: 1, financial_high: 10, currency: 'USD' }

describe('evidence rule', () => {
  it('downgrades a leak with fewer than two independent refs to an unknown with no money', () => {
    const one = enforceEvidenceRule({ ...base, evidence: [{ kind: 'record', ref: 'crm_opportunities:1' }, { kind: 'record', ref: 'crm_opportunities:1', label: 'dup' }] })
    expect(one.kind).toBe('unknown')
    expect(one.claim.startsWith('Unknown worth checking')).toBe(true)
    expect(one.financial_high).toBeUndefined()
  })
  it('keeps a leak with two independent refs', () => {
    const two = enforceEvidenceRule({ ...base, evidence: [{ kind: 'record', ref: 'crm_opportunities:1' }, { kind: 'record', ref: 'crm_activities:2' }] })
    expect(two.kind).toBe('leak'); expect(two.financial_high).toBe(10)
  })
  it('strips money from any finding without evidence', () => {
    expect(enforceEvidenceRule({ ...base, kind: 'risk' }).financial_high).toBeUndefined()
    expect(independentRefs([])).toBe(0)
  })
})

const row = (id: string, high: number | null, group: string | null, currency = 'USD', status: FindingRow['status'] = 'open') =>
  ({ id, financial_low: 0, financial_high: high, currency, overlap_group: group, status, financial_classification: 'estimated_exposure' }) as FindingRow

describe('exposure normalization', () => {
  it('does not sum overlapping findings', () => {
    const e = normalizeExposure([row('a', 100, 'opp:1'), row('b', 80, 'opp:1'), row('c', 50, null)])
    expect(e.gross).toBe(230); expect(e.normalized).toBe(150); expect(e.overlap).toBe(80)
  })
  it('refuses mixed currencies and empty data', () => {
    expect(normalizeExposure([row('a', 1, null), row('b', 1, null, 'EUR')]).normalized).toBeNull()
    expect(normalizeExposure([]).normalized).toBeNull()
    expect(normalizeExposure([row('a', 5, null, 'USD', 'resolved')]).normalized).toBeNull()
  })
})

const now = new Date('2026-09-27T00:00:00Z').getTime()
const ctx = (over: Partial<DiagnoseCtx> = {}): DiagnoseCtx => ({
  subject: { type: 'company', id: 'c1' }, company: { id: 'c1', name: 'Acme', website: 'https://www.acme.com/about', domain: '' },
  opps: [{ id: 'o1', name: 'Acme renewal', status: 'open', archived: false, amount: 40000, currency: 'USD', probability: 50, stage_name: 'Proposal', next_action: 'Send terms', company_id: 'c1', person_id: 'p1', updated_at: '2026-07-01T00:00:00Z', expected_close: null }],
  people: [{ id: 'p1', full_name: 'Dana Lee', archived: false }], tasks: [], decisions: [], events: [],
  activities: [{ id: 'a1', opportunity_id: 'o1', company_id: 'c1', occurred_at: '2026-08-01T00:00:00Z', subject: 'Call' }],
  ...over,
})

describe('diagnose engine', () => {
  it('produces an evidenced leak with money only from the recorded opportunity', () => {
    const { findings, proposals } = evaluateProviders(ctx(), now)
    const leak = findings.find(f => f.kind === 'leak')!
    expect(leak.financial_high).toBe(40000); expect(leak.financial_low).toBe(20000)
    expect(independentRefs(leak.evidence)).toBeGreaterThanOrEqual(2)
    expect(leak.cause_chain!.some(s => s.hypothesis)).toBe(true)
    expect(proposals.some(p => p.impact === 'write')).toBe(true)
  })
  it('turns a stale deal with a single reference into an unknown and offers no actions for it', () => {
    const { findings, proposals } = evaluateProviders(ctx({ activities: [] }), now)
    expect(findings.some(f => f.kind === 'leak')).toBe(false)
    expect(findings.some(f => f.kind === 'unknown' && f.financial_high === undefined)).toBe(true)
    expect(proposals.filter(p => p.findingKey === 'stale-o1')).toHaveLength(0)
  })
  it('reports unsupported areas as not connected rather than inventing data', () => {
    const { reports } = evaluateProviders(ctx(), now)
    for (const id of ['asset', 'vendor', 'supply', 'compliance', 'access']) expect(reports.find(r => r.id === id)?.status).toBe('not_connected')
    expect(reports).toHaveLength(10)
  })
  it('uses only the public host as a domain', () => {
    expect(publicDomainOf({ website: 'https://www.acme.com/about' })).toBe('acme.com')
    expect(publicDomainOf({ website: 'private notes here' })).toBeNull()
  })
})

describe('routing', () => {
  it.each([
    ['Diagnose this company', 'company.diagnose'], ['Where are we losing money?', 'company.diagnose'],
    ['Why is revenue slipping?', 'company.trace_cause'], ['Show me the evidence', 'company.diagnose'],
    ['Trace the cause', 'company.trace_cause'], ['What happens if we do nothing?', 'company.model_impact'],
    ['What should I fix first?', 'company.diagnose'],
  ])('%s → %s', (q, id) => expect(recognizeCapabilityIntent(q)?.capabilityId).toBe(id))

  it.each([
    ['What changed?', 'changed'], ['What am I missing?', 'missing'], ['Who can I help?', 'help'], ['Where is my time going?', 'time'],
    ['Challenge this decision', 'redteam'], ['What am I forgetting?', 'forgetting'], ['Who can change this?', 'who'],
    ['Show pending approvals', 'approvals'], ['Which customers need attention?', 'customerRisk'], ['Show my capital map', 'capitalMap'],
    ['Run a scenario', 'scenario'], ['What can I delegate?', 'delegation'], ['Prepare me for Dana', 'prepare'],
    ['Show my decisions', 'decisions'], ['Revenue at risk', 'promises'], ['Board brief', 'brief'],
    ['Relationship coverage', 'coverage'], ['Close the meeting', 'close'], ['Network ROI', 'roi'],
  ])('existing phrase %s still routes to %s and not to a capability', (q, view) => {
    expect(recognizeCommand(q)?.view).toBe(view)
    expect(recognizeCapabilityIntent(q)).toBeNull()
  })
  it('keeps menus small', () => {
    expect(rankCapabilities('company').length).toBeLessThanOrEqual(4)
    expect(suggestChips('company').length).toBeLessThanOrEqual(2)
    expect(rankCapabilities('decision')[0]?.id).toBe('decision.challenge')
  })
})
