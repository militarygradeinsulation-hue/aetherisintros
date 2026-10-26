/**
 * Supabase implementation of TableGateway.
 *
 * Core + OS tables use full columns; Moat + Pro tables store all domain
 * fields inside a `data jsonb` column. The gateway transparently unwraps
 * on select and wraps on insert/update so callers always work with flat
 * TypeScript model objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase } from '../../integrations/supabase/client'
import type { TableGateway } from './repository'

// Tables that store all domain fields inside a single `data jsonb` column.
const JSONB_DATA_TABLES = new Set([
  // Moat layer
  'professional_passports', 'network_constitution_rules', 'outreach_quality_reviews',
  'outreach_strike_ledgers', 'network_questions', 'serendipity_matches',
  'organization_relationship_passports', 'live_events', 'relationship_gaps',
  'portable_identities', 'consent_ledger_entries', 'reciprocity_signals',
  'relationship_decay_risks', 'digital_representative_policies', 'introduction_availability',
  'network_snapshots', 'outcome_attribution_edges', 'knowledge_posts',
  'advisory_boards', 'relationship_context_adapters', 'relationship_context_queries',
  // Pro layer
  'professional_passport_profiles', 'passport_credentials', 'proof_of_work_nodes',
  'proof_of_work_edges', 'contextual_reputations', 'professional_opportunities',
  'deal_rooms', 'expertise_offers', 'professional_referrals', 'introducer_records',
  'capability_problems', 'suggested_teams', 'capital_profiles', 'acquisition_intents',
  'board_advisory_intents', 'industry_rooms', 'industry_intelligence_items', 'peer_councils',
  'event_presences', 'travel_plans', 'professional_availability', 'pitch_permission_requests',
  'professional_boundary_rules', 'import_batches', 'import_proposals',
  'relationship_vault_exports', 'professional_inbox_decisions', 'transaction_records',
  'marketplace_listings', 'knowledge_assets', 'human_concierge_reviews',
  'aetheris_standard_acceptances',
])

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

type AnyRow = Record<string, unknown>

function toModel(table: string, row: AnyRow): AnyRow {
  if (!JSONB_DATA_TABLES.has(table)) return row
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, owner_id: _oid, scope: _s, data, created_at: _c, updated_at: _u, ...topLevel } = row
  return {
    id,
    ...topLevel,
    ...(data && typeof data === 'object' && !Array.isArray(data) ? (data as AnyRow) : {}),
  }
}

function toDbRow(table: string, uid: string | null, row: AnyRow): AnyRow {
  if (!JSONB_DATA_TABLES.has(table)) return uid ? { ...row, owner_id: uid } : row
  const { id, ...rest } = row
  return { id, owner_id: uid, data: rest }
}

// Escape hatch: supabase.from() is typed to known tables only; casting
// to `any` lets us call it with runtime-derived table names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function createSupabaseGateway(): TableGateway {
  return {
    async select(table: string) {
      const { data, error } = await db.from(table).select('*')
      if (error) throw error
      return ((data ?? []) as AnyRow[]).map(row => toModel(table, row))
    },

    async insert(table: string, row: AnyRow) {
      const uid = await currentUserId()
      const dbRow = toDbRow(table, uid, row)
      const { data, error } = await db.from(table).insert(dbRow).select().single()
      if (error) throw error
      return toModel(table, data as AnyRow)
    },

    async update(table: string, id: string, patch: AnyRow) {
      if (JSONB_DATA_TABLES.has(table)) {
        const { data: existing, error: readErr } = await db.from(table).select('data').eq('id', id).single()
        if (readErr) throw readErr
        const mergedData = { ...((existing?.data as AnyRow) ?? {}), ...patch }
        const { data: updated, error } = await db.from(table).update({ data: mergedData }).eq('id', id).select().single()
        if (error) throw error
        return toModel(table, updated as AnyRow)
      }
      const { data, error } = await db.from(table).update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as AnyRow
    },

    async delete(table: string, id: string) {
      const { error } = await db.from(table).delete().eq('id', id)
      if (error) throw error
    },
  }
}
