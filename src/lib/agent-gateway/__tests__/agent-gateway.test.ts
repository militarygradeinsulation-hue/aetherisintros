import { describe, expect, it } from 'vitest'

import { bearerKey, generateAgentKey, hashAgentKey, isAgentKey, keyPrefix, normalizeScopes } from '../keys'
import { retryAfterSeconds, windowStart } from '../rate-limit'
import { capsRatio, matchTopics, normalizeForHash, parseInbound, screenRequest, type AgentPolicy, type InboundRequest, type ScreenSignals } from '../screening'

describe('assistant keys', () => {
  it('generates distinct keys in the documented format', () => {
    const a = generateAgentKey()
    const b = generateAgentKey()
    expect(a).toMatch(/^ai_[A-Za-z0-9_-]{43}$/)
    expect(isAgentKey(a)).toBe(true)
    expect(a).not.toBe(b)
    expect(keyPrefix(a)).toMatch(/^ai_[A-Za-z0-9_-]{8}$/)
    expect(isAgentKey('ai_short')).toBe(false)
    expect(isAgentKey(`sk_${a.slice(3)}`)).toBe(false)
  })

  it('hashes with SHA-256 to lowercase hex, deterministically', async () => {
    expect(await hashAgentKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    const k = generateAgentKey()
    expect(await hashAgentKey(k)).toBe(await hashAgentKey(k))
    expect(await hashAgentKey(k)).not.toContain(k.slice(3, 20))
  })

  it('reads only well-formed bearer keys', () => {
    const k = generateAgentKey()
    expect(bearerKey(`Bearer ${k}`)).toBe(k)
    expect(bearerKey(`bearer ${k} `)).toBe(k)
    expect(bearerKey(k)).toBeNull()
    expect(bearerKey('Bearer eyJhbGciOi.jwt.token')).toBeNull()
    expect(bearerKey(null)).toBeNull()
  })

  it('keeps known scopes only, once, in order', () => {
    expect(normalizeScopes(['request_intro', 'search_members', 'send_email', 'search_members', 3])).toEqual(['search_members', 'request_intro'])
    expect(normalizeScopes('search_members')).toEqual([])
  })
})

describe('rate-limit windows', () => {
  it('aligns windows to the epoch', () => {
    const t = Date.UTC(2026, 9, 9, 10, 59, 59, 500)
    expect(windowStart(t, 3600).toISOString()).toBe('2026-10-09T10:00:00.000Z')
    expect(windowStart(t + 500, 3600).toISOString()).toBe('2026-10-09T11:00:00.000Z')
    expect(windowStart(t, 86400).toISOString()).toBe('2026-10-09T00:00:00.000Z')
  })

  it('tells the caller how long to wait', () => {
    const t = Date.UTC(2026, 9, 9, 10, 59, 59, 500)
    expect(retryAfterSeconds(t, 3600)).toBe(1)
    expect(retryAfterSeconds(Date.UTC(2026, 9, 9, 10, 0, 0), 3600)).toBe(3600)
    expect(retryAfterSeconds(Date.UTC(2026, 9, 9, 18, 0, 0), 86400)).toBe(6 * 3600)
  })
})

const body = {
  to: '@Bea-Ops',
  requester_name: 'Sam  Rivera',
  requester_company: 'Northwind Freight',
  requester_email: 'Sam@Northwind.example',
  on_behalf_of: 'Sam Rivera, COO',
  reason: 'Bea wrote about rising freight costs in logistics. We cut cross-border trucking costs 18% for two mid-size distributors this year and would value 20 minutes to compare notes.',
  offer: 'Our benchmark of 2026 lane rates for her region, free, whether or not she talks to us.',
  links: ['https://northwind.example/benchmark'],
}

const policy: AgentPolicy = { mode: 'everyone', welcome_topics: ['logistics', 'supply chain'], refuse_topics: ['crypto'], min_context: 120, daily_cap: 5 }
const signals: ScreenSignals = { duplicates: 0, todayCount: 0, domainBlocked: false, requesterVerified: false }
const req = (over: Partial<InboundRequest> = {}): InboundRequest => {
  const parsed = parseInbound(body)
  if (!parsed.ok) throw new Error(parsed.errors.join())
  return { ...parsed.request, ...over }
}

describe('inbound request parsing', () => {
  it('normalises a good request', () => {
    const r = req()
    expect(r.to).toBe('bea-ops')
    expect(r.requester_name).toBe('Sam Rivera')
    expect(r.requester_email).toBe('sam@northwind.example')
    expect(r.requester_domain).toBe('northwind.example')
  })

  it('reports every missing or invalid field', () => {
    const p = parseInbound({ to: 'x', requester_email: 'nope', links: ['ftp://a', 'b', 'c', 'd', 'e', 'f'] })
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.errors).toHaveLength(6)
    expect(parseInbound(null).ok).toBe(false)
  })

  it('treats case, spacing and punctuation as the same text for duplicates', () => {
    expect(normalizeForHash({ reason: 'Hello,  Bea!', offer: 'A Pilot.' })).toBe(normalizeForHash({ reason: 'hello bea', offer: 'a pilot' }))
  })
})

describe('screening', () => {
  it('delivers a specific, welcomed request', () => {
    const s = screenRequest(req(), policy, signals)
    expect(s.outcome).toBe('delivered')
    expect(s.reasons[0]).toContain('logistics')
  })

  it('never accepts anything when the policy is off', () => {
    expect(screenRequest(req(), { ...policy, mode: 'off' }, signals)).toEqual({ outcome: 'rejected', reasons: ['not_accepting'], score: 0 })
  })

  it('rejects blocked domains, unverified senders under verified-only, and over the daily cap', () => {
    expect(screenRequest(req(), policy, { ...signals, domainBlocked: true }).outcome).toBe('rejected')
    expect(screenRequest(req(), { ...policy, mode: 'verified_only' }, signals).outcome).toBe('rejected')
    expect(screenRequest(req(), { ...policy, mode: 'verified_only' }, { ...signals, requesterVerified: true }).outcome).toBe('delivered')
    expect(screenRequest(req(), policy, { ...signals, todayCount: 5 }).reasons[0]).toContain('daily limit')
  })

  it('rejects refused topics, thin context, shouting, duplicates and link floods', () => {
    expect(screenRequest(req({ offer: 'Also a crypto token allocation.' }), policy, signals).reasons[0]).toContain('topic')
    expect(screenRequest(req({ reason: 'Quick chat?', offer: '' }), policy, signals).reasons[0]).toContain('Not enough context')
    expect(screenRequest(req({ reason: body.reason.toUpperCase() }), policy, signals).reasons[0]).toContain('capitals')
    expect(screenRequest(req(), policy, { ...signals, duplicates: 1 }).reasons[0]).toContain('already sent')
    const flood = Array.from({ length: 5 }, (_, i) => `https://x.example/${i}`)
    expect(screenRequest(req({ links: flood, offer: 'see https://y.example' }), policy, signals).outcome).toBe('rejected')
  })

  it('holds requests that are off-topic or salesy for review instead of delivering', () => {
    expect(screenRequest(req(), { ...policy, welcome_topics: ['healthcare'] }, signals).outcome).toBe('held')
    const salesy = screenRequest(req({ offer: 'Guaranteed savings, act now — limited time pricing for logistics leaders.' }), policy, signals)
    expect(salesy.outcome).toBe('held')
    expect(salesy.reasons.join()).toContain('Sales language')
  })

  it('matches topics as whole words', () => {
    expect(matchTopics('We do AI for supply chain teams', ['ai', 'supply chain', 'chai'])).toEqual(['ai', 'supply chain'])
    expect(matchTopics('Retail', ['ai'])).toEqual([])
  })

  it('measures capitals only on real text', () => {
    expect(capsRatio('OK')).toBe(0)
    expect(capsRatio('THIS IS A VERY LOUD MESSAGE INDEED')).toBe(1)
  })
})

describe('manifest', () => {
  it('describes the inbound schema, scopes and limits with absolute URLs', async () => {
    const { agentManifest } = await import('../manifest')
    const m = agentManifest('https://askintros.example')
    expect(m.endpoints.inbound.url).toBe('https://askintros.example/api/agent/inbound')
    expect(m.endpoints.inbound.request_schema.required).toEqual(['to', 'requester_name', 'requester_email', 'reason'])
    expect(m.endpoints.assistant.scopes).toContain('request_intro')
    expect(m.rate_limits.inbound_per_ip_per_hour).toBe(10)
    expect(JSON.parse(JSON.stringify(m))).toEqual(m)
  })
})
