/**
 * Client access to the reciprocity ledger and "Keep warm" (migration 0055). Every call is a
 * member-scoped RPC: the database derives gives/gets and cooling relationships from the
 * caller's own records, so the client never sees anyone else's raw activity.
 */
import { supabase } from '@/integrations/supabase/client'

import type { GiveKind, GiverBand } from './reciprocity-core'

export * from './reciprocity-core'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface PersonCount { id: string; name: string; times: number }

export interface Reciprocity {
  gives: Partial<Record<GiveKind, number>>
  gets: Partial<Record<GiveKind, number>>
  gives_total: number
  gets_total: number
  confirmed_gives: number
  people_helped: number
  helped: PersonCount[]
  helped_you: PersonCount[]
  band: GiverBand
  show_band: boolean
  cooling_nudges: boolean
}

export interface WayToGive { id: string; ask: string; author_id: string; author: string; matched: string[]; created_at: string }

export interface CoolingRelationship {
  kind: 'member' | 'person'
  id: string
  name: string
  last_touch: string
  cadence_days: number
  quiet_days: number
  touches: number
  reason: string
  reason_kind: 'ask' | 'post' | 'circle' | 'crm' | 'cadence'
}

const err = (r: any) => (r?.error ? String(r.error.message ?? r.error) : '')

export async function loadReciprocity(): Promise<{ data: Reciprocity | null; error: string }> {
  const r = await db.rpc('my_reciprocity')
  return { data: (r.data ?? null) as Reciprocity | null, error: err(r) }
}

export async function loadWaysToGive(): Promise<{ data: WayToGive[]; error: string }> {
  const r = await db.rpc('ways_to_give')
  return { data: (r.data ?? []) as WayToGive[], error: err(r) }
}

export async function loadCooling(limit = 5): Promise<{ data: CoolingRelationship[]; error: string }> {
  const r = await db.rpc('my_cooling_relationships', { p_limit: limit })
  return { data: (r.data ?? []) as CoolingRelationship[], error: err(r) }
}

export async function setRelationshipSnooze(kind: 'member' | 'person', id: string, mode: 'snooze' | 'dismiss' | 'clear'): Promise<{ error: string }> {
  return { error: err(await db.rpc('set_relationship_snooze', { p_kind: kind, p_id: id, p_mode: mode })) }
}

export async function setReciprocitySettings(input: { showBand?: boolean; coolingNudges?: boolean }): Promise<{ data: { show_band: boolean; cooling_nudges: boolean } | null; error: string }> {
  const r = await db.rpc('set_reciprocity_settings', { p_show_band: input.showBand ?? null, p_cooling_nudges: input.coolingNudges ?? null })
  return { data: r.data ?? null, error: err(r) }
}

export async function loadReciprocitySettings(): Promise<{ show_band: boolean; cooling_nudges: boolean } | null> {
  const { data: auth } = await supabase.auth.getSession()
  const uid = auth.session?.user.id
  if (!uid) return null
  const r = await db.from('reciprocity_settings').select('show_band, cooling_nudges').eq('user_id', uid).maybeSingle()
  if (r.error) return null
  return { show_band: !!r.data?.show_band, cooling_nudges: r.data ? !!r.data.cooling_nudges : true }
}
