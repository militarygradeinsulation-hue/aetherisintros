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

export interface ResultEnvelope<O = unknown> {
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
