import { createServerFn } from '@tanstack/react-start'
import { gatewayChat } from './aiGateway.server'
import { requireAuthContract } from './auth-gate'

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

function parseAiSuggestions(text: string): AiSuggestion[] {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown[]
    return parsed.flatMap(item => {
      const s = item as Record<string, unknown>
      if (typeof s['path_explanation'] !== 'string') return []
      return [{
        target_name: String(s['target_name'] ?? 'Unknown'),
        target_title: String(s['target_title'] ?? ''),
        connector_name: String(s['connector_name'] ?? 'Unknown'),
        path_explanation: String(s['path_explanation']),
        shared_context: String(s['shared_context'] ?? ''),
        strength_score: Math.min(100, Math.max(0, Number(s['strength_score'] ?? 50))),
      }]
    })
  } catch {
    return []
  }
}

export const generateReferralSuggestions = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<ReferralSuggestion[]> => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId

    // Fetch the current member's profile
    const { data: myProfile } = await db
      .from('profiles')
      .select('name, title, company, bio')
      .eq('id', userId)
      .single()

    // Fetch connections (people this user follows)
    const { data: follows } = await db
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId)
      .eq('kind', 'connection')
      .limit(50)

    const connectionIds: string[] = (follows ?? []).map((f: any) => f.followee_id as string)

    // Fetch profiles of connections and other active members
    const { data: connectionProfiles } = connectionIds.length
      ? await db.from('profiles').select('id, name, title, company').in('id', connectionIds)
      : { data: [] }

    // Fetch other active members this user doesn't yet follow (potential targets)
    const { data: otherMembers } = await db
      .from('profiles')
      .select('id, name, title, company')
      .not('id', 'in', `(${[userId, ...connectionIds].join(',')})`)
      .limit(30)

    const userContext = `
Member: ${(myProfile as any)?.name ?? 'Unknown'}, ${(myProfile as any)?.title ?? ''} at ${(myProfile as any)?.company ?? ''}
Bio: ${(myProfile as any)?.bio ?? 'Not provided'}
Connections (${connectionProfiles?.length ?? 0}): ${(connectionProfiles ?? []).map((p: any) => `${p.name} (${p.title ?? ''} at ${p.company ?? ''})`).join(', ')}
Other active members: ${(otherMembers ?? []).map((p: any) => `${p.name} (${p.title ?? ''} at ${p.company ?? ''})`).join(', ')}
`

    let suggestions: AiSuggestion[] = []
    try {
      const rawText = await gatewayChat({
        system: REFERRAL_SYSTEM,
        messages: [{ role: 'user', content: userContext }],
      })
      suggestions = parseAiSuggestions(rawText)
    } catch {
      // Fall through to empty suggestions
    }

    if (suggestions.length === 0) return []

    // Clear previous active suggestions for this user
    await (db as any).from('referral_suggestions')
      .update({ status: 'dismissed' })
      .eq('for_user_id', userId)
      .eq('status', 'active')

    // Match AI names back to real user IDs where possible
    const allProfiles = [...(connectionProfiles ?? []), ...(otherMembers ?? [])] as Array<{ id: string; name: string; title: string; company: string }>

    const stored: ReferralSuggestion[] = []
    for (const s of suggestions.slice(0, 5)) {
      const target = allProfiles.find(p => p.name.toLowerCase() === s.target_name.toLowerCase())
      const connector = allProfiles.find(p => p.name.toLowerCase() === s.connector_name.toLowerCase())

      const { data: row, error } = await (db as any).from('referral_suggestions').insert({
        for_user_id: userId,
        target_user_id: target?.id ?? null,
        connector_user_id: connector?.id ?? null,
        path_explanation: s.path_explanation,
        shared_context: s.shared_context || null,
        strength_score: s.strength_score,
        status: 'active',
      }).select().single()

      if (!error && row) {
        stored.push({
          ...(row as ReferralSuggestion),
          target_name: s.target_name,
          target_title: s.target_title,
          connector_name: s.connector_name,
        })
      }
    }

    return stored
  })

export const getReferralSuggestions = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<ReferralSuggestion[]> => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId

    const { data, error } = await (db as any).from('referral_suggestions')
      .select('*, target:target_user_id(name, title), connector:connector_user_id(name)')
      .eq('for_user_id', userId)
      .in('status', ['active', 'snoozed'])
      .or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`)
      .order('strength_score', { ascending: false })
      .limit(20)

    if (error) return []

    return (data ?? []).map((row: any) => ({
      id: row.id,
      target_user_id: row.target_user_id,
      connector_user_id: row.connector_user_id,
      target_name: row.target?.name ?? 'Unknown',
      target_title: row.target?.title ?? '',
      connector_name: row.connector?.name ?? 'Unknown',
      path_explanation: row.path_explanation,
      shared_context: row.shared_context,
      strength_score: row.strength_score,
      status: row.status,
      snoozed_until: row.snoozed_until,
      generated_at: row.generated_at,
    })) as ReferralSuggestion[]
  })

export const dismissSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { suggestionId: string }) => data)
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId
    await (db as any).from('referral_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', data.suggestionId)
      .eq('for_user_id', userId)
  })

export const snoozeSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { suggestionId: string; days?: number }) => data)
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId
    const days = data.days ?? 7
    const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    await (db as any).from('referral_suggestions')
      .update({ status: 'snoozed', snoozed_until: snoozeUntil })
      .eq('id', data.suggestionId)
      .eq('for_user_id', userId)
  })

export const requestReferral = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { suggestionId: string; connectorId: string; targetId: string; message: string }) => data)
  .handler(async ({ data, context }): Promise<ReferralRequest> => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId

    const { data: row, error } = await (db as any).from('referral_requests').insert({
      suggestion_id: data.suggestionId,
      requester_id: userId,
      connector_id: data.connectorId,
      target_id: data.targetId,
      message: data.message,
    }).select().single()

    if (error) throw new Error(error.message)

    // Mark the suggestion as acted on
    await (db as any).from('referral_suggestions')
      .update({ status: 'acted_on', acted_at: new Date().toISOString() })
      .eq('id', data.suggestionId)
      .eq('for_user_id', userId)

    return row as ReferralRequest
  })
