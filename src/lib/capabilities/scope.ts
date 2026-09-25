import type { Budget, EntityType, Scope } from '@/aetheris/capabilities/types'
import { ENTITY_TYPES, SCOPES } from '@/aetheris/capabilities/types'

/** Grant only scopes the capability declared AND the request asked for; web access is never implicit. */
export function grantScopes(declared: readonly Scope[], requested: readonly Scope[] | undefined, allowWeb: boolean): Scope[] {
  const wanted = requested ?? declared
  return SCOPES.filter(s => declared.includes(s) && wanted.includes(s) && (s !== 'web:read' || allowWeb))
}

export function clampBudget(b: Partial<Budget> | undefined): Budget {
  const n = (v: unknown, d: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(Math.floor(v), max)) : d)
  return { maxRecords: n(b?.maxRecords, 25, 100), maxWebCalls: n(b?.maxWebCalls, 0, 10) }
}

export function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && (ENTITY_TYPES as readonly string[]).includes(value)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 120 && /^[A-Za-z0-9_.:-]+$/.test(value)
}
export const isUuid = (v: string) => UUID.test(v)

/** Subject → table + owner column. Only these are ever read for "entity:read". */
export const ENTITY_TABLES: Partial<Record<EntityType, { table: string; owner: string }>> = {
  person: { table: 'crm_people', owner: 'owner_id' },
  company: { table: 'crm_companies', owner: 'owner_id' },
  opportunity: { table: 'crm_opportunities', owner: 'owner_id' },
  task: { table: 'crm_tasks', owner: 'owner_id' },
  note: { table: 'crm_notes', owner: 'owner_id' },
  decision: { table: 'decisions', owner: 'user_id' },
  mission: { table: 'missions', owner: 'owner_id' },
  meeting: { table: 'calendar_events', owner: 'user_id' },
}

/** Fields never forwarded to a capability even when the entity is in scope. */
const PRIVATE_FIELDS = new Set(['email', 'phone', 'private_notes', 'custom', 'payload', 'owner_id', 'user_id', 'account_id'])
export function redactEntity(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) if (!PRIVATE_FIELDS.has(k)) out[k] = v
  return out
}
