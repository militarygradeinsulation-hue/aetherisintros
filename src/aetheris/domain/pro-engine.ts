/**
 * Professional-layer reasoning. Pure functions only — no storage, no React.
 *
 * Every function returns its reasoning alongside its result so a surface can
 * always answer "why does this appear here", and nothing derived is presented
 * as recorded fact.
 */
import type { Member } from '../social'
import type { ID } from './models'
import type {
  BriefingItem, CapabilityProblem, CapitalProfile, ContextualReputation, ExpertiseOffer,
  InboxBucket, KnowledgeAsset, MarketplaceListing, PassportCredential,
  ProfessionalAvailability, ProfessionalBoundaryRule, ProfessionalInboxDecision,
  ProfessionalOpportunity, ProfessionalPassportProfile, ProfessionalReferral, ProofOfWorkEdge,
  ProofOfWorkNode, SearchObjectKind, SuggestedTeam, UniversalSearchResult,
} from './pro-models'

const today = () => new Date().toISOString().slice(0, 10)
const words = (q: string) => q.toLowerCase().split(/[^a-z0-9$+]+/).filter(w => w.length > 2)
const hit = (needles: string[], haystack: string) => {
  const text = haystack.toLowerCase()
  return needles.filter(n => text.includes(n))
}

/* ------------------------------------------------ 1. passport credibility */

export interface CredibilityReading {
  verified: number
  selfStated: number
  evidenceBacked: number
  score: number
  verdict: 'Evidence-backed' | 'Partly verified' | 'Mostly self-stated'
  reasoning: string
}

export function readCredibility(
  passport: ProfessionalPassportProfile | undefined,
  credentials: PassportCredential[],
  proofs: ProofOfWorkNode[],
): CredibilityReading {
  const verified = credentials.filter(c => c.state === 'verified').length
  const selfStated = credentials.filter(c => c.state !== 'verified').length
  const evidenceBacked = proofs.filter(p => p.evidence.trim().length > 0).length
  const identityWeight = passport?.identityState === 'verified' ? 22 : 6
  const score = Math.min(100, identityWeight + verified * 7 + evidenceBacked * 5 + (passport?.referencesVerified ?? 0) * 4)
  const verdict = score >= 70 ? 'Evidence-backed' : score >= 45 ? 'Partly verified' : 'Mostly self-stated'
  return {
    verified, selfStated, evidenceBacked, score, verdict,
    reasoning: `${verified} verified credential${verified === 1 ? '' : 's'}, ${evidenceBacked} proof node${evidenceBacked === 1 ? '' : 's'} with named evidence, ${passport?.referencesVerified ?? 0} verified reference${(passport?.referencesVerified ?? 0) === 1 ? '' : 's'}. ${selfStated} claim${selfStated === 1 ? '' : 's'} remain self-stated and are labelled as such.`,
  }
}

/* -------------------------------------------------- 2. proof-of-work graph */

export interface ProofGraphView {
  nodes: ProofOfWorkNode[]
  edges: ProofOfWorkEdge[]
  byKind: Array<{ kind: string; count: number }>
  answer: string
}

export function proofGraphFor(memberId: ID, nodes: ProofOfWorkNode[], edges: ProofOfWorkEdge[]): ProofGraphView {
  const mine = nodes.filter(n => n.memberIds.includes(memberId) || n.collaboratorIds.includes(memberId))
  const ids = new Set(mine.map(n => n.id))
  const linked = edges.filter(e => ids.has(e.fromId) || ids.has(e.toId))
  const counts = new Map<string, number>()
  mine.forEach(n => counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1))
  const byKind = [...counts.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count)
  const outcomes = mine.filter(n => n.kind === 'Outcome').length
  const projects = mine.filter(n => n.kind === 'Project' || n.kind === 'Company').length
  return {
    nodes: mine, edges: linked, byKind,
    answer: mine.length
      ? `${projects} piece${projects === 1 ? '' : 's'} of delivered work, ${outcomes} recorded outcome${outcomes === 1 ? '' : 's'}, connected by ${linked.length} relationship${linked.length === 1 ? '' : 's'} in the graph.`
      : 'No proof of work recorded yet. Claims on this profile are self-stated.',
  }
}

/* -------------------------------------------- 3. contextual reputation */

export function reputationsFor(memberId: ID, all: ContextualReputation[], viewerIsOwner: boolean) {
  return all
    .filter(r => r.memberId === memberId)
    .filter(r => viewerIsOwner || r.scope !== 'private')
    .sort((a, b) => b.confidence - a.confidence)
}

/* ---------------------------------------------- 4. opportunity matching */

export interface OpportunityFit {
  score: number
  why: string
  expired: boolean
  qualified: string[]
  missing: string[]
}

export function scoreOpportunity(
  opp: ProfessionalOpportunity,
  ctx: { me: { industries: string[]; expertise: string[] }; connections: ID[]; reputations: ContextualReputation[] },
): OpportunityFit {
  const expired = opp.expiresOn < today() || opp.status === 'expired'
  const text = `${opp.title} ${opp.objective} ${opp.whoItIsFor} ${opp.qualification.join(' ')}`.toLowerCase()
  const industryHits = ctx.me.industries.filter(i => text.includes(i.toLowerCase()))
  const expertiseHits = ctx.me.expertise.filter(e => text.includes(e.toLowerCase()))
  const known = ctx.connections.includes(opp.ownerId)
  const repHits = ctx.reputations.filter(r => text.includes(r.context.toLowerCase().split(' ')[0] ?? '~'))
  let score = 20
  score += industryHits.length * 12
  score += expertiseHits.length * 14
  score += known ? 18 : 0
  score += repHits.length * 8
  score += opp.evidence.length ? 6 : 0
  if (expired) score = Math.round(score * 0.25)
  const qualified = [...industryHits, ...expertiseHits].slice(0, 3)
  const missing = opp.qualification.filter(q => !hit(words(`${ctx.me.expertise.join(' ')} ${ctx.me.industries.join(' ')}`), q).length).slice(0, 2)
  const parts: string[] = []
  if (known) parts.push('you already have a relationship with the person who posted it')
  if (industryHits.length) parts.push(`it sits in ${industryHits.join(' and ')}`)
  if (expertiseHits.length) parts.push(`it asks for ${expertiseHits.join(' and ')}`)
  if (opp.evidence.length) parts.push('the objective carries named evidence')
  if (expired) parts.push('it has expired, so it no longer drives matching until it is renewed')
  return {
    score: Math.max(4, Math.min(100, score)), expired, qualified, missing,
    why: parts.length ? `Shown because ${parts.join(', ')}.` : 'Shown because it is open to the network and nothing disqualifies you.',
  }
}

/* ----------------------------------------------- 6. expertise matching */

export function scoreExpertise(offer: ExpertiseOffer, need: string) {
  const needles = words(need)
  const matches = hit(needles, `${offer.topic} ${offer.offer} ${offer.industries.join(' ')} ${offer.audience}`)
  return {
    score: Math.min(100, 20 + matches.length * 22),
    why: matches.length
      ? `Matches on ${[...new Set(matches)].slice(0, 3).join(', ')}, and the offer is bounded so nobody is agreeing to an open-ended commitment.`
      : 'No direct keyword match; shown because the audience overlaps with your work.',
  }
}

/* ------------------------------------------------ 9 + 10. team builder */

export function buildTeam(
  problem: CapabilityProblem,
  ctx: {
    members: Member[]
    reputations: ContextualReputation[]
    proofs: ProofOfWorkNode[]
    availability: ProfessionalAvailability[]
    referrals: ProfessionalReferral[]
    connections: ID[]
  },
): SuggestedTeam {
  const needle = words(`${problem.title} ${problem.problem} ${problem.whatGoodLooksLike} ${problem.industries.join(' ')}`)
  const scored = ctx.members.map(m => {
    const reps = ctx.reputations.filter(r => r.memberId === m.id)
    const proofs = ctx.proofs.filter(p => p.memberIds.includes(m.id))
    const refs = ctx.referrals.filter(r => r.refereeId === m.id)
    const avail = ctx.availability.filter(a => a.memberId === m.id && a.active)
    const text = `${m.title} ${m.company} ${m.industry} ${m.expertise.join(' ')} ${m.offers.join(' ')} ${reps.map(r => `${r.context} ${r.bestFor}`).join(' ')} ${proofs.map(p => p.label).join(' ')}`
    const matches = [...new Set(hit(needle, text))]
    const score = matches.length * 12 + proofs.length * 6 + refs.length * 5 + (avail.length ? 6 : 0) + (ctx.connections.includes(m.id) ? 8 : 0)
    const reason = [
      matches.length ? `matches on ${matches.slice(0, 3).join(', ')}` : '',
      proofs.length ? `${proofs.length} proof node${proofs.length === 1 ? '' : 's'} in the graph` : '',
      refs.length ? `${refs.length} referral${refs.length === 1 ? '' : 's'} on record` : '',
      avail.length ? `available: ${avail[0]!.status.toLowerCase()}` : '',
    ].filter(Boolean).join(', ')
    return { m, score, reason, proofs, reps }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)

  const roleFor = (index: number, member: Member) => {
    if (index === 0) return member.role === 'Investor' ? 'Capital perspective' : 'Lead operator'
    if (index === 1) return 'Domain advisor'
    if (index === 2) return 'Specialist'
    return 'Connector'
  }
  const picked = scored.slice(0, Math.min(4, Math.max(2, problem.paths.length)))
  return {
    id: `st-${Date.now().toString(36)}`,
    problemId: problem.id,
    objective: problem.title,
    roles: picked.map((p, i) => ({
      memberId: p.m.id,
      role: roleFor(i, p.m),
      why: p.reason ? `Belongs here because ${p.reason}.` : 'Belongs here on adjacency to the problem.',
      path: problem.paths[Math.min(i, problem.paths.length - 1)] ?? 'Advisor',
      proofNodeIds: p.proofs.map(n => n.id).slice(0, 3),
    })),
    systemIds: problem.systemIds,
    circleIds: [],
    strongestPath: picked.some(p => ctx.connections.includes(p.m.id))
      ? `Strongest path: ${picked.find(p => ctx.connections.includes(p.m.id))!.m.name} is a direct relationship, so the first conversation needs no introduction.`
      : 'No direct relationship yet. The first move is a warm path, not a cold message.',
    saved: false, invited: [], createdAt: today(),
  }
}

/* ----------------------------------------------------- 11. capital fit */

export interface CapitalFit {
  score: number
  aligned: string[]
  gaps: string[]
  verdict: 'Thesis and timing align' | 'Partial alignment' | 'Not a fit right now'
  guidance: string
}

export function capitalFit(investor: CapitalProfile, company: CapitalProfile): CapitalFit {
  const aligned: string[] = []
  const gaps: string[] = []
  const sectors = company.sectors.filter(s => investor.sectors.some(i => i.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(i.toLowerCase())))
  if (sectors.length) aligned.push(`Sector: ${sectors.join(', ')}`); else gaps.push('Sector sits outside the stated thesis')
  const stages = company.stages.filter(s => investor.stages.includes(s))
  if (stages.length) aligned.push(`Stage: ${stages.join(', ')}`); else gaps.push('Stage does not match the investor mandate')
  if (investor.openness === 'Open now') aligned.push('Investor is deploying now')
  else if (investor.openness === 'Selective') aligned.push('Investor is selective; the ask must be pre-qualified')
  else gaps.push('Investor is closed for now')
  if (company.openness === 'Open now') aligned.push('Round is open')
  else gaps.push('Company is not actively raising')
  if (company.traction && investor.tractionExpectation) aligned.push('Traction is stated and checkable against the expectation')
  const excluded = investor.exclusions.filter(x => company.sectors.some(s => s.toLowerCase().includes(x.toLowerCase())))
  if (excluded.length) gaps.push(`Explicit exclusion: ${excluded.join(', ')}`)
  const score = Math.max(0, Math.min(100, aligned.length * 18 - gaps.length * 16))
  const verdict = score >= 60 ? 'Thesis and timing align' : score >= 35 ? 'Partial alignment' : 'Not a fit right now'
  return {
    score, aligned, gaps, verdict,
    guidance: verdict === 'Thesis and timing align'
      ? `Warm path first: ${investor.introPreference}`
      : verdict === 'Partial alignment'
        ? 'Do not pitch yet. Close the gap or ask a question instead of asking for a meeting.'
        : 'No pitch. A pitch here costs the relationship and produces nothing.',
  }
}

/* -------------------------------- 20 + 21. permission and boundaries */

export interface BoundaryVerdict {
  allowed: boolean
  requiresPermission: boolean
  rerouteTo?: string
  rule?: ProfessionalBoundaryRule
  explanation: string
}

export function checkBoundaries(
  category: string,
  ctx: { recipientId: ID; rules: ProfessionalBoundaryRule[]; warmPath: boolean; availability: ProfessionalAvailability[] },
): BoundaryVerdict {
  const rules = ctx.rules.filter(r => r.memberId === ctx.recipientId && r.active)
  const rule = rules.find(r => r.category.toLowerCase() === category.toLowerCase())
    ?? rules.find(r => r.category === 'Any outreach')
    ?? (ctx.warmPath ? undefined : rules.find(r => r.category === 'Unknown path'))
  const noSales = ctx.availability.some(a => a.memberId === ctx.recipientId && a.active && a.status === 'Not accepting sales outreach')
  if (!rule && noSales && /vendor|sales|software|demo/i.test(category)) {
    return { allowed: false, requiresPermission: true, explanation: 'This member has declared that they are not accepting sales outreach. A permission request with evidence is the only route.' }
  }
  if (!rule) return { allowed: true, requiresPermission: false, explanation: 'No boundary applies. Ordinary professional conversation passes untouched.' }
  if (rule.action === 'block') {
    return { allowed: false, requiresPermission: false, rule, explanation: `Blocked by a professional boundary in the ${rule.category.toLowerCase()} category. ${rule.explanation}` }
  }
  if (rule.action === 'reroute') {
    return { allowed: false, requiresPermission: false, rule, ...(rule.rerouteTo ? { rerouteTo: rule.rerouteTo } : {}), explanation: `Rerouted rather than delivered. ${rule.explanation}` }
  }
  return { allowed: false, requiresPermission: true, rule, explanation: `This category needs permission before it reaches the member. ${rule.explanation}` }
}

export function pitchReadiness(input: {
  category: string; reason: string; whyRelevant: string; valueToRecipient: string; whyNow: string; warmPath?: string; evidence: string[]
}) {
  const missing: string[] = []
  if (input.reason.trim().length < 12) missing.push('a plain reason for the request')
  if (input.whyRelevant.trim().length < 12) missing.push('why it is relevant to them specifically')
  if (input.valueToRecipient.trim().length < 12) missing.push('what they get out of it')
  if (input.whyNow.trim().length < 8) missing.push('why now rather than later')
  if (!input.evidence.length) missing.push('one piece of evidence')
  return {
    ready: missing.length === 0,
    missing,
    note: missing.length
      ? `This request is not ready to send. Add ${missing.join(', ')}.`
      : input.warmPath
        ? 'Ready. A warm path exists, which materially raises the odds of a yes.'
        : 'Ready. There is no warm path, so the relevance and the evidence carry the request.',
  }
}

/* ------------------------------------------- 22. universal search */

export interface SearchCorpusItem {
  id: ID
  kind: SearchObjectKind
  label: string
  sub: string
  text: string
  memberId?: ID
  targetPage?: string
  targetId?: ID
  scope: 'private' | 'team' | 'organization' | 'shareable' | 'public'
  blockedBy?: string
}

export function universalSearch(query: string, corpus: SearchCorpusItem[], limit = 24): UniversalSearchResult[] {
  const needles = words(query)
  if (!needles.length) return []
  return corpus
    .map(item => {
      const matches = [...new Set(hit(needles, `${item.label} ${item.sub} ${item.text}`))]
      const labelBoost = hit(needles, item.label).length * 8
      const score = matches.length * 14 + labelBoost + (item.scope === 'public' ? 4 : 0)
      return {
        id: item.id, kind: item.kind, label: item.label, sub: item.sub,
        score,
        why: matches.length
          ? `Matched on ${matches.slice(0, 4).join(', ')}${item.blockedBy ? '' : '.'}${item.blockedBy ? ` — but ${item.blockedBy}.` : ''}`
          : '',
        ...(item.memberId ? { memberId: item.memberId } : {}),
        ...(item.targetPage ? { targetPage: item.targetPage } : {}),
        ...(item.targetId ? { targetId: item.targetId } : {}),
        ...(item.blockedBy ? { blockedBy: item.blockedBy } : {}),
        scope: item.scope,
      } as UniversalSearchResult
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/* ------------------------------------------------ 25. inbox buckets */

export const bucketOrder: InboxBucket[] = ['DECIDE', 'RESPOND', 'MOVE', 'WAIT', 'FYI']

export const bucketMeaning: Record<InboxBucket, string> = {
  DECIDE: 'A decision is waiting on you. Nothing moves until you make it.',
  RESPOND: 'A person is waiting on words from you.',
  MOVE: 'Nobody is blocked, but this is where the value is this week.',
  WAIT: 'Correctly waiting on someone else. No action from you.',
  FYI: 'Worth knowing. Requires nothing.',
}

export function groupInbox(items: ProfessionalInboxDecision[]) {
  return bucketOrder.map(bucket => ({
    bucket,
    meaning: bucketMeaning[bucket],
    items: items.filter(i => i.bucket === bucket && i.state !== 'dismissed'),
  }))
}

/* ----------------------------------------- 27. marketplace ranking */

export function rankMarketplace(
  listings: MarketplaceListing[],
  ctx: { connections: ID[]; reputations: ContextualReputation[]; referrals: ProfessionalReferral[]; availability: ProfessionalAvailability[]; need?: string },
) {
  const needles = ctx.need ? words(ctx.need) : []
  return listings.map(listing => {
    const direct = ctx.connections.includes(listing.memberId)
    const reps = ctx.reputations.filter(r => r.memberId === listing.memberId)
    const refs = ctx.referrals.filter(r => r.refereeId === listing.memberId && r.shareable)
    const avail = ctx.availability.find(a => a.id === listing.availabilityId && a.active)
    const matches = needles.length ? [...new Set(hit(needles, `${listing.headline} ${listing.offer} ${listing.industries.join(' ')}`))] : []
    const score = (direct ? 26 : 0) + refs.length * 12 + listing.proofNodeIds.length * 7 + listing.outcomesCreated * 5 + (avail ? 8 : 0) + matches.length * 10
    const reasons = [
      direct ? 'you have a direct relationship' : 'reached through a shared connection',
      refs.length ? `${refs.length} shareable referral${refs.length === 1 ? '' : 's'}` : '',
      listing.proofNodeIds.length ? `${listing.proofNodeIds.length} proof node${listing.proofNodeIds.length === 1 ? '' : 's'}` : '',
      listing.outcomesCreated ? `${listing.outcomesCreated} recorded outcome${listing.outcomesCreated === 1 ? '' : 's'}` : '',
      avail ? `available now (${avail.status.toLowerCase()})` : '',
      matches.length ? `matches your need on ${matches.slice(0, 2).join(', ')}` : '',
      reps.length ? `contextual reputation in ${reps[0]!.context.toLowerCase()}` : '',
    ].filter(Boolean)
    return {
      listing, score,
      why: `Appears here because ${reasons.join(', ')}. Ranking is never paid for.`,
    }
  }).sort((a, b) => b.score - a.score)
}

/* ------------------------------------------------- 15. briefing mode */

export function composeBriefing(ctx: {
  decisions: ProfessionalInboxDecision[]
  opportunities: ProfessionalOpportunity[]
  knowledge: KnowledgeAsset[]
  problems: CapabilityProblem[]
  members: Member[]
  travelCity?: string
  eventName?: string
  collisions?: Array<{ headline: string; why: string }>
  openLoops?: Array<{ label: string; who: string }>
  strategyNote?: string
}): BriefingItem[] {
  const items: BriefingItem[] = []
  const nameOf = (id?: ID) => ctx.members.find(m => m.id === id)?.name ?? ''

  ctx.decisions.filter(d => d.bucket === 'DECIDE' && d.state === 'open').forEach((d, i) => items.push({
    kind: 'Attention', headline: d.headline, detail: d.detail, why: d.consequence,
    ...(d.memberId ? { memberId: d.memberId } : {}),
    ...(d.targetPage ? { targetPage: d.targetPage } : {}),
    ...(d.targetId ? { targetId: d.targetId } : {}),
    priority: 100 - i,
  }))

  const live = ctx.opportunities.filter(o => o.status !== 'expired' && o.expiresOn >= today())
  live.slice(0, 3).forEach((o, i) => items.push({
    kind: 'Opportunities', headline: o.title, detail: o.objective,
    why: `${o.kind} from ${nameOf(o.ownerId) || 'a member'}. Closes ${o.expiresOn}.`,
    targetPage: 'opportunities', targetId: o.id, priority: 80 - i,
  }))

  ;(ctx.collisions ?? []).slice(0, 2).forEach((c, i) => items.push({
    kind: 'Collisions', headline: c.headline, detail: c.why, why: 'Two things in your network became relevant to each other.',
    targetPage: 'collisions', priority: 74 - i,
  }))

  ctx.problems.filter(p => p.status === 'open').slice(0, 2).forEach((p, i) => items.push({
    kind: 'People you can help', headline: `${nameOf(p.ownerId) || 'A member'} needs ${p.kind.toLowerCase()}`,
    detail: p.title, why: 'You can give before you ask here.',
    ...(p.ownerId ? { memberId: p.ownerId } : {}),
    targetPage: 'talent', targetId: p.id, priority: 68 - i,
  }))

  ;(ctx.openLoops ?? []).slice(0, 3).forEach((l, i) => items.push({
    kind: 'Open loops', headline: l.label, detail: `Owed to ${l.who}.`, why: 'An unclosed loop costs more trust than a slow answer.',
    targetPage: 'loops', priority: 60 - i,
  }))

  if (ctx.travelCity) items.push({
    kind: 'Travel and events', headline: `You are in ${ctx.travelCity} soon`,
    detail: 'A short meeting plan is ready. Two or three people, not twenty.',
    why: 'Geography is a timing signal, not a reason to meet everyone.',
    targetPage: 'travel', priority: 56,
  })
  if (ctx.eventName) items.push({
    kind: 'Travel and events', headline: ctx.eventName,
    detail: 'Roster, mutual context and available warm introductions are prepared.',
    why: 'Walking in prepared is the whole point of event mode.',
    targetPage: 'eventpresence', priority: 55,
  })

  ctx.knowledge.slice(0, 2).forEach((k, i) => items.push({
    kind: 'Knowledge', headline: k.title, detail: k.summary,
    why: `${k.provenance} from ${nameOf(k.authorId) || 'a member you trust'}.`,
    ...(k.authorId ? { memberId: k.authorId } : {}),
    targetPage: 'knowledgeassets', targetId: k.id, priority: 48 - i,
  }))

  if (ctx.strategyNote) items.push({
    kind: 'Strategy', headline: 'Strategy progress', detail: ctx.strategyNote,
    why: 'Movement against your own plan, not activity for its own sake.',
    targetPage: 'strategy', priority: 40,
  })

  ctx.decisions.filter(d => d.bucket === 'WAIT').slice(0, 2).forEach((d, i) => items.push({
    kind: 'Meetings', headline: d.headline, detail: d.detail, why: d.consequence,
    ...(d.targetPage ? { targetPage: d.targetPage } : {}),
    priority: 30 - i,
  }))

  return items.sort((a, b) => b.priority - a.priority)
}

/* ------------------------------------------- 24. vault export payload */

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return ''
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]
  const cell = (v: unknown) => {
    const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map(r => keys.map(k => cell(r[k])).join(','))].join('\n')
}
