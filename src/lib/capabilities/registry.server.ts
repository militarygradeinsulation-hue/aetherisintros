import type { ContextEnvelope, CostTier, EntityType, Impact, ResultEnvelope, Scope, Verb } from '@/aetheris/capabilities/types'

export interface ServerCapability {
  id: string
  verb: Verb
  appliesTo: EntityType[]
  scopes: Scope[]
  impact: Impact
  costTier: CostTier
  /** Internal capabilities are never listed to members or offered in any UI. */
  internal?: boolean
  deterministic(ctx: ContextEnvelope): ResultEnvelope
  /** Evidence-first engines that write findings/proposals through secure RPCs. */
  engine?: 'diagnose' | 'enrich'
}

/** Internal spine check: proves the run → context → result path without touching member-facing UI. */
const noopCheck: ServerCapability = {
  id: 'system.noop_check',
  verb: 'test',
  appliesTo: ['self', 'person', 'company', 'opportunity', 'decision'],
  scopes: ['entity:read', 'links:read', 'events:read'],
  impact: 'read',
  costTier: 'light',
  internal: true,
  deterministic(ctx) {
    return {
      status: 'ok',
      engine: 'deterministic',
      output: {
        granted: ctx.granted,
        entityPresent: Boolean(ctx.data.entity),
        linkCount: ctx.data.links?.length ?? 0,
        eventCount: ctx.data.events?.length ?? 0,
      },
      items: [{ layer: 'fact', text: 'Context envelope built with only the granted scopes.' }],
      provenance: { inputs: [ctx.subject], sources: [] },
    }
  },
}

const diagnoseBase = (id: string, verb: Verb, appliesTo: EntityType[]): ServerCapability => ({
  id, verb, appliesTo, scopes: ['entity:read', 'links:read', 'events:read', 'web:read', 'record:propose'], impact: 'draft', costTier: 'light', engine: 'diagnose',
  deterministic: ctx => ({ status: 'ok', engine: 'deterministic', output: {}, items: [], provenance: { inputs: [ctx.subject], sources: [] } }),
})

const REGISTRY: Record<string, ServerCapability> = {
  [noopCheck.id]: noopCheck,
  'company.diagnose': diagnoseBase('company.diagnose', 'diagnose', ['company', 'opportunity', 'person']),
  'company.trace_cause': diagnoseBase('company.trace_cause', 'analyze', ['company', 'opportunity']),
  'company.model_impact': diagnoseBase('company.model_impact', 'analyze', ['company', 'opportunity']),
  'company.find_opportunity': diagnoseBase('company.find_opportunity', 'find', ['company', 'person']),
  'company.prepare_action': diagnoseBase('company.prepare_action', 'prepare', ['company', 'opportunity', 'person', 'decision']),
  'decision.challenge': diagnoseBase('decision.challenge', 'challenge', ['decision']),
  'enrich.person.professional': {
    id: 'enrich.person.professional', verb: 'find', appliesTo: ['person'], scopes: ['entity:read', 'record:propose'], impact: 'write', costTier: 'light', engine: 'enrich',
    deterministic: ctx => ({ status: 'ok', engine: 'deterministic', output: {}, items: [], provenance: { inputs: [ctx.subject], sources: [] } }),
  },
}

export function getServerCapability(id: string): ServerCapability | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id) ? REGISTRY[id] : undefined
}
