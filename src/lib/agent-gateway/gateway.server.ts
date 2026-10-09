/**
 * Agent Trust Gateway, server side (routes under src/routes/api/agent/).
 *
 * Assistant calls authenticate with a member-issued key (`Authorization: Bearer ai_…`), run as
 * that member with the service client, are limited per key, and are logged in agent_actions for
 * the member. Inbound requests from outside agents are screened against the target member's
 * Agent Policy (screening.ts). See drizzle/migrations/0054_agent_gateway.sql.
 */
import { getSetting } from '../app-settings.server'
import { bearerKey, hashAgentKey, sha256Hex, type AgentScope } from './keys'
import { DAY, HOUR, LIMITS, retryAfterSeconds, windowStart } from './rate-limit'
import { genericRejections, normalizeForHash, parseInbound, screenRequest, type AgentPolicy } from './screening'

/** What an assistant may see of other members: the same fields as the MCP search_members tool. */
const MEMBER_COLUMNS =
  'id,name,title,company,location,focus,bio,looking_for,can_help_with,want_to_meet,availability,industries,expertise,what_i_do,building,open_to'

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

export interface AgentKeyInfo {
  id: string
  user_id: string
  name: string
  scopes: AgentScope[]
  rate_per_hour: number
  intros_per_day: number
  verified: boolean
}

type Action = AgentScope | 'inbound_request'
type Result = 'ok' | 'denied' | 'rate_limited' | 'invalid' | 'error'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } })

export async function logAction(key: AgentKeyInfo, action: Action, result: Result, target = '', detail = ''): Promise<void> {
  try {
    await (await admin()).from('agent_actions').insert({
      key_id: key.id, user_id: key.user_id, action, result, target: target.slice(0, 200), detail: detail.slice(0, 300),
    })
  } catch (error) {
    console.error('agent action log failed', error)
  }
}

/** One hit against a fixed window; true while under the limit. */
export async function rateHit(bucket: string, windowSeconds: number, limit: number, now = Date.now()): Promise<boolean> {
  const { data, error } = await (await admin()).rpc('agent_rate_hit', {
    p_bucket: bucket.slice(0, 200), p_window_start: windowStart(now, windowSeconds).toISOString(), p_limit: limit,
  })
  if (error) throw new Error(error.message)
  return data === true
}

const tooMany = (windowSeconds: number, message: string) =>
  json({ error: 'rate_limited', message }, 429, { 'retry-after': String(retryAfterSeconds(Date.now(), windowSeconds)) })

/** The key presented on this request, if any and valid. */
export async function keyFromRequest(request: Request): Promise<AgentKeyInfo | null> {
  const key = bearerKey(request.headers.get('authorization'))
  if (!key) return null
  const { data, error } = await (await admin()).rpc('agent_key_lookup', { p_hash: await hashAgentKey(key) })
  if (error) throw new Error(error.message)
  return (data as AgentKeyInfo | null) ?? null
}

/**
 * Authenticate an assistant call for one scope. Returns the key, or the Response to send.
 * Failures after the key is known are logged for its owner.
 */
export async function authorize(request: Request, scope: AgentScope, target = ''): Promise<AgentKeyInfo | Response> {
  const key = await keyFromRequest(request)
  if (!key) return json({ error: 'unauthorized', message: 'Send a valid assistant key: Authorization: Bearer ai_…' }, 401, { 'www-authenticate': 'Bearer' })
  if (!key.verified) {
    await logAction(key, scope, 'denied', target, 'Owner is not a verified member')
    return json({ error: 'forbidden', message: 'The member who issued this key is not verified.' }, 403)
  }
  if (!key.scopes.includes(scope)) {
    await logAction(key, scope, 'denied', target, `Key lacks scope ${scope}`)
    return json({ error: 'forbidden', message: `This key was not given the ${scope} permission.` }, 403)
  }
  if (!(await rateHit(`key:${key.id}`, HOUR, key.rate_per_hour))) {
    await logAction(key, scope, 'rate_limited', target, `Over ${key.rate_per_hour} calls per hour`)
    return tooMany(HOUR, `This key allows ${key.rate_per_hour} calls per hour.`)
  }
  return key
}

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length') ?? 0) > 20_000) return null
  try {
    const text = await request.text()
    if (text.length > 20_000) return null
    const body: unknown = JSON.parse(text)
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

const PUBLIC_PROFILE = 'id,name,title,company,location,focus,what_i_do,looking_for,can_help_with'

/* ------------------------------------------------------------------ assistant actions */

export async function handleProfile(request: Request): Promise<Response> {
  const key = await authorize(request, 'read_profile_public', 'self')
  if (key instanceof Response) return key
  const { data, error } = await (await admin()).from('profiles').select(PUBLIC_PROFILE).eq('id', key.user_id).maybeSingle()
  if (error) { await logAction(key, 'read_profile_public', 'error', 'self', error.message); return json({ error: 'failed' }, 500) }
  await logAction(key, 'read_profile_public', 'ok', 'self')
  return json({ profile: data })
}

export async function handleSearch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').replace(/[,%()]/g, ' ').trim().slice(0, 100)
  const limit = Math.min(25, Math.max(1, Number(url.searchParams.get('limit')) || 10))
  const key = await authorize(request, 'search_members', query)
  if (key instanceof Response) return key
  // Same population as the MCP search_members tool: onboarded members, never the demo catalogue.
  let q = (await admin()).from('profiles').select(MEMBER_COLUMNS).eq('onboarded', true).neq('id', key.user_id)
    .order('created_at', { ascending: false }).limit(limit)
  if (query) q = q.or(['name', 'title', 'company', 'focus', 'bio', 'looking_for', 'can_help_with', 'what_i_do'].map(c => `${c}.ilike.%${query}%`).join(','))
  const { data, error } = await q
  if (error) { await logAction(key, 'search_members', 'error', query, error.message); return json({ error: 'failed' }, 500) }
  await logAction(key, 'search_members', 'ok', query, `${(data ?? []).length} results`)
  return json({ members: data ?? [] })
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function handleCreateAsk(request: Request): Promise<Response> {
  const body = await readBody(request)
  const ask = text(body?.['ask'], 300)
  const key = await authorize(request, 'create_ask', ask.slice(0, 120))
  if (key instanceof Response) return key
  if (ask.length < 4) { await logAction(key, 'create_ask', 'invalid', '', 'Missing ask'); return json({ error: 'invalid', message: '`ask` is required (one sentence).' }, 400) }
  const visibility = body?.['visibility'] === 'private' ? 'private' : 'network'
  const urgency = ['low', 'medium', 'high'].includes(String(body?.['urgency'])) ? String(body?.['urgency']) : 'medium'
  const id = `ask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const { data, error } = await (await admin()).from('asks').insert({
    id, author_id: key.user_id, ask, detail: text(body?.['detail'], 2000), why_now: text(body?.['why_now'], 600),
    offer: text(body?.['offer'], 600), industry: text(body?.['industry'], 80), location: text(body?.['location'], 80),
    urgency, visibility, posted: 'Just now',
  }).select('id,ask,visibility,created_at').maybeSingle()
  if (error) { await logAction(key, 'create_ask', 'error', ask, error.message); return json({ error: 'failed', message: error.message }, 400) }
  await logAction(key, 'create_ask', 'ok', ask)
  return json({ ask: data }, 201)
}

export async function handleRequestIntro(request: Request): Promise<Response> {
  const body = await readBody(request)
  const memberId = text(body?.['member_id'], 40)
  const key = await authorize(request, 'request_intro', memberId)
  if (key instanceof Response) return key
  const why = {
    why_exists: text(body?.['why_exists'], 600), why_requester: text(body?.['why_requester'], 600),
    why_target: text(body?.['why_target'], 600), why_now: text(body?.['why_now'], 600),
  }
  const invalid = (message: string) => logAction(key, 'request_intro', 'invalid', memberId, message).then(() => json({ error: 'invalid', message }, 400))
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return invalid('`member_id` must be a member id from /api/agent/members.')
  if (memberId === key.user_id) return invalid('A member cannot request an introduction to themselves.')
  const missing = Object.entries(why).filter(([, v]) => v.length < 12).map(([k]) => k)
  if (missing.length) return invalid(`Every request carries a context capsule. Give a real reason (12+ characters) for: ${missing.join(', ')}.`)
  if (!(await rateHit(`intro:${key.id}`, DAY, key.intros_per_day))) {
    await logAction(key, 'request_intro', 'rate_limited', memberId, `Over ${key.intros_per_day} introduction requests per day`)
    return tooMany(DAY, `This key allows ${key.intros_per_day} introduction requests per day.`)
  }
  const db = await admin()
  const target = await db.from('profiles').select('id').eq('id', memberId).eq('onboarded', true).maybeSingle()
  if (!target.data) return invalid('No member with that id.')
  const existing = await db.from('intro_requests').select('id,status').eq('user_id', key.user_id).eq('member_id', memberId).maybeSingle()
  if (existing.data) {
    await logAction(key, 'request_intro', 'ok', memberId, 'Already requested; left unchanged')
    return json({ intro_request: existing.data, message: 'An introduction was already requested; it was left unchanged.' })
  }
  // The service client bypasses the consent guard's member checks, so set the requester-side state explicitly.
  const { data, error } = await db.from('intro_requests').insert({
    user_id: key.user_id, member_id: memberId, reason: why.why_exists, mutual_value: why.why_target,
    status: 'requested', requester_opt_in: true, member_opt_in: false,
  }).select('id,member_id,status,created_at').maybeSingle()
  if (error || !data) { await logAction(key, 'request_intro', 'error', memberId, error?.message ?? 'Insert failed'); return json({ error: 'failed' }, 500) }
  await db.from('intro_context_capsules').insert({ intro_request_id: data.id, ...why, first_goal: text(body?.['first_goal'], 400) })
  await db.from('entity_events').insert({
    entity_type: 'intro_request', entity_id: data.id, event: 'capsule_shared',
    summary: 'Introduction requested through an assistant key with a context capsule', detail: { via: 'agent_key', key_id: key.id }, source: 'ask-intros',
  })
  await logAction(key, 'request_intro', 'ok', memberId)
  return json({ intro_request: data, message: 'Requested. They review the context capsule before opting in; nothing is shared until both agree.' }, 201)
}

/* ------------------------------------------------------------------ inbound (outside agents) */

/** Same body for "delivered", "held", "policy off" and "no such member", so none can be told apart. */
export const RECEIVED = {
  status: 'received',
  message: 'Received. If this member accepts agent requests, it was screened against their policy. You will not be told whether they read it; if they accept, they will contact the requester by email.',
} as const

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

async function hashIp(ip: string): Promise<string> {
  const secret = (await getSetting('dispatch_secret')) || 'not-configured'
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(ip)))
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function handleInbound(request: Request): Promise<Response> {
  if (!(await rateHit(`ip:${await hashIp(clientIp(request))}`, HOUR, LIMITS.inboundPerIpHour)))
    return tooMany(HOUR, `At most ${LIMITS.inboundPerIpHour} requests per hour from one address.`)
  const body = await readBody(request)
  if (!body) return json({ status: 'rejected', errors: ['Send a JSON object (at most 20 KB). See /api/agent/manifest.'] }, 400)
  const parsed = parseInbound(body)
  if (!parsed.ok) return json({ status: 'rejected', errors: parsed.errors }, 400)
  const r = parsed.request
  if (!(await rateHit(`domain:${r.requester_domain}`, DAY, LIMITS.inboundPerDomainDay)))
    return tooMany(DAY, `At most ${LIMITS.inboundPerDomainDay} requests per day from one email domain.`)

  // Optional: an assistant acting for a verified Ask Intros member presents its key.
  let requester: AgentKeyInfo | null = null
  if (request.headers.get('authorization')) {
    requester = await keyFromRequest(request)
    if (!requester || !requester.verified || !requester.scopes.includes('request_intro'))
      return json({ status: 'rejected', errors: ['The assistant key is invalid, revoked, or lacks the request_intro permission.'] }, 401)
  }

  const textHash = await sha256Hex(normalizeForHash(r))
  const { data: ctx, error } = await (await admin()).rpc('agent_inbound_prepare', { p_handle: r.to, p_domain: r.requester_domain, p_text_hash: textHash })
  if (error) throw new Error(error.message)
  const c = ctx as { found: boolean; duplicates: number; member_id?: string; today_count?: number; domain_blocked?: boolean } & Partial<AgentPolicy>
  // Problems that are the sender's fault whoever the target is, reported the same way for every handle.
  const generic = genericRejections(r, c.duplicates)
  if (generic.length) {
    if (requester) await logAction(requester, 'inbound_request', 'denied', r.to, generic.join(' ').slice(0, 300))
    return json({ status: 'rejected', errors: generic }, 422)
  }
  const self = !!requester && requester.user_id === c.member_id
  if (!c.found || self) {
    if (requester) await logAction(requester, 'inbound_request', 'ok', r.to, 'Submitted')
    return json(RECEIVED, 202)
  }

  const policy: AgentPolicy = {
    mode: c.mode ?? 'off', welcome_topics: c.welcome_topics ?? [], refuse_topics: c.refuse_topics ?? [],
    min_context: c.min_context ?? 120, daily_cap: c.daily_cap ?? 5,
  }
  const result = screenRequest(r, policy, {
    duplicates: c.duplicates, todayCount: c.today_count ?? 0, domainBlocked: !!c.domain_blocked, requesterVerified: !!requester,
  })
  if (result.outcome === 'rejected') {
    if (requester) await logAction(requester, 'inbound_request', 'denied', r.to, result.reasons.join(' ').slice(0, 300))
    return json({ status: 'rejected', errors: result.reasons }, 422)
  }
  const { error: saveError } = await (await admin()).rpc('agent_inbound_record', {
    p_member: c.member_id, p_status: result.outcome, p_score: result.score, p_reasons: result.reasons,
    p: { ...r, requester_member: requester?.user_id ?? '', text_hash: textHash },
  })
  if (saveError) throw new Error(saveError.message)
  if (requester) await logAction(requester, 'inbound_request', 'ok', r.to, 'Submitted')
  return json(RECEIVED, 202)
}
