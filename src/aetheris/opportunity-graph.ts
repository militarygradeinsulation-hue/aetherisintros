/**
 * Opportunity Graph — a deterministic, typed projection over the canonical
 * records already held by Ask Intros (members, relationships, Signals,
 * threads, CRM activity/tasks/opportunities, missions, intro feedback).
 *
 * No AI is required. Every output carries the evidence used to produce it,
 * and nothing here invents a score, outcome or relationship.
 */
import type { Member, NetworkAsk, Thread } from './social'
import type { CrmActivity, CrmOpportunity, CrmPerson, CrmTask } from './crm/types'

/* ───────────────────────── shared types ───────────────────────── */

export const MISSION_TYPES = ['customers', 'partnership', 'capital', 'hiring', 'acquisition', 'market_entry', 'vendor', 'advisor', 'board', 'custom'] as const
export type MissionType = typeof MISSION_TYPES[number]
export const missionTypeLabel: Record<MissionType, string> = {
  customers: 'Customers', partnership: 'Partnership', capital: 'Capital', hiring: 'Hiring', acquisition: 'Acquisition',
  market_entry: 'Market entry', vendor: 'Vendor', advisor: 'Advisor', board: 'Board', custom: 'Custom',
}

export interface Mission {
  id: string
  title: string
  objective: string
  missionType: MissionType
  targetCompany: string
  targetIndustry: string
  targetGeography: string
  targetDate: string | null
  horizon: string
  privacy: 'private' | 'trusted' | 'network'
  status: 'active' | 'paused' | 'completed'
  successDefinition: string
  linkedOpportunityId: string | null
  linkedCompanyId: string | null
  linkedAskId: string | null
  createdAt: string
  updatedAt: string
}

export const INTENT_CATEGORIES = ['LOOKING FOR', 'OFFERING', 'PARTNERSHIP', 'CAPITAL', 'TALENT', 'ACQUISITION', 'CUSTOMER', 'VENDOR', 'ADVISOR', 'BOARD', 'QUESTION', 'OPPORTUNITY'] as const
export type IntentCategory = typeof INTENT_CATEGORIES[number]
export type IntentPrivacy = 'private' | 'trusted' | 'network' | 'shareable'

export interface FeedbackRecord {
  id: string
  introRequestId: string | null
  memberId: string
  connectorName: string
  relevant: boolean | null
  contextAccurate: boolean | null
  wouldTakeAgain: boolean | null
  outcomeCategory: string
  shareable: boolean
  createdAt: string
}

export interface GraphInputs {
  me: { name: string; offers: string[]; expertise: string[]; industries: string[]; location: string; openTo: string[]; whatIDo: string }
  members: Member[]
  connections: string[]
  threads: Thread[]
  asks: NetworkAsk[]
  crm: { people: CrmPerson[]; activities: CrmActivity[]; tasks: CrmTask[]; opportunities: CrmOpportunity[]; personForMember: (id: string) => CrmPerson | undefined }
  missions: Mission[]
  feedback: FeedbackRecord[]
  strainedConnectors: string[]
  verifiedIds: Set<string>
}

/* ───────────────────────── text helpers ───────────────────────── */

const STOP = new Set(['the', 'and', 'for', 'with', 'who', 'our', 'your', 'you', 'that', 'this', 'are', 'from', 'into', 'about', 'help', 'need', 'looking', 'someone', 'people', 'can', 'want', 'have', 'will', 'more', 'than', 'their', 'them'])
export function tokens(value: string): string[] {
  return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !STOP.has(word)))]
}
function overlap(a: string[], b: string[]) {
  const set = new Set(b)
  return a.filter(word => set.has(word))
}
export const splitList = (value: string) => value.split(/[,;·\n]+/).map(item => item.trim()).filter(Boolean)
const DAY = 86400000
const daysSince = (iso: string | null | undefined) => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY)) : null
const memberText = (m: Member) => `${m.title} ${m.company} ${m.industry} ${m.location} ${m.role} ${m.expertise.join(' ')} ${m.needs.join(' ')} ${m.offers.join(' ')} ${m.focus} ${m.whatIDo ?? ''} ${m.building ?? ''}`

export function activeMission(missions: Mission[]) {
  return missions.find(mission => mission.status === 'active')
}

/* ───────────────────────── mission fit ───────────────────────── */

const missionRoleHints: Partial<Record<MissionType, RegExp>> = {
  capital: /investor|partner|fund|capital|venture|equity/i,
  hiring: /talent|recruit|people|hr|operator|chief/i,
  advisor: /advisor|mentor|board|former/i,
  board: /board|director|chair|former ceo/i,
  customers: /ceo|coo|owner|founder|president|head|vp/i,
  partnership: /partner|alliances|ceo|founder|business development/i,
  acquisition: /m&a|acquisition|corporate development|private equity|owner/i,
  vendor: /service|agency|consult|vendor|supplier/i,
  market_entry: /regional|country|market|expansion|general manager/i,
}

export interface Reason { label: string; evidence: string; weight: number }

export function missionFit(member: Member, mission: Mission | undefined): { score: number; reasons: Reason[] } {
  if (!mission) return { score: 0, reasons: [] }
  const reasons: Reason[] = []
  const missionWords = tokens(`${mission.title} ${mission.objective} ${mission.successDefinition}`)
  const shared = overlap(missionWords, tokens(memberText(member)))
  if (shared.length) reasons.push({ label: 'Mission language', evidence: `Profile mentions ${shared.slice(0, 3).join(', ')}`, weight: Math.min(30, shared.length * 10) })
  if (mission.targetIndustry && member.industry.toLowerCase().includes(mission.targetIndustry.toLowerCase())) reasons.push({ label: 'Target industry', evidence: member.industry, weight: 15 })
  if (mission.targetGeography && member.location.toLowerCase().includes(mission.targetGeography.toLowerCase())) reasons.push({ label: 'Target geography', evidence: member.location, weight: 10 })
  if (mission.targetCompany && member.company.toLowerCase().includes(mission.targetCompany.toLowerCase())) reasons.push({ label: 'Target company', evidence: member.company, weight: 25 })
  const hint = missionRoleHints[mission.missionType]
  if (hint && hint.test(`${member.title} ${member.role}`)) reasons.push({ label: 'Role relevance', evidence: `${member.title} fits a ${missionTypeLabel[mission.missionType].toLowerCase()} mission`, weight: 10 })
  return { score: reasons.reduce((sum, reason) => sum + reason.weight, 0), reasons }
}

/* ───────────────────────── relationship weather ───────────────────────── */

export const WEATHER_STATES = ['NEW', 'WARMING', 'MOMENTUM', 'STEADY', 'QUIET', 'AT RISK', 'OPPORTUNITY WINDOW'] as const
export type WeatherState = typeof WEATHER_STATES[number]
export interface Weather { state: WeatherState; evidence: string[] }

export function relationshipWeather(member: Member, g: GraphInputs): Weather {
  const crm = g.crm.personForMember(member.id)
  const evidence: string[] = []
  const activities = crm ? g.crm.activities.filter(item => item.personId === crm.id) : []
  const recent14 = activities.filter(item => (daysSince(item.occurredAt) ?? 999) <= 14).length
  const recent30 = activities.filter(item => (daysSince(item.occurredAt) ?? 999) <= 30).length
  const thread = g.threads.find(item => item.memberId === member.id)
  const lastMessage = thread?.messages[thread.messages.length - 1]
  const unanswered = lastMessage?.from === 'them'
  const openTasks = crm ? g.crm.tasks.filter(task => task.personId === crm.id && task.status !== 'done' && task.status !== 'cancelled') : []
  const overdue = openTasks.filter(task => task.dueAt && new Date(task.dueAt).getTime() < Date.now())
  const openOpps = crm ? g.crm.opportunities.filter(item => item.personId === crm.id && !item.archived && item.status === 'open') : []
  const theirAsk = g.asks.find(ask => ask.memberId === member.id)
  const fit = missionFit(member, activeMission(g.missions))
  const lastDays = crm?.lastActivityAt ? daysSince(crm.lastActivityAt) : (member.lastInteractionDays || null)
  const connected = g.connections.includes(member.id)

  if (lastDays !== null) evidence.push(`Last recorded interaction ${lastDays === 0 ? 'today' : `${lastDays} days ago`}`)
  if (recent30) evidence.push(`${recent30} logged ${recent30 === 1 ? 'activity' : 'activities'} in the last 30 days`)
  if (thread) evidence.push(`${thread.messages.length} messages in your conversation${unanswered ? ' · their last message is unanswered' : ''}`)
  if (openTasks.length) evidence.push(`${openTasks.length} open ${openTasks.length === 1 ? 'promise/task' : 'promises/tasks'}${overdue.length ? `, ${overdue.length} overdue` : ''}`)
  if (openOpps.length) evidence.push(`${openOpps.length} active shared ${openOpps.length === 1 ? 'opportunity' : 'opportunities'}`)
  if (theirAsk) evidence.push(`Active Signal: “${theirAsk.ask}”`)
  if (fit.score >= 20) evidence.push(`Relevant to your active mission (${fit.reasons.map(r => r.label.toLowerCase()).join(', ')})`)

  let state: WeatherState
  if (openOpps.length && (theirAsk || fit.score >= 20)) state = 'OPPORTUNITY WINDOW'
  else if ((unanswered && (lastDays ?? 0) >= 3) || overdue.length) state = 'AT RISK'
  else if (!connected && !thread && !activities.length && lastDays === null) state = 'NEW'
  else if (recent14 >= 3) state = 'MOMENTUM'
  else if (recent30 >= 1 && activities.length <= 3) state = 'WARMING'
  else if (lastDays !== null && lastDays <= 60) state = 'STEADY'
  else if (lastDays !== null && lastDays > 180 && member.score.relationshipStrength >= 65) state = 'AT RISK'
  else if (theirAsk && fit.score >= 20) state = 'OPPORTUNITY WINDOW'
  else state = lastDays === null && !connected ? 'NEW' : 'QUIET'
  if (!evidence.length) evidence.push('No interactions, messages, tasks or Signals are recorded for this relationship yet.')
  return { state, evidence }
}

/* ───────────────────────── trust capital ───────────────────────── */

export interface TrustDimension { key: string; label: string; status: 'evidenced' | 'insufficient'; evidence: string; privateSource: boolean }

export function trustDimensions(member: Member, g: GraphInputs, extras: { verified: boolean; approvedRecommendations: number }): TrustDimension[] {
  const crm = g.crm.personForMember(member.id)
  const thread = g.threads.find(item => item.memberId === member.id)
  const fromThem = thread?.messages.filter(m => m.from === 'them').length ?? 0
  const fromMe = thread?.messages.filter(m => m.from === 'me').length ?? 0
  const tasks = crm ? g.crm.tasks.filter(task => task.personId === crm.id) : []
  const done = tasks.filter(task => task.status === 'done').length
  const asConnector = g.feedback.filter(item => item.connectorName && item.connectorName.toLowerCase() === member.name.toLowerCase())
  const againYes = asConnector.filter(item => item.wouldTakeAgain === true).length
  const outcomes = g.feedback.filter(item => item.memberId === member.id && item.outcomeCategory !== 'no_outcome')
  const wonOpps = crm ? g.crm.opportunities.filter(item => item.personId === crm.id && item.status === 'won').length : 0
  const dim = (key: string, label: string, ok: boolean, evidence: string, privateSource: boolean): TrustDimension =>
    ({ key, label, status: ok ? 'evidenced' : 'insufficient', evidence: ok ? evidence : 'Not enough evidence', privateSource })
  return [
    dim('identity', 'VERIFIED IDENTITY', extras.verified, 'Identity and controlling role reviewed by Ask Intros.', false),
    dim('commitments', 'KEEPS COMMITMENTS', tasks.length >= 2, `${done} of ${tasks.length} recorded commitments completed.`, true),
    dim('intros', 'USEFUL INTRODUCTIONS', asConnector.length >= 1, `${againYes} of ${asConnector.length} of your recorded intros through them you would take again.`, true),
    dim('responsiveness', 'RESPONSIVENESS TO QUALIFIED REQUESTS', fromMe >= 1 && fromThem >= 1, `${fromThem} replies recorded to ${fromMe} of your messages.`, true),
    dim('reciprocity', 'RECIPROCITY', fromMe >= 2 && fromThem >= 2, 'Value has moved both ways in your recorded conversation.', true),
    dim('outcomes', 'RECORDED OUTCOMES', outcomes.length + wonOpps >= 1, `${outcomes.length + wonOpps} recorded outcome${outcomes.length + wonOpps === 1 ? '' : 's'}.`, true),
    dim('expertise', 'VERIFIED EXPERTISE / PROOF', extras.approvedRecommendations >= 1, `${extras.approvedRecommendations} approved recommendation${extras.approvedRecommendations === 1 ? '' : 's'} displayed by the member.`, false),
  ]
}

/* ───────────────────────── opportunity routing ───────────────────────── */

export interface RoutePath {
  hops: Member[]            // intermediaries in order (empty = direct)
  labels: string[]          // You → A → B → Target
  score: number
  reasons: Reason[]
  recorded: boolean         // true when the path comes from recorded mutuals/connections
}
export interface Route {
  target: Member
  best: RoutePath | null
  alternatives: RoutePath[]
  whoAsksFirst: string
  safeContext: string[]
  excluded: string[]
}

export function routeTo(target: Member, g: GraphInputs): Route {
  const byName = new Map(g.members.map(m => [m.name.toLowerCase(), m]))
  const knows = (a: Member, b: Member) =>
    a.mutuals.some(n => n.toLowerCase() === b.name.toLowerCase()) || b.mutuals.some(n => n.toLowerCase() === a.name.toLowerCase())
  const mine = g.members.filter(m => g.connections.includes(m.id) && m.id !== target.id)
  const paths: RoutePath[] = []
  const scorePath = (hops: Member[]): RoutePath => {
    const reasons: Reason[] = [{ label: 'Directness', evidence: hops.length === 0 ? 'You are already connected' : `${hops.length + 1} steps`, weight: 60 - hops.length * 20 }]
    hops.forEach(hop => {
      reasons.push({ label: 'Relationship strength', evidence: `${hop.name}: ${hop.score.relationshipStrength}/100 recorded strength`, weight: Math.round(hop.score.relationshipStrength * 0.15) })
      if (hop.lastInteractionDays && hop.lastInteractionDays <= 60) reasons.push({ label: 'Recency', evidence: `You spoke with ${hop.name} ${hop.lastInteractionDays} days ago`, weight: 10 })
      const fb = g.feedback.filter(f => f.connectorName.toLowerCase() === hop.name.toLowerCase())
      if (fb.length) {
        const good = fb.filter(f => f.wouldTakeAgain).length
        reasons.push({ label: 'Intro history', evidence: `${good}/${fb.length} past intros via ${hop.name} rated worth repeating`, weight: good * 8 - (fb.length - good) * 12 })
      }
      if (g.strainedConnectors.some(n => n.toLowerCase() === hop.name.toLowerCase())) reasons.push({ label: 'Trust budget', evidence: `${hop.name} has carried several asks recently`, weight: -15 })
      if (/connector|advisor|investor/i.test(hop.role)) reasons.push({ label: 'Role relevance', evidence: `${hop.name} is a ${hop.role.toLowerCase()}`, weight: 5 })
      if ((hop.openTo ?? []).length) reasons.push({ label: 'Open To', evidence: `${hop.name} is open to: ${(hop.openTo ?? []).slice(0, 2).join(', ')}`, weight: 3 })
    })
    return { hops, labels: ['You', ...hops.map(h => h.name), target.name], score: reasons.reduce((s, r) => s + r.weight, 0), reasons, recorded: true }
  }
  if (g.connections.includes(target.id)) paths.push(scorePath([]))
  for (const a of mine) if (knows(a, target)) paths.push(scorePath([a]))
  for (const a of mine) for (const b of g.members) {
    if (b.id === a.id || b.id === target.id || g.connections.includes(b.id)) continue
    if (knows(a, b) && knows(b, target)) paths.push(scorePath([a, b]))
  }
  // Recorded best-path strings from the member record (not verified connections)
  if (!paths.length && target.bestPath.length > 1) {
    const hops = target.bestPath.slice(1, -1).map(n => byName.get(n.toLowerCase())).filter((m): m is Member => Boolean(m))
    if (hops.length) paths.push({ ...scorePath(hops), recorded: false })
  }
  paths.sort((a, b) => b.score - a.score)
  const best = paths[0] ?? null
  const myOffers = g.me.offers.map(o => o.toLowerCase())
  const theirNeedFit = target.needs.filter(need => overlap(tokens(need), tokens(myOffers.join(' '))).length)
  return {
    target, best, alternatives: paths.slice(1, 4),
    whoAsksFirst: !best ? 'No recorded path yet — request a connection directly or look for a shared circle.'
      : best.hops.length === 0 ? 'You — you are already connected.'
        : `You ask ${best.hops[0]?.name}. They decide whether to forward — nothing moves until they consent.`,
    safeContext: [
      g.me.whatIDo ? `What you do: ${g.me.whatIDo}` : '',
      ...theirNeedFit.slice(0, 2).map(need => `Their public need: ${need}`),
      target.building ? `What they are building (public): ${target.building}` : '',
    ].filter(Boolean),
    excluded: ['Private CRM notes', 'Deal amounts', 'Private Signals', 'Private memory & Digital You', 'Verification evidence'],
  }
}

/* ───────────────────────── reverse discovery ───────────────────────── */

export interface ReverseMatch { member: Member; need: string; whyYouFit: Reason[]; whyNow: string; path: string; score: number; askId?: string }

const openToForCategory: Record<string, string> = {
  CAPITAL: 'Investment conversations', PARTNERSHIP: 'Strategic partnerships', ACQUISITION: 'Acquisition discussions',
  ADVISOR: 'Advisory conversations', TALENT: 'Hiring / Talent', VENDOR: 'Vendor introductions', CUSTOMER: 'Customer conversations',
}

export function reverseDiscovery(g: GraphInputs, limit = 5): ReverseMatch[] {
  const offerWords = tokens([...g.me.offers, ...g.me.expertise, g.me.whatIDo].join(' '))
  if (!offerWords.length) return []
  const mission = activeMission(g.missions)
  const out: ReverseMatch[] = []
  for (const member of g.members) {
    const asks = g.asks.filter(ask => ask.memberId === member.id && !ask.mine)
    const needs = [...asks.map(ask => ({ text: `${ask.ask} ${ask.detail}`, label: ask.ask, ask })), ...member.needs.map(text => ({ text, label: text, ask: undefined as NetworkAsk | undefined }))]
    let best: ReverseMatch | null = null
    for (const need of needs) {
      const shared = overlap(tokens(need.text), offerWords)
      if (!shared.length) continue
      const reasons: Reason[] = [{ label: 'Your offer matches', evidence: `Shared terms: ${shared.slice(0, 4).join(', ')}`, weight: shared.length * 12 }]
      const category = (need.ask as (NetworkAsk & { category?: string }) | undefined)?.category
      const openTo = category ? openToForCategory[category] : undefined
      if (openTo && g.me.openTo.includes(openTo)) reasons.push({ label: 'Open To', evidence: `You are open to ${openTo.toLowerCase()}`, weight: 8 })
      if (g.me.industries.some(i => member.industry.toLowerCase().includes(i.toLowerCase()))) reasons.push({ label: 'Industry', evidence: member.industry, weight: 6 })
      if (g.me.location && member.location && member.location.split(',').pop()?.trim() === g.me.location.split(',').pop()?.trim()) reasons.push({ label: 'Geography', evidence: member.location, weight: 4 })
      const fit = missionFit(member, mission)
      if (fit.score >= 15) reasons.push({ label: 'Mission fit', evidence: fit.reasons.map(r => r.evidence).join('; '), weight: Math.round(fit.score / 3) })
      if (need.ask) reasons.push({ label: 'Live Signal', evidence: `Posted ${need.ask.posted} · ${need.ask.urgency} urgency`, weight: need.ask.urgency === 'high' ? 10 : 5 })
      const score = reasons.reduce((s, r) => s + r.weight, 0)
      if (!best || score > best.score) {
        const route = routeTo(member, g)
        best = {
          member, need: need.label, whyYouFit: reasons, score, ...(need.ask ? { askId: need.ask.id } : {}),
          whyNow: need.ask?.whyNow || (need.ask ? `Active Signal posted ${need.ask.posted}` : member.whyNow || 'Listed as a current need on their profile.'),
          path: route.best ? route.best.labels.join(' → ') : 'No recorded path — respond to their Signal directly.',
        }
      }
    }
    if (best) out.push(best)
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/* ───────────────────────── meeting brief + debrief ───────────────────────── */

export interface MeetingBrief { who: string; why: string; last: string; promises: string[]; relevant: string[]; path: string; opener: string; questions: string[] }

export function meetingBrief(member: Member, g: GraphInputs, meetingTitle?: string): MeetingBrief {
  const crm = g.crm.personForMember(member.id)
  const activities = crm ? g.crm.activities.filter(item => item.personId === crm.id) : []
  const last = activities[0]
  const promises = crm ? g.crm.tasks.filter(task => task.personId === crm.id && task.status !== 'done' && task.status !== 'cancelled').map(task => task.title) : []
  const thread = g.threads.find(item => item.memberId === member.id)
  if (thread?.commitment) promises.push(thread.commitment)
  const ask = g.asks.find(item => item.memberId === member.id)
  const mission = activeMission(g.missions)
  const fit = missionFit(member, mission)
  const opps = crm ? g.crm.opportunities.filter(item => item.personId === crm.id && !item.archived) : []
  const route = routeTo(member, g)
  const firstName = member.name.split(' ')[0]
  const questions = [
    member.building ? `What would have to be true for “${member.building}” to be a success this year?` : `What are you most focused on over the next quarter?`,
    ask ? `On “${ask.ask}” — what have you already tried?` : member.needs[0] ? `How are you approaching ${member.needs[0].toLowerCase()} right now?` : 'Where could the right introduction save you the most time?',
    mission && fit.score ? `Who else should I speak to about ${mission.title.toLowerCase()}?` : 'Who else should I know in your world?',
  ]
  return {
    who: `${member.name} — ${member.title}${member.company ? `, ${member.company}` : ''}${member.location ? ` · ${member.location}` : ''}`,
    why: meetingTitle || (ask ? `Their Signal: ${ask.ask}` : opps[0] ? `Opportunity: ${opps[0].name}` : 'Relationship conversation'),
    last: last ? `${last.subject} · ${new Date(last.occurredAt).toLocaleDateString()}` : thread?.messages.length ? `Last message: “${thread.messages[thread.messages.length - 1]?.text.slice(0, 90)}”` : 'No prior interaction recorded.',
    promises: promises.slice(0, 4),
    relevant: [ask ? `Signal: ${ask.ask}` : '', mission && fit.score ? `Mission: ${mission.title}` : '', ...opps.slice(0, 2).map(o => `Opportunity: ${o.name} (${o.stageName})`)].filter(Boolean),
    path: route.best ? route.best.labels.join(' → ') : 'No recorded warm path.',
    opener: `${firstName}, thank you for making time.${ask ? ` I saw you are working on ${ask.ask.charAt(0).toLowerCase()}${ask.ask.slice(1)}` : member.building ? ` I have been following what you are building — ${member.building.charAt(0).toLowerCase()}${member.building.slice(1)}` : ''}${ask || member.building ? ', and wanted to hear where it stands.' : ' I would love to hear what matters most to you right now.'}`,
    questions,
  }
}

export interface Debrief { summary: string; promises: string[]; nextMeeting: string | null; opportunityChange: string | null; introduce: Member[] }

export function parseDebrief(text: string, members: Member[]): Debrief {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean)
  const promises = sentences.filter(s => /\b(i will|i'll|we will|we'll|promised|owe|send|follow up|share)\b/i.test(s))
  const meetLine = sentences.find(s => /\b(next meeting|meet again|follow-up call|reconvene|catch up)\b/i.test(s))
  const dateMatch = meetLine?.match(/\b(\d{4}-\d{2}-\d{2}|(?:mon|tues|wednes|thurs|fri|satur|sun)day|next week|tomorrow)\b/i)
  const oppLine = sentences.find(s => /\b(opportunity|deal|proposal|pilot|contract|budget|pricing)\b/i.test(s))
  const introduce = members.filter(m => new RegExp(`\\b(introduce|intro|connect)\\b[^.]*\\b${m.name.split(' ')[0]}\\b`, 'i').test(text))
  return {
    summary: sentences.filter(s => !promises.includes(s)).slice(0, 2).join(' ') || sentences[0] || '',
    promises, nextMeeting: meetLine ? (dateMatch?.[0] ?? meetLine) : null, opportunityChange: oppLine ?? null, introduce,
  }
}

/* ───────────────────────── Digital You rules ───────────────────────── */

export const RULE_KINDS = [
  { kind: 'no_public_investor', label: 'Never suggest sharing investor relationships publicly', action: 'block' },
  { kind: 'ask_before_intro', label: 'Always ask before making an introduction', action: 'ask' },
  { kind: 'propose_times_customers', label: 'May automatically propose times to existing customers', action: 'allow' },
  { kind: 'no_send_without_approval', label: 'Never send a message without approval', action: 'ask' },
  { kind: 'remind_unanswered_ceo', label: 'Remind me when a verified CEO message is unanswered for 3 days', action: 'remind' },
  { kind: 'acquisition_private', label: 'Never surface acquisition interest outside Private scope', action: 'block' },
] as const
export type RuleKind = typeof RULE_KINDS[number]['kind']
export interface Rule { id: string; ruleKind: RuleKind; action: 'block' | 'ask' | 'allow' | 'remind'; enabled: boolean }
export interface OutboundAction { kind: 'send_message' | 'make_intro' | 'share' | 'propose_times'; scope?: string; topic?: string; toCustomer?: boolean }
export interface RuleDecision { allowed: boolean; needsApproval: boolean; reason: string }

/** Consequential outbound actions are always approval-gated; rules can only tighten or pre-approve safe scheduling. */
export function evaluateRules(rules: Rule[], action: OutboundAction): RuleDecision {
  const on = (kind: RuleKind) => rules.some(rule => rule.ruleKind === kind && rule.enabled)
  const topic = (action.topic ?? '').toLowerCase()
  const nonPrivate = action.scope && action.scope !== 'private'
  if (on('acquisition_private') && nonPrivate && /acqui|m&a|buy.?out|sell the company/.test(topic)) return { allowed: false, needsApproval: false, reason: 'Blocked by your rule: acquisition interest stays Private.' }
  if (on('no_public_investor') && action.kind === 'share' && nonPrivate && /investor|lp|fund|capital/.test(topic)) return { allowed: false, needsApproval: false, reason: 'Blocked by your rule: investor relationships are never shared publicly.' }
  if (action.kind === 'propose_times' && action.toCustomer && on('propose_times_customers')) return { allowed: true, needsApproval: false, reason: 'Pre-approved by your rule for existing customers.' }
  if (action.kind === 'make_intro') return { allowed: true, needsApproval: true, reason: 'Introductions always require your approval and both parties’ consent.' }
  if (action.kind === 'send_message') return { allowed: true, needsApproval: true, reason: 'Messages are never sent without your approval.' }
  return { allowed: true, needsApproval: true, reason: 'Outbound actions require your approval.' }
}

/* ───────────────────────── graph insights ───────────────────────── */

export interface Insight { id: string; question: string; title: string; evidence: string[]; action: { label: string; memberId?: string; page?: string } }

export function graphInsights(g: GraphInputs, since: string | null): Insight[] {
  const out: Insight[] = []
  const mission = activeMission(g.missions)
  if (mission) {
    const ranked = g.members.map(m => ({ m, fit: missionFit(m, mission) })).filter(x => x.fit.score > 0).sort((a, b) => b.fit.score - a.fit.score)
    const top = ranked[0]
    if (top) out.push({ id: 'mission', question: 'Who is most relevant to my active mission?', title: `${top.m.name} for “${mission.title}”`, evidence: top.fit.reasons.map(r => `${r.label}: ${r.evidence}`), action: { label: 'Open Executive Page', memberId: top.m.id } })
  }
  const reverse = reverseDiscovery(g, 1)[0]
  if (reverse) out.push({ id: 'reverse', question: 'Who needs something I can provide?', title: `${reverse.member.name} needs ${reverse.need.toLowerCase()}`, evidence: reverse.whyYouFit.map(r => `${r.label}: ${r.evidence}`), action: { label: 'Open Executive Page', memberId: reverse.member.id } })
  const open = g.crm.opportunities.filter(o => !o.archived && o.status === 'open').sort((a, b) => b.probability - a.probability)
  const closest = open[0]
  if (closest) {
    const due = g.crm.tasks.find(t => t.opportunityId === closest.id && t.status !== 'done')
    out.push({ id: 'closest', question: 'What opportunity is closest to action?', title: closest.name, evidence: [`Stage: ${closest.stageName} (${closest.probability}% stage probability)`, closest.nextAction ? `Next action: ${closest.nextAction}` : 'No next action recorded', due ? `Linked task: ${due.title}` : ''].filter(Boolean), action: { label: 'Open Work', page: 'opportunities' } })
    const blocking = g.crm.tasks.find(t => t.opportunityId && t.status !== 'done' && t.dueAt && new Date(t.dueAt).getTime() < Date.now())
    if (blocking) out.push({ id: 'blocking', question: 'What promise is blocking an opportunity?', title: blocking.title, evidence: [`Overdue since ${new Date(blocking.dueAt as string).toLocaleDateString()}`, `Linked to ${g.crm.opportunities.find(o => o.id === blocking.opportunityId)?.name ?? 'an opportunity'}`], action: { label: 'Open tasks', page: 'crm' } })
  }
  const quiet = g.members.filter(m => g.connections.includes(m.id)).map(m => ({ m, w: relationshipWeather(m, g) })).filter(x => x.w.state === 'QUIET' || x.w.state === 'AT RISK').sort((a, b) => b.m.score.relationshipStrength - a.m.score.relationshipStrength)[0]
  if (quiet) out.push({ id: 'quiet', question: 'Which relationship is going quiet?', title: `${quiet.m.name} · ${quiet.w.state}`, evidence: quiet.w.evidence, action: { label: 'Open Executive Page', memberId: quiet.m.id } })
  const byCompany = new Map<string, Member[]>()
  g.members.filter(m => g.connections.includes(m.id) && m.company).forEach(m => byCompany.set(m.company, [...(byCompany.get(m.company) ?? []), m]))
  const multi = [...byCompany.entries()].filter(([, list]) => list.length >= 2).sort((a, b) => b[1].length - a[1].length)[0]
  if (multi) out.push({ id: 'company', question: 'Which company has multiple warm relationships?', title: `${multi[0]} · ${multi[1].length} connections`, evidence: multi[1].map(m => `${m.name}, ${m.title}`), action: multi[1][0] ? { label: 'Open Executive Page', memberId: multi[1][0].id } : { label: 'Open Network', page: 'network' } })
  if (since) {
    const newActs = g.crm.activities.filter(a => a.occurredAt > since).length
    const newMsgs = g.threads.filter(t => t.unread).length
    if (newActs || newMsgs) out.push({ id: 'changed', question: 'What changed since my last visit?', title: `${newActs} new activities · ${newMsgs} unread conversations`, evidence: [`Since ${new Date(since).toLocaleString()}`], action: { label: 'Open Messages', page: 'messages' } })
  }
  return out
}

/** Deterministic answers for Ask Intros questions about the graph. */
export function answerGraphQuestion(question: string, g: GraphInputs): string | null {
  const q = question.toLowerCase()
  const insights = graphInsights(g, null)
  const pick = (id: string) => insights.find(i => i.id === id)
  const fmt = (i: Insight | undefined, empty: string) => i ? `${i.title}\n\nEvidence:\n${i.evidence.map(e => `• ${e}`).join('\n')}` : empty
  if (/active mission|my mission/.test(q)) return fmt(pick('mission'), 'You have no active mission yet. Create one from the Active Mission tile on Home.')
  if (/need.*(i|me).*provide|who needs/.test(q)) return fmt(pick('reverse'), 'No member currently lists a need that matches what you say you can help with. Add to “Can help with” on your Executive Page.')
  if (/closest to action|which opportunity/.test(q)) return fmt(pick('closest'), 'No open opportunities are recorded in Work yet.')
  if (/going quiet|cooling|quiet/.test(q)) return fmt(pick('quiet'), 'None of your connected relationships show a quiet or at-risk pattern in the recorded data.')
  if (/promise.*block|blocking/.test(q)) return fmt(pick('blocking'), 'No overdue promise is linked to an open opportunity.')
  if (/multiple warm|which company/.test(q)) return fmt(pick('company'), 'No company has two or more of your connections yet.')
  const intro = q.match(/(?:introduce me to|path to|intro to|reach)\s+(.+?)[?.!]*$/)
  if (intro?.[1]) {
    const name = intro[1].trim()
    const target = g.members.find(m => m.name.toLowerCase().includes(name) || m.company.toLowerCase().includes(name))
    if (!target) return `I could not find ${name} among the members you can see.`
    const route = routeTo(target, g)
    if (!route.best) return `No recorded path to ${target.name} yet. ${route.whoAsksFirst}`
    return `Best path: ${route.best.labels.join(' → ')}\n\nWhy:\n${route.best.reasons.map(r => `• ${r.label}: ${r.evidence}`).join('\n')}\n\n${route.whoAsksFirst}\nThis is a suggested path until each person consents.`
  }
  return null
}
