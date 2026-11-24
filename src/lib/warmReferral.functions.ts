import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'
import { buildWarmReferralCandidates, type ReferralProfile } from '@/aetheris/domain/warm-referral-evidence'
import { z } from 'zod'

export interface ReferralSuggestion {
  id: string
  target_user_id: string | null
  connector_user_id: string | null
  target_name: string
  target_title: string
  connector_name: string
  path_explanation: string
  shared_context: string | null
  strength_score: number
  status: 'active' | 'acted_on' | 'dismissed' | 'snoozed'
  snoozed_until: string | null
  generated_at: string
}

export interface ReferralRequest {
  id: string
  suggestion_id: string | null
  requester_id: string
  connector_id: string
  target_id: string
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  created_at: string
  responded_at: string | null
}

// Read using the member session. Only narrowly scoped, server-owned writes
// use the existing service client after the live membership gate passes.
async function requireMember(db: any) {
  const gate = await db.rpc('is_live_member')
  if (gate.error || gate.data !== true) throw new Error('Live membership could not be confirmed.')
}
async function visibleProfiles(db: any, ids?: string[]): Promise<ReferralProfile[]> {
  if (ids && !ids.length) return []
  const { data, error } = await db.rpc('visible_member_profiles', { p_member_ids: ids ?? null, p_limit: 100, p_offset: 0 })
  if (error) throw new Error('Visible member profiles could not be read.')
  return (data ?? []).flatMap((row: {profile?: ReferralProfile}) => row.profile?.id ? [row.profile] : [])
}
function displaySuggestion(row: any, profiles: ReferralProfile[]): ReferralSuggestion {
  const target = profiles.find(p => p.id===row.target_user_id)
  const connector = profiles.find(p => p.id===row.connector_user_id)
  return {
    id: row.id, target_user_id: target?.id ?? null, connector_user_id: connector?.id ?? null,
    target_name: target?.name ?? 'Unavailable member', target_title: target?.title ?? '',
    connector_name: connector?.name ?? 'Unavailable member',
    path_explanation: row.path_explanation ?? row.reason ?? 'Legacy suggestion; confirm the recorded path.',
    shared_context: row.shared_context ?? null, strength_score: Number(row.strength_score ?? row.score ?? 0),
    status: row.status === 'pending' ? 'active' : row.status, snoozed_until: row.snoozed_until ?? null,
    generated_at: row.generated_at ?? row.created_at,
  }
}

export const generateReferralSuggestions = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<ReferralSuggestion[]> => {
    const db = context.supabase as any
    const userId = context.userId
    await requireMember(db)
    const [own, connections, directory] = await Promise.all([
      visibleProfiles(db, [userId]),
      db.from('relationships').select('member_id').eq('user_id',userId).eq('kind','connection').limit(50),
      visibleProfiles(db),
    ])
    if (connections.error || !own[0]) throw new Error('Referral evidence could not be read. Saved suggestions were not changed.')
    const connectorIds = [...new Set<string>((connections.data ?? []).map((r: {member_id:string})=>r.member_id))]
    const connectors = await visibleProfiles(db,connectorIds)
    const candidates = buildWarmReferralCandidates(own[0],connectors,directory)
    if (!candidates.length) throw new Error('No sufficiently supported referral candidates were found. Saved suggestions were not changed.')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await (supabaseAdmin as any).rpc('replace_warm_referral_suggestions',{p_owner:userId,p_rows:candidates})
    if (error || !Array.isArray(data) || !data.length) throw new Error(error?.message ?? 'No saved suggestions were confirmed.')
    return data.map((row:any)=>displaySuggestion(row,[...directory,...connectors]))
  })

export const getReferralSuggestions = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<ReferralSuggestion[]> => {
    const db = context.supabase as any
    const userId = context.userId
    await requireMember(db)
    const { data, error } = await db.from('referral_suggestions').select('*')
      .eq('for_member_id',userId).in('status',['active','snoozed','pending'])
      .or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`)
      .order('strength_score',{ascending:false}).limit(20)
    if (error) throw new Error('Saved referral suggestions could not be read.')
    const rows = data ?? []
    const ids = [...new Set<string>(rows.flatMap((row:any)=>[row.target_user_id,row.connector_user_id].filter(Boolean)))]
    const profiles = await visibleProfiles(db,ids)
    return rows.map((row:any)=>displaySuggestion(row,profiles))
  })

export const dismissSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator(z.object({suggestionId:z.string().uuid()}))
  .handler(async ({ data, context }) => {
    await requireMember(context.supabase)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: updated, error } = await supabaseAdmin.from('referral_suggestions')
      .update({status:'dismissed'}).eq('id',data.suggestionId).eq('for_member_id',context.userId)
      .in('status',['active','snoozed','pending']).select('id').maybeSingle()
    if (error || !updated?.id) throw new Error(error?.message ?? 'Dismissal could not be confirmed.')
  })

export const snoozeSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator(z.object({suggestionId:z.string().uuid(),days:z.number().int().min(1).max(90).optional()}))
  .handler(async ({ data, context }) => {
    await requireMember(context.supabase)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const snoozeUntil = new Date(Date.now()+(data.days ?? 7)*86400000).toISOString()
    const { data: updated, error } = await supabaseAdmin.from('referral_suggestions')
      .update({status:'snoozed',snoozed_until:snoozeUntil}).eq('id',data.suggestionId).eq('for_member_id',context.userId)
      .in('status',['active','snoozed','pending']).select('id').maybeSingle()
    if (error || !updated?.id) throw new Error(error?.message ?? 'Snooze could not be confirmed.')
  })

export const requestReferral = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator(z.object({suggestionId:z.string().uuid(),connectorId:z.string().uuid(),targetId:z.string().uuid(),message:z.string().trim().min(3).max(2000)}))
  .handler(async ({ data, context }): Promise<ReferralRequest> => {
    const db = context.supabase as any
    await requireMember(db)
    const profiles = await visibleProfiles(db,[data.connectorId,data.targetId])
    if (!profiles.some(p=>p.id===data.connectorId)||!profiles.some(p=>p.id===data.targetId)) throw new Error('Referral participants are no longer available.')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const {data: row,error} = await (supabaseAdmin as any).rpc('submit_warm_referral_request',{
      p_owner:context.userId,p_suggestion:data.suggestionId,p_connector:data.connectorId,p_target:data.targetId,p_message:data.message,
    })
    if (error || !row?.id) throw new Error(error?.message ?? 'Referral request was not confirmed.')
    return row as ReferralRequest
  })
