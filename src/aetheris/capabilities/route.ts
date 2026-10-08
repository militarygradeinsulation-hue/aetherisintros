/**
 * Diagnose → Route. A finding names a weak spot; the network may hold someone who has
 * already fixed it. This module maps a finding to a de-identified problem area, ranks
 * members by what they state on their own profiles, and drafts an ask the owner edits
 * and posts. The finding's claim, evidence, money and subject never leave this device:
 * only the generic area text is ever proposed for sharing, and nothing is posted
 * without an explicit click. Routing reads existing findings only — it never starts a
 * diagnosis or any paid scan.
 */
import { tokens } from '../opportunity-graph'
import type { Member } from '../social'
import type { FindingRow, ProviderId } from './types'

export interface ProblemArea {
  id: string
  label: string
  /** Who would credibly have solved it. Generic: safe to share. */
  seeking: string
  /** Profile vocabulary that signals that experience. */
  vocabulary: string[]
}

export const PROBLEM_AREAS: Record<ProviderId, ProblemArea> = {
  revenue: { id: 'revenue', label: 'Revenue and pipeline', seeking: 'an operator who has fixed a stalling sales pipeline and slow deal follow-up', vocabulary: ['sales', 'revenue', 'pipeline', 'growth', 'cro', 'commercial', 'go-to-market', 'gtm', 'deals', 'conversion', 'follow-up', 'leads', 'marketing', 'demand'] },
  customer: { id: 'customer', label: 'Customer retention', seeking: 'a leader who has reduced customer churn and rebuilt account management', vocabulary: ['customer', 'retention', 'churn', 'success', 'account', 'experience', 'service', 'loyalty', 'renewals', 'support'] },
  asset: { id: 'asset', label: 'Assets and capital use', seeking: 'an operator who has improved asset utilisation and capital efficiency', vocabulary: ['assets', 'capital', 'finance', 'cfo', 'utilisation', 'utilization', 'equipment', 'fleet', 'real', 'estate', 'treasury'] },
  vendor: { id: 'vendor', label: 'Vendor spend', seeking: 'someone who has renegotiated vendor contracts and cut operating spend', vocabulary: ['procurement', 'vendor', 'sourcing', 'purchasing', 'contracts', 'cost', 'spend', 'negotiation', 'operations'] },
  supply: { id: 'supply', label: 'Supply chain', seeking: 'an operator who has stabilised a supply chain and reduced fulfilment delays', vocabulary: ['supply', 'chain', 'logistics', 'manufacturing', 'operations', 'coo', 'fulfilment', 'fulfillment', 'inventory', 'distribution', 'plant'] },
  compliance: { id: 'compliance', label: 'Compliance and risk', seeking: 'someone who has closed compliance gaps without slowing the business', vocabulary: ['compliance', 'risk', 'legal', 'regulatory', 'audit', 'governance', 'security', 'privacy', 'counsel'] },
  access: { id: 'access', label: 'Systems and access', seeking: 'a technology leader who has cleaned up systems access and internal tooling', vocabulary: ['technology', 'cto', 'cio', 'systems', 'security', 'it', 'infrastructure', 'automation', 'software', 'data'] },
  strategic: { id: 'strategic', label: 'Strategy and positioning', seeking: 'an executive who has repositioned a company through a strategic shift', vocabulary: ['strategy', 'positioning', 'ceo', 'founder', 'board', 'transformation', 'growth', 'market', 'brand', 'expansion'] },
  decision: { id: 'decision', label: 'Decision velocity', seeking: 'a leader who has sped up executive decision-making and accountability', vocabulary: ['operations', 'coo', 'chief', 'staff', 'execution', 'management', 'leadership', 'okrs', 'cadence', 'ceo'] },
  workforce: { id: 'workforce', label: 'Team and hiring', seeking: 'a people leader who has fixed hiring gaps and key-person risk', vocabulary: ['talent', 'hiring', 'recruiting', 'people', 'hr', 'chro', 'workforce', 'culture', 'leadership', 'team'] },
}

const FALLBACK: ProblemArea = { id: 'general', label: 'Operating improvement', seeking: 'an operator who has solved a similar operating problem', vocabulary: ['operations', 'operator', 'coo', 'ceo', 'turnaround', 'transformation', 'growth'] }

export function areaFor(finding: Pick<FindingRow, 'provider'>): ProblemArea {
  return PROBLEM_AREAS[finding.provider as ProviderId] ?? FALLBACK
}

export interface RoutedMember {
  member: Member
  score: number
  /** Each reason quotes the member's own stated profile — FACT, not inference. */
  reasons: string[]
}

const profileFields = (m: Member): Array<[string, string]> => [
  ['expertise', m.expertise.join(', ')],
  ['offers', m.offers.join(', ')],
  ['role', `${m.title} ${m.whatIDo ?? ''}`],
  ['focus', m.focus],
  ['open to', (m.openTo ?? []).join(', ')],
]

/** Rank members whose own stated experience matches the problem area. Never invents a fit. */
export function routeFinding(finding: Pick<FindingRow, 'provider'>, members: Member[], opts: { excludeIds?: string[]; limit?: number } = {}): RoutedMember[] {
  const area = areaFor(finding)
  const vocab = new Set(area.vocabulary)
  const exclude = new Set(opts.excludeIds ?? [])
  const out: RoutedMember[] = []
  for (const member of members) {
    if (exclude.has(member.id)) continue
    let score = 0
    const reasons: string[] = []
    for (const [field, text] of profileFields(member)) {
      const hits = tokens(text).filter(t => vocab.has(t))
      if (!hits.length) continue
      score += field === 'expertise' || field === 'offers' ? hits.length * 2 : hits.length
      reasons.push(`States ${field}: ${hits.slice(0, 3).join(', ')}`)
    }
    if ((member.openTo ?? []).some(o => /advis|operator|board|mentor|consult/i.test(o))) score += 1
    if (score > 0) out.push({ member, score, reasons })
  }
  return out.sort((a, b) => b.score - a.score || a.member.name.localeCompare(b.member.name)).slice(0, opts.limit ?? 3)
}

/** A de-identified ask the owner edits before posting. Contains no claim, evidence, amount or company. */
export function draftAsk(finding: Pick<FindingRow, 'provider'>, context: { industry?: string | undefined } = {}) {
  const area = areaFor(finding)
  const where = context.industry ? ` in ${context.industry}` : ''
  return {
    statement: `Looking for ${area.seeking}${where}. Happy to share specifics privately once we connect.`,
    category: 'LOOKING FOR' as const,
    area: area.label,
  }
}
