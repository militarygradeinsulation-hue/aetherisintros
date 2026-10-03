import type { CostTier, EntityType, Verb } from './types'

/** Member-facing capability descriptors. Outcome language only. */
export interface CapabilityDescriptor {
  id: string
  verb: Verb
  label: string
  outcome: string
  appliesTo: EntityType[]
  costTier: CostTier
  web: boolean
}

export const CAPABILITIES: CapabilityDescriptor[] = [
  { id: 'company.diagnose', verb: 'diagnose', label: 'Diagnose', outcome: 'Where value is leaking, and what to fix first', appliesTo: ['company', 'opportunity', 'person'], costTier: 'light', web: true },
  { id: 'company.trace_cause', verb: 'analyze', label: 'Trace cause', outcome: 'Why it is happening, step by step', appliesTo: ['company', 'opportunity'], costTier: 'light', web: false },
  { id: 'company.model_impact', verb: 'analyze', label: 'Model impact', outcome: 'What happens if nothing changes', appliesTo: ['company', 'opportunity'], costTier: 'light', web: false },
  { id: 'company.find_opportunity', verb: 'find', label: 'Find opportunity', outcome: 'Openings your records already support', appliesTo: ['company', 'person'], costTier: 'light', web: false },
  { id: 'decision.challenge', verb: 'challenge', label: 'Check assumptions', outcome: 'Which assumptions are overdue for review', appliesTo: ['decision'], costTier: 'light', web: false },
  { id: 'enrich.person.professional', verb: 'find', label: 'Verify professional info', outcome: 'Check title, company and location against LinkedIn', appliesTo: ['person'], costTier: 'light', web: false },
  { id: 'company.prepare_action', verb: 'prepare', label: 'Prepare action', outcome: 'Draft the next move for your approval', appliesTo: ['company', 'opportunity', 'person', 'decision'], costTier: 'light', web: false },
]

export const describe = (id: string) => CAPABILITIES.find(c => c.id === id)

export interface RankSignals { openFindings?: number; openOpportunities?: number; hasDomain?: boolean; stale?: boolean }

/** Relevance ranker: at most four verbs for a subject, strongest first. */
export function rankCapabilities(type: EntityType, s: RankSignals = {}, max = 4): CapabilityDescriptor[] {
  const score = (c: CapabilityDescriptor) => {
    let v = 10
    if (c.id === 'company.diagnose') v += 30
    if (c.id === 'company.trace_cause') v += (s.openFindings ?? 0) > 0 ? 25 : 2
    if (c.id === 'company.model_impact') v += (s.openOpportunities ?? 0) > 0 ? 18 : 0
    if (c.id === 'company.find_opportunity') v += type === 'person' ? 16 : 6
    if (c.id === 'company.prepare_action') v += (s.openFindings ?? 0) > 0 ? 14 : 1
    if (c.id === 'decision.challenge') v += 40
    if (c.id === 'enrich.person.professional') v += s.stale ? 35 : 12
    return v
  }
  return CAPABILITIES.filter(c => c.appliesTo.includes(type)).sort((a, b) => score(b) - score(a)).slice(0, Math.min(max, 4))
}

/** At most two suggestion chips. */
export const suggestChips = (type: EntityType, s: RankSignals = {}) => rankCapabilities(type, s, 2)
