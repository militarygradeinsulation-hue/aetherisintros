/** Capability layer contracts. Browser-safe: types and constants only. */

export const VERBS = ['diagnose', 'prepare', 'challenge', 'find', 'fix', 'draft', 'create', 'analyze', 'build', 'test'] as const
export type Verb = typeof VERBS[number]

export const ENTITY_TYPES = [
  'person', 'company', 'opportunity', 'task', 'note', 'activity', 'decision', 'mission', 'meeting',
  'intro_request', 'negotiation', 'scenario', 'signal', 'ask', 'member', 'self',
] as const
export type EntityType = typeof ENTITY_TYPES[number]
export interface EntityRef { type: EntityType; id: string }

export const SCOPES = ['entity:read', 'links:read', 'events:read', 'web:read', 'record:propose'] as const
export type Scope = typeof SCOPES[number]

export type Impact = 'read' | 'draft' | 'write' | 'external'
export type CostTier = 'light' | 'medium' | 'heavy'
export type Engine = 'deterministic' | 'ai' | 'hybrid'
export type Layer = 'fact' | 'recommendation' | 'style'

export const RUN_STATUSES = [
  'requested', 'context_built', 'running', 'needs_input', 'result_ready', 'proposals_ready',
  'needs_approval', 'applied', 'closed', 'cancelled', 'failed', 'partial', 'unavailable',
] as const
export type RunStatus = typeof RUN_STATUSES[number]

export interface Budget { maxRecords: number; maxWebCalls: number }

export interface ContextEnvelope {
  requestId: string
  ownerId: string
  actorId: string
  actor: 'member' | 'delegate'
  subject: EntityRef
  granted: Scope[]
  budget: Budget
  data: {
    entity?: Record<string, unknown> | null
    links?: { type: string; id: string; relation: string }[]
    events?: { event: string; summary: string; at: string }[]
  }
}

export interface EvidenceRef { kind: 'record' | 'event' | 'url'; ref: string; label?: string }

export interface ResultItem { layer: Layer; text: string; evidence?: EvidenceRef[] }

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export interface ResultEnvelope<O extends Json = Json> {
  status: 'ok' | 'partial' | 'unavailable' | 'needs_approval' | 'failed'
  engine: Engine
  output: O
  items: ResultItem[]
  provenance: { inputs: EntityRef[]; sources: string[]; model?: string }
  unavailableReason?: string
}

export interface RunSummary {
  id: string
  capabilityId: string
  verb: Verb
  subject: EntityRef
  status: RunStatus
  progress: number
  stepLabel: string
  engine: Engine | null
  costTier: CostTier
  actorKind: 'member' | 'delegate'
  result: ResultEnvelope | null
  errorMessage: string | null
  createdAt: string
}

/* ───────────── Diagnose / findings model ───────────── */

export const FINANCIAL_CLASSES = ['verified_loss', 'attributed_loss', 'estimated_exposure', 'opportunity_value', 'risk_exposure'] as const
export type FinancialClass = typeof FINANCIAL_CLASSES[number]
export type FindingKind = 'risk' | 'gap' | 'leak' | 'pattern' | 'competitive' | 'unknown' | 'opportunity'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export const PROVIDER_IDS = ['revenue', 'customer', 'asset', 'vendor', 'supply', 'compliance', 'access', 'strategic', 'decision', 'workforce'] as const
export type ProviderId = typeof PROVIDER_IDS[number]

export interface CauseStep { step: string; detail: string; evidence: EvidenceRef[]; hypothesis: boolean }
export interface Metric { metric: string; value: number | null; unit?: string }

export interface FindingDraft {
  kind: FindingKind
  claim: string
  severity: Severity
  confidence: number
  evidence: EvidenceRef[]
  unknowns: string[]
  provider: ProviderId | 'web'
  layer: 'fact' | 'recommendation'
  financial_classification?: FinancialClass
  financial_low?: number
  financial_high?: number
  currency?: string
  root_cause?: string
  cause_chain?: CauseStep[]
  overlap_group?: string
  baseline_metric?: Metric
  target_metric?: Metric
  /** Client-side key to attach proposals to this finding before it has an id. */
  key: string
}

export interface ProposalDraft {
  findingKey: string
  impact: Impact
  summary: string
  target: EntityRef
  action: { kind: 'draft_note'; text: string } | { kind: 'create_task'; title: string; detail: string; dueInDays: number; opportunityId: string | null; companyId: string | null }
}

export interface FindingRow {
  id: string; run_id: string; capability_id: string; subject_type: string; subject_id: string
  kind: FindingKind; claim: string; severity: Severity; confidence: number
  evidence: EvidenceRef[]; unknowns: string[]; status: 'open' | 'resolved' | 'dismissed'; resolved_note: string
  financial_classification: FinancialClass | null; financial_low: number | null; financial_high: number | null; currency: string | null
  root_cause: string; cause_chain: CauseStep[]; overlap_group: string | null
  baseline_metric: Metric | null; target_metric: Metric | null; actual_outcome: Metric | null
  recovered_value: number | null; verified_at: string | null; layer: 'fact' | 'recommendation'; provider: string
  created_at: string; resolved_at: string | null
}

export interface ProposalRow {
  id: string; run_id: string; finding_id: string | null; impact: Impact; summary: string
  action: ProposalDraft['action']; target_type: string; target_id: string | null
  status: 'proposed' | 'queued' | 'applied' | 'rejected' | 'dismissed'; approval_id: string | null
  created_by_kind: 'member' | 'delegate'; created_at: string; decided_at: string | null
}

export interface ProviderReport { id: ProviderId; status: 'ok' | 'insufficient' | 'not_connected'; note: string; evidenceCount: number }

export interface RunDetail { run: RunSummary; webDomains: string[]; findings: FindingRow[]; proposals: ProposalRow[] }
