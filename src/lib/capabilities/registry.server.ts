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

const REGISTRY: Record<string, ServerCapability> = { [noopCheck.id]: noopCheck }

export function getServerCapability(id: string): ServerCapability | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id) ? REGISTRY[id] : undefined
}
