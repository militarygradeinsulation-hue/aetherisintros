import { createServerFn } from '@tanstack/react-start'
import { gatewayChat } from './aiGateway.server'
import { requireAuthContract } from './auth-gate'

/**
 * Production uses the original referral_suggestions / referral_requests schema.
 * Do not replay Drizzle 0072 over those existing tables. The JSONB context
 * holds presentation details, while RLS and explicit owner predicates scope
 * every write to the signed-in member.
 */
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

const REFERRAL_SYSTEM = `You are a referral path finder for a professional network. Given a member's profile and their connections, identify the 5 warmest referral paths. Return ONLY valid JSON array:
[{"target_name":"...","target_title":"...","connector_name":"...","path_explanation":"...","shared_context":"...","strength_score":75}]`

interface AiSuggestion {
  target_name: string
  target_title: string
  connector_name: string
  path_explanation: string
  shared_context: string
  strength_score: number
}

type Profile = { id: string; name: string; title?: string | null; company?: string | null }
type LegacySuggestion = {
  id: string
  for_member_id: string
  suggested_member_id: string
  score: number | string | null
  reason: string | null
  context: unknown
  status: string
  created_at: string
  dismissed_at: string | null
  actioned_at: string | null
}

function details(row: LegacySuggestion): Record<string, unknown> {
  return row.context && typeof row.context === 'object' && !Array.isArray(row.context)
    ? row.context as Record<string, unknown>
    : {}
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function toSuggestion(row: LegacySuggestion, profiles: Map<string, Profile>): ReferralSuggestion {
  const info = details(row)
  const target = profiles.get(row.suggested_member_id)
  const connectorId = typeof info.connector_user_id === 'string' ? info.connector_user_id : null
  const connector = connectorId ? profiles.get(connectorId) : undefined
  const until = typeof info.snoozed_until === 'string' ? info.snoozed_until : null
  return {
    id: row.id,
    target_user_id: row.suggested_member_id,
    connector_user_id: connectorId,
    target_name: target?.name ?? stringOr(info.target_name, 'Member'),
    target_title: target?.title ?? stringOr(info.target_title, ''),
    connector_name: connector?.name ?? stringOr(info.connector_name, 'A connection'),
    path_explanation: row.reason ?? '',
    shared_context: typeof info.shared_context === 'string' ? info.shared_context : null,
    strength_score: Number(row.score ?? 0),
    status: row.status === 'snoozed' && until && new Date(until).getTime() > Date.now()
      ? 'snoozed'
      : row.status === 'dismissed' ? 'dismissed'
      : row.status === 'actioned' || row.status === 'acted_on' ? 'acted_on' : 'active',
    snoozed_until: until,
    generated_at: row.created_at,
  }
}

function parseAiSuggestions(text: string): AiSuggestion[] {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  try {
    const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const s = item as Record<string, unknown>
      if (typeof s.path_explanation !== 'string') return []
      return [{
        target_name: String(s.target_name ?? 'Unknown'),
        target_title: String(s.target_title ?? ''),
        connector_name: String(s.connector_name ?? 'Unknown'),
        path_explanation: s.path_explanation.slice(0, 1600),
        shared_context: String(s.shared_context ?? '').slice(0, 1600),
        strength_score: Math.min(100, Math.max(0, Number(s.strength_score ?? 50))),
      }]
    })
  } catch {
    return []
  }
}

async function profileMap(db: any, ids: string[]): Promise<Map<string, Profile>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!ids.length) return new Map()
  const { data, error } = await db.from('profiles').select('id,name,title').in('id', [...new Set(ids)])
  if (error) throw new Error('Referral member details could not be loaded.')
  return new Map<string, Profile>((data ?? []).map((row: Profile) => [row.id, row]))
}

/** Generate only paths that resolve to real member records and a known connection. */
export const generateReferralSuggestions = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<ReferralSuggestion[]> => {
    const db = (context as any).supabase // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId: string = (context as any).userId // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: myProfile, error: profileError } = await db
      .from('profiles').select('name,title,company,bio').eq('id', userId).single()
    if (profileError) throw new Error('Profile unavailable. No suggestions were generated.')

    const { data: follows, error: followError } = await db.from('follows')
      .select('followee_id').eq('follower_id', userId).eq('kind', 'connection').limit(50)
    if (followError) throw new Error('Connections unavailable. No suggestions were generated.')
    const connectionIds: string[] = (follows ?? []).map((f: { followee_id: string }) => f.followee_id)
    if (!connectionIds.length) return []
    const { data: connectionProfiles, error: connectedError } = await db.from('profiles')
      .select('id,name,title,company').in('id', connectionIds)
    if (connectedError) throw new Error('Connections could not be loaded.')

    const { data: otherMembers, error: membersError } = await db.from('profiles')
      .select('id,name,title,company')
      .not('id', 'in', `(${[userId, ...connectionIds].join(',')})`)
      .limit(30)
    if (membersError) throw new Error('The member directory could not be loaded.')
    const connections: Profile[] = connectionProfiles ?? []
    const all: Profile[] = [...connections, ...(otherMembers ?? [])]
    const userContext = `Member: ${myProfile?.name ?? 'Unknown'}, ${myProfile?.title ?? ''} at ${myProfile?.company ?? ''}
Bio: ${myProfile?.bio ?? 'Not provided'}
Connections: ${connections.map(p => `${p.name} (${p.title ?? ''} at ${p.company ?? ''})`).join(', ')}
Potential targets: ${(otherMembers ?? []).map((p: Profile) => `${p.name} (${p.title ?? ''} at ${p.company ?? ''})`).join(', ')}`

    let suggestions: AiSuggestion[]
    try {
      suggestions = parseAiSuggestions(await gatewayChat({
        system: REFERRAL_SYSTEM,
        messages: [{ role: 'user', content: userContext }],
      }))
    } catch {
      throw new Error('Referral generation is unavailable. Existing suggestions were kept.')
    }

    const saved: ReferralSuggestion[] = []
    for (const s of suggestions.slice(0, 5)) {
      const target = all.find(p => p.name.toLowerCase() === s.target_name.toLowerCase() && p.id !== userId)
      const connector = connections.find(p => p.name.toLowerCase() === s.connector_name.toLowerCase())
      // Never insert a fabricated member or claim an unverifiable warm path.
      if (!target || !connector || target.id === connector.id) continue
      const { data: row, error } = await db.from('referral_suggestions').insert({
        for_member_id: userId,
        suggested_member_id: target.id,
        score: s.strength_score,
        reason: s.path_explanation,
        context: {
          target_name: target.name,
          target_title: target.title ?? s.target_title,
          connector_user_id: connector.id,
          connector_name: connector.name,
          shared_context: s.shared_context,
        },
        status: 'pending',
      }).select('*').single()
      if (error || !row) {
        throw new Error(`${saved.length} referral suggestion(s) saved, but the next save failed: ${error?.message ?? 'No receipt returned'}`)
      }
      const profiles = new Map<string, Profile>([[target.id, target], [connector.id, connector]])
      saved.push(toSuggestion(row, profiles))
    }
    return saved
  })

export const getReferralSuggestions = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<ReferralSuggestion[]> => {
    const db = (context as any).supabase // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId: string = (context as any).userId // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await db.from('referral_suggestions')
      .select('id,for_member_id,suggested_member_id,score,reason,context,status,created_at,dismissed_at,actioned_at')
      .eq('for_member_id', userId)
      .in('status', ['pending', 'active', 'snoozed'])
      .order('created_at', { ascending: false }).limit(40)
    if (error) throw new Error(`Could not load referral suggestions: ${error.message}`)
    const rows = (data ?? []) as LegacySuggestion[]
    const ids = rows.flatMap(row => {
      const connector = details(row).connector_user_id
      return [row.suggested_member_id, ...(typeof connector === 'string' ? [connector] : [])]
    })
    const names = await profileMap(db, ids)
    return rows.map(row => toSuggestion(row, names))
      .filter(row => row.status === 'active')
      .sort((a,b) => b.strength_score - a.strength_score)
      .slice(0, 20)
  })

export const dismissSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { suggestionId: string }) => data)
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId: string = (context as any).userId // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: saved, error } = await db.from('referral_suggestions')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
      .eq('id', data.suggestionId).eq('for_member_id', userId)
      .select('id').maybeSingle()
    if (error || !saved?.id) throw new Error(error?.message ?? 'Dismissal was not confirmed.')
  })

export const snoozeSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { suggestionId: string; days?: number }) => data)
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId: string = (context as any).userId // eslint-disable-line @typescript-eslint/no-explicit-any
    const days = Math.max(1, Math.min(30, Math.floor(data.days ?? 7)))
    const { data: row, error: readError } = await db.from('referral_suggestions')
      .select('id,context,status').eq('id', data.suggestionId).eq('for_member_id', userId).maybeSingle()
    if (readError || !row || row.status === 'dismissed' || row.status === 'actioned') throw new Error('Suggestion is no longer available for snoozing.')
    const contextValue = row.context && typeof row.context === 'object' && !Array.isArray(row.context)
      ? row.context as Record<string, unknown> : {}
    const snoozedUntil = new Date(Date.now() + days * 86400000).toISOString()
    const { data: saved, error } = await db.from('referral_suggestions')
      .update({ status: 'snoozed', context: { ...contextValue, snoozed_until: snoozedUntil } })
      .eq('id', data.suggestionId).eq('for_member_id', userId)
      .select('id').maybeSingle()
    if (error || !saved?.id) throw new Error(error?.message ?? 'Snooze was not confirmed.')
  })

export const requestReferral = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { suggestionId: string; connectorId: string; targetId: string; message: string }) => data)
  .handler(async ({ data, context }): Promise<ReferralRequest> => {
    const db = (context as any).supabase // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId: string = (context as any).userId // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: suggestion, error: suggestionError } = await db.from('referral_suggestions')
      .select('id,suggested_member_id,context,status')
      .eq('id', data.suggestionId).eq('for_member_id', userId).maybeSingle()
    if (suggestionError || !suggestion || !['active', 'pending', 'snoozed'].includes(suggestion.status))
      throw new Error('The referral suggestion is no longer available.')
    const info = suggestion.context && typeof suggestion.context === 'object' && !Array.isArray(suggestion.context)
      ? suggestion.context as Record<string, unknown> : {}
    if (suggestion.suggested_member_id !== data.targetId || info.connector_user_id !== data.connectorId)
      throw new Error('The requested people do not match the saved referral suggestion.')
    const { data: connection, error: connectionError } = await db.from('follows')
      .select('followee_id').eq('follower_id', userId)
      .eq('followee_id', data.connectorId).eq('kind','connection').maybeSingle()
    if (connectionError || !connection) throw new Error('This connector is no longer one of your confirmed connections.')
    const message = data.message.trim()
    if (!message || message.length > 2000) throw new Error('Provide a message of 1 to 2000 characters.')
    const { data: row, error } = await db.from('referral_requests').insert({
      requester_id: userId, target_member_id: data.targetId,
      connector_id: data.connectorId, message, status: 'pending',
    }).select('id,requester_id,target_member_id,connector_id,message,status,created_at,responded_at').single()
    if (error || !row) throw new Error(error?.message ?? 'Referral request was not saved.')
    const { data: updated, error: markedError } = await db.from('referral_suggestions')
      .update({ status: 'actioned', actioned_at: new Date().toISOString() })
      .eq('id', data.suggestionId).eq('for_member_id', userId)
      .select('id').maybeSingle()
    if (markedError || !updated?.id)
      throw new Error('Referral request saved, but the suggestion could not be marked as used. Do not submit it again until you check your requests.')
    return {
      id: row.id, suggestion_id: data.suggestionId, requester_id: row.requester_id,
      connector_id: row.connector_id, target_id: row.target_member_id,
      message: row.message ?? '', status: row.status, created_at: row.created_at,
      responded_at: row.responded_at,
    }
  })
