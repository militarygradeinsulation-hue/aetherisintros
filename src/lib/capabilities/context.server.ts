import type { SupabaseClient } from '@supabase/supabase-js'
import type { Budget, ContextEnvelope, EntityRef, Scope } from '@/aetheris/capabilities/types'
import { ENTITY_TABLES, redactEntity } from './scope'

interface BuildArgs {
  requestId: string
  ownerId: string
  actorId: string
  actor: 'member' | 'delegate'
  subject: EntityRef
  granted: Scope[]
  budget: Budget
}

/**
 * The ONLY path by which data reaches a capability.
 * Uses the caller's RLS client (never the admin client), reads only the subject
 * and rows linked to it, and only for granted scopes, capped by the budget.
 */
export async function buildContextEnvelope(db: SupabaseClient, args: BuildArgs): Promise<ContextEnvelope> {
  const { subject, granted, budget, ownerId } = args
  const data: ContextEnvelope['data'] = {}
  const limit = Math.max(1, budget.maxRecords)

  if (granted.includes('entity:read')) {
    const map = ENTITY_TABLES[subject.type]
    if (map) {
      const { data: row } = await db.from(map.table).select('*').eq('id', subject.id).eq(map.owner, ownerId).maybeSingle()
      data.entity = redactEntity(row as Record<string, unknown> | null)
    } else {
      data.entity = null
    }
  }

  if (granted.includes('links:read')) {
    const [from, to] = await Promise.all([
      db.from('entity_links').select('to_type,to_id,relation').eq('owner_id', ownerId).eq('from_type', subject.type).eq('from_id', subject.id).limit(limit),
      db.from('entity_links').select('from_type,from_id,relation').eq('owner_id', ownerId).eq('to_type', subject.type).eq('to_id', subject.id).limit(limit),
    ])
    data.links = [
      ...(from.data ?? []).map(r => ({ type: String(r.to_type), id: String(r.to_id), relation: String(r.relation) })),
      ...(to.data ?? []).map(r => ({ type: String(r.from_type), id: String(r.from_id), relation: String(r.relation) })),
    ].slice(0, limit)
  }

  if (granted.includes('events:read')) {
    const { data: rows } = await db.from('entity_events').select('event,summary,created_at')
      .eq('owner_id', ownerId).eq('entity_type', subject.type).eq('entity_id', subject.id)
      .order('created_at', { ascending: false }).limit(limit)
    data.events = (rows ?? []).map(r => ({ event: String(r.event), summary: String(r.summary), at: String(r.created_at) }))
  }

  return { requestId: args.requestId, ownerId, actorId: args.actorId, actor: args.actor, subject, granted, budget, data }
}
