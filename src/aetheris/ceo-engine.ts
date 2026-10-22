/**
 * CEO Operating System engine. Deterministic, explainable, no AI.
 * Every output is derived from canonical records already in the account:
 * CRM people/opportunities/tasks/activities, entity events, threads,
 * calendar events, members, missions, decisions and approvals.
 */
import type { CrmCompany, CrmOpportunity, CrmTask, EntityEvent } from './crm/types'
import type { Member } from './social'
import { knownInteractionDays } from './lib/engine'
import type { Outcome } from './domain/models'
import { relationshipWeather, routeTo, type GraphInputs } from './opportunity-graph'

export type DecisionStatus = 'exploring' | 'decided' | 'reversed' | 'archived'
export interface Decision {
  id: string; title: string; status: DecisionStatus; context: string; options: string[]; chosenOption: string
  rationale: string; assumptions: string; risks: string; expectedOutcome: string; reviewDate: string | null; actualOutcome: string
  linkedPersonIds: string[]; linkedCompanyIds: string[]; linkedOpportunityIds: string[]; linkedEventIds: string[]
  createdAt: string; decidedAt: string | null; updatedAt: string
  /** Future Me: user-entered prediction + confidence, reviewed later. */
  prediction?: string; confidence?: number | null; assumptionReview?: string; sameAgain?: '' | 'yes' | 'no' | 'unsure'
}
export type ApprovalType = 'send_message' | 'request_intro' | 'update_opportunity' | 'create_follow_up' | 'schedule_meeting' | 'share_data' | 'other'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed'
export interface Approval { id: string; actionType: ApprovalType; summary: string; payload: Record<string, unknown>; source: string; status: ApprovalStatus; createdAt: string; actedAt: string | null }
export type MarkKind = 'strategic' | 'bench' | 'influence'
export interface Mark { id: string; kind: MarkKind; subjectId: string; companyId: string | null; label: string; outcome: string; cadenceDays: number | null; valueGive: string; valueNeed: string; nextAction: string; nextTouch: string | null; missionId: string | null; notes: string; createdAt: string; updatedAt: string }
export interface CalMeeting { id: string; title: string; startsAt: string; endsAt: string; memberId: string | null; kind: string; notes: string }
export type OppSnapshot = Record<string, { name: string; stage: string; amount: number; probability: number; status: string; expectedClose: string | null; nextAction: string }>
export interface NegotiationRoom { id: string; title: string; status: 'preparing' | 'active' | 'paused' | 'agreed' | 'walked_away' | 'closed'; linkedPersonId: string | null; linkedCompanyId: string | null; linkedOpportunityId: string | null; objective: string; desiredOutcome: string; mustHaves: string; niceToHaves: string; walkAway: string; counterpartPriorities: string; leverageEvidence: string; unknowns: string; batna: string; concessions: string[]; meetingPrep: string; outcome: string; createdAt: string; updatedAt: string }
export interface ScenarioRoom { id: string; title: string; linkedOpportunityId: string | null; scenarioType: 'deal_slip' | 'customer_churn' | 'opportunity_win' | 'opportunity_loss' | 'headcount' | 'probability' | 'revenue' | 'custom'; recordedInputs: Record<string, number | string>; assumptions: Record<string, number | string>; baseline: Record<string, number>; scenarioResult: Record<string, number>; notes: string; createdAt: string; updatedAt: string }
export interface OfficeHour { id: string; ownerId: string; label: string; startsAt: string; endsAt: string; durationMinutes: number; capacity: number; purpose: string; relevance: string; enabled: boolean; createdAt: string; updatedAt: string }
export interface OfficeHourRequest { id: string; windowId: string; requesterId: string; ownerId: string; reason: string; status: 'pending' | 'approved' | 'declined' | 'cancelled'; createdAt: string; actedAt: string | null }

export type CeoView = 'missing' | 'redteam' | 'help' | 'coverage' | 'strategic' | 'time' | 'promises' | 'collisions' | 'companies' | 'bench' | 'replay' | 'patterns' | 'singles' | 'changed' | 'forgetting' | 'who' | 'decisions' | 'commitments' | 'health' | 'forecast' | 'brief' | 'approvals' | 'prepare' | 'close' | 'roi' | 'commit' | 'customerRisk' | 'capitalMap' | 'negotiation' | 'scenario' | 'delegation' | 'boardNetwork' | 'advisor' | 'trustProfile' | 'dealMemory' | 'dependencies' | 'officeHours' | 'privateAsk'
export interface CeoRoute { view?: CeoView; page?: string; memberId?: string; threadId?: string; arg?: string }
export interface CeoItem { id: string; kind: string; title: string; detail: string; tone: 'signal' | 'risk' | 'info'; route: CeoRoute }

export interface CeoInputs {
  g: GraphInputs
  events: EntityEvent[]
  decisions: Decision[]
  approvals: Approval[]
  meetings: CalMeeting[]
  marks: Mark[]
  companies: CrmCompany[]
  since: number
  snapshot: OppSnapshot | null
}

const DAY = 86_400_000
const t = (v: string | null | undefined) => (v ? new Date(v).getTime() : NaN)
const ago = (v: string | null | undefined) => { const x = t(v); return Number.isFinite(x) ? Math.floor((Date.now() - x) / DAY) : null }
const openTask = (task: CrmTask) => task.status !== 'done' && task.status !== 'cancelled'
const overdue = (task: CrmTask) => openTask(task) && !!task.dueAt && t(task.dueAt) < Date.now()
const money = (n: number, c = 'USD') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD', maximumFractionDigits: 0 }).format(n) } catch { return `${c} ${Math.round(n)}` } }
const fmtDate = (v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const openOpps = (g: GraphInputs) => g.crm.opportunities.filter(o => !o.archived && o.status === 'open')
export const snapshotOf = (opps: CrmOpportunity[]): OppSnapshot => Object.fromEntries(opps.filter(o => !o.archived).map(o => [o.id, { name: o.name, stage: o.stageName, amount: o.amount, probability: o.probability, status: o.status, expectedClose: o.expectedClose, nextAction: o.nextAction }]))
const memberForCrm = (g: GraphInputs, personId: string | null) => {
  if (!personId) return undefined
  const p = g.crm.people.find(x => x.id === personId)
  return p?.memberId ? g.members.find(m => m.id === p.memberId) : undefined
}
const lastActivityFor = (g: GraphInputs, o: CrmOpportunity) => {
  const acts = g.crm.activities.filter(a => a.opportunityId === o.id || (o.personId && a.personId === o.personId))
  const latest = acts.reduce<string | null>((m, a) => (!m || t(a.occurredAt) > t(m) ? a.occurredAt : m), null)
  return latest ?? o.updatedAt
}

/* ───────────── relationship health ───────────── */
export type HealthState = 'ACTIVE' | 'WARM' | 'COOLING' | 'DORMANT' | 'AT RISK' | 'NEW'
export interface Health { state: HealthState; reasons: string[] }
export function relationshipHealth(member: Member, g: GraphInputs): Health {
  const w = relationshipWeather(member, g)
  const crm = g.crm.personForMember(member.id)
  const lastDays = crm?.lastActivityAt ? ago(crm.lastActivityAt) : (knownInteractionDays(member) || null)
  const reasons = [...w.evidence]
  if (['introduced', 'conversing', 'accepted'].includes(member.introState)) reasons.push(`Introduction state: ${member.introState}`)
  if (member.mutuals.length) reasons.push(`${member.mutuals.length} mutual ${member.mutuals.length === 1 ? 'connection' : 'connections'} recorded`)
  let state: HealthState
  if (w.state === 'AT RISK') state = 'AT RISK'
  else if (w.state === 'NEW') state = 'NEW'
  else if (w.state === 'MOMENTUM' || w.state === 'OPPORTUNITY WINDOW') state = 'ACTIVE'
  else if (lastDays !== null && lastDays <= 30) state = 'WARM'
  else if (lastDays !== null && lastDays <= 120) state = 'COOLING'
  else state = 'DORMANT'
  reasons.unshift(`Rule: ${healthRule[state]}`)
  return { state, reasons }
}
const healthRule: Record<HealthState, string> = {
  ACTIVE: '3+ logged activities in 14 days, or an open shared opportunity with a live Signal/mission fit.',
  WARM: 'last recorded interaction within 30 days.',
  COOLING: 'last recorded interaction 31–120 days ago.',
  DORMANT: 'no recorded interaction in 120+ days, or none at all for a connection.',
  'AT RISK': 'their last message is unanswered 3+ days, or a promise to them is overdue.',
  NEW: 'no connection, conversation, activity or interaction recorded yet.',
}
export function needingAttention(g: GraphInputs) {
  const pool = g.members.filter(m => g.connections.includes(m.id) || g.crm.personForMember(m.id) || g.threads.some(th => th.memberId === m.id))
  return pool.map(m => ({ member: m, health: relationshipHealth(m, g) }))
    .filter(x => x.health.state === 'AT RISK' || x.health.state === 'COOLING')
    .sort((a, b) => (a.health.state === 'AT RISK' ? 0 : 1) - (b.health.state === 'AT RISK' ? 0 : 1))
}

/* ───────────── forecast confidence ───────────── */
export interface Factor { label: string; effect: 'up' | 'down' | 'info' }
export interface DealHealth { opp: CrmOpportunity; label: 'Strong' | 'Watch' | 'At risk'; factors: Factor[]; weighted: number }
export function dealHealth(o: CrmOpportunity, inp: CeoInputs): DealHealth {
  const { g } = inp
  const f: Factor[] = [{ label: `Stage probability ${o.probability}% (${o.stageName || 'no stage'}) — the only probability used`, effect: 'info' }]
  if (!o.nextAction.trim()) f.push({ label: 'No next action recorded', effect: 'down' })
  if (!o.expectedClose) f.push({ label: 'No expected close date', effect: 'down' })
  else if (t(o.expectedClose) < Date.now()) f.push({ label: `Expected close ${fmtDate(o.expectedClose)} has passed`, effect: 'down' })
  else if (t(o.expectedClose) - Date.now() < 30 * DAY) f.push({ label: `Closes within 30 days (${fmtDate(o.expectedClose)})`, effect: 'info' })
  const lastDays = ago(lastActivityFor(g, o))
  if (lastDays !== null && lastDays > 21) f.push({ label: `No activity for ${lastDays} days`, effect: 'down' })
  else if (lastDays !== null && lastDays <= 14) f.push({ label: `Activity ${lastDays === 0 ? 'today' : `${lastDays} days ago`}`, effect: 'up' })
  if (o.personId) f.push({ label: 'Linked decision-maker in CRM', effect: 'up' })
  else f.push({ label: 'No linked person', effect: 'down' })
  const tasks = g.crm.tasks.filter(x => x.opportunityId === o.id && openTask(x))
  const late = tasks.filter(overdue)
  if (late.length) f.push({ label: `${late.length} overdue ${late.length === 1 ? 'task/commitment' : 'tasks/commitments'}`, effect: 'down' })
  else if (tasks.length) f.push({ label: `${tasks.length} open ${tasks.length === 1 ? 'commitment' : 'commitments'} on track`, effect: 'info' })
  const member = memberForCrm(g, o.personId)
  const soon = inp.meetings.find(mt => member && mt.memberId === member.id && t(mt.startsAt) > Date.now())
  if (soon) f.push({ label: `Meeting scheduled ${fmtDate(soon.startsAt)}`, effect: 'up' })
  const down = f.filter(x => x.effect === 'down').length
  return { opp: o, label: down === 0 ? 'Strong' : down === 1 ? 'Watch' : 'At risk', factors: f, weighted: o.amount * o.probability / 100 }
}
export const dealHealthRule = 'Strong = no negative factors · Watch = one · At risk = two or more. Negative factors: missing next action, missing or passed close date, 21+ days without activity, no linked person, overdue linked tasks.'

export function forecastDelta(inp: CeoInputs): string[] {
  const prev = inp.snapshot
  if (!prev) return []
  const out: string[] = []
  for (const o of inp.g.crm.opportunities.filter(x => !x.archived)) {
    const p = prev[o.id]
    if (!p) { out.push(`New: ${o.name} (${money(o.amount, o.currency)} at ${o.probability}%)`); continue }
    if (p.stage !== o.stageName) out.push(`${o.name}: stage ${p.stage || '—'} → ${o.stageName || '—'}`)
    if (p.amount !== o.amount) out.push(`${o.name}: value ${money(p.amount, o.currency)} → ${money(o.amount, o.currency)}`)
    if (p.probability !== o.probability) out.push(`${o.name}: probability ${p.probability}% → ${o.probability}%`)
    if (p.status !== o.status) out.push(`${o.name}: status ${p.status} → ${o.status}`)
    if (p.expectedClose !== o.expectedClose) out.push(`${o.name}: expected close ${p.expectedClose ? fmtDate(p.expectedClose) : 'none'} → ${o.expectedClose ? fmtDate(o.expectedClose) : 'none'}`)
  }
  for (const id of Object.keys(prev)) if (!inp.g.crm.opportunities.some(o => o.id === id && !o.archived)) out.push(`Removed/archived: ${prev[id]?.name}`)
  return out
}

/* ───────────── pulse ───────────── */
export interface Pulse { label: string; value: string; note: string; route: CeoRoute }
export function companyPulse(inp: CeoInputs): Pulse[] {
  const { g } = inp
  const open = openOpps(g)
  const currency = open[0]?.currency || 'USD'
  const same = open.filter(o => (o.currency || 'USD') === currency)
  const total = same.reduce((s, o) => s + o.amount, 0)
  const weighted = same.reduce((s, o) => s + o.amount * o.probability / 100, 0)
  const risk = open.filter(o => dealHealth(o, inp).label === 'At risk').length
  const late = g.crm.tasks.filter(overdue).length
  const week = inp.meetings.filter(m => t(m.startsAt) > Date.now() && t(m.startsAt) < Date.now() + 7 * DAY).length
  const attention = needingAttention(g).length
  const unread = g.threads.filter(th => th.unread).length
  const network = g.asks.filter(a => !a.mine).length
  const mixed = same.length < open.length ? ` · ${open.length - same.length} in other currencies excluded` : ''
  return [
    { label: 'Open pipeline', value: money(total, currency), note: `${same.length} open ${same.length === 1 ? 'deal' : 'deals'}${mixed}`, route: { page: 'crm' } },
    { label: 'Weighted forecast', value: money(weighted, currency), note: 'Σ amount × stage probability', route: { view: 'forecast' } },
    { label: 'Deals at risk', value: String(risk), note: 'Two+ negative health factors', route: { view: 'forecast' } },
    { label: 'Overdue commitments', value: String(late), note: 'Open tasks past due date', route: { view: 'commitments' } },
    { label: 'Meetings ahead', value: String(week), note: 'Next 7 days on your calendar', route: { page: 'calendar' } },
    { label: 'Relationships needing attention', value: String(attention), note: 'At risk or cooling', route: { view: 'health' } },
    { label: 'Unread conversations', value: String(unread), note: 'Private threads', route: { page: 'messages' } },
    { label: 'Network Signals', value: String(network), note: 'Active asks visible to you', route: { page: 'needs' } },
  ]
}

/* ───────────── what changed ───────────── */
export function whatChanged(inp: CeoInputs): CeoItem[] {
  const { g, since } = inp
  const out: CeoItem[] = []
  for (const d of forecastDelta(inp).slice(0, 6)) out.push({ id: `fd-${d}`, kind: 'Opportunity', title: d, detail: 'Change since your last visit', tone: 'signal', route: { view: 'forecast' } })
  if (!inp.snapshot) for (const e of inp.events.filter(e => e.entityType === 'crm_opportunity' && t(e.createdAt) > since).slice(0, 5)) {
    const o = g.crm.opportunities.find(x => x.id === e.entityId)
    out.push({ id: `ev-${e.id}`, kind: 'Opportunity', title: `${o?.name ?? 'Opportunity'}: ${e.summary}`, detail: fmtDate(e.createdAt), tone: 'signal', route: { page: 'crm' } })
  }
  const late = g.crm.tasks.filter(overdue)
  if (late.length) out.push({ id: 'late', kind: 'Commitments', title: `${late.length} overdue ${late.length === 1 ? 'task or commitment' : 'tasks or commitments'}`, detail: late.slice(0, 2).map(x => x.title).join(' · '), tone: 'risk', route: { view: 'commitments' } })
  const dueSoon = g.crm.tasks.filter(x => openTask(x) && x.dueAt && t(x.dueAt) >= Date.now() && t(x.dueAt) < Date.now() + 2 * DAY)
  if (dueSoon.length) out.push({ id: 'due', kind: 'Due soon', title: `${dueSoon.length} due in the next 48 hours`, detail: dueSoon.slice(0, 2).map(x => x.title).join(' · '), tone: 'signal', route: { view: 'commitments' } })
  const fresh = g.crm.tasks.filter(x => openTask(x) && t(x.createdAt) > since)
  if (fresh.length) out.push({ id: 'fresh', kind: 'New loops', title: `${fresh.length} new open ${fresh.length === 1 ? 'loop' : 'loops'} since your last visit`, detail: fresh.slice(0, 2).map(x => x.title).join(' · '), tone: 'info', route: { view: 'commitments' } })
  const unread = g.threads.filter(th => th.unread)
  for (const th of unread.slice(0, 3)) {
    const m = g.members.find(x => x.id === th.memberId)
    out.push({ id: `th-${th.id}`, kind: 'Message', title: `Unread from ${m?.name ?? 'a member'}`, detail: th.messages[th.messages.length - 1]?.text.slice(0, 90) ?? '', tone: 'signal', route: { threadId: th.id } })
  }
  for (const mt of inp.meetings.filter(m => t(m.startsAt) > Date.now() && t(m.startsAt) < Date.now() + 2 * DAY).slice(0, 3))
    out.push({ id: `mt-${mt.id}`, kind: 'Meeting soon', title: mt.title, detail: new Date(mt.startsAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }), tone: 'info', route: mt.memberId ? { view: 'prepare', memberId: mt.memberId } : { page: 'calendar' } })
  const risk = needingAttention(g).filter(x => x.health.state === 'AT RISK').slice(0, 3)
  for (const r of risk) out.push({ id: `rh-${r.member.id}`, kind: 'Relationship', title: `${r.member.name} is at risk`, detail: r.health.reasons[1] ?? '', tone: 'risk', route: { memberId: r.member.id } })
  const newIntros = g.members.filter(m => m.introState === 'accepted' || m.introState === 'requested')
  if (newIntros.length) out.push({ id: 'intros', kind: 'Intros', title: `${newIntros.length} introduction${newIntros.length === 1 ? '' : 's'} in motion`, detail: newIntros.slice(0, 2).map(m => `${m.name} · ${m.introState}`).join(' · '), tone: 'info', route: { page: 'intros' } })
  return out
}

/* ───────────── chief of staff ───────────── */
export function chiefOfStaff(inp: CeoInputs): CeoItem[] {
  const { g } = inp
  const out: CeoItem[] = []
  for (const c of g.crm.tasks.filter(x => x.kind === 'commitment' && openTask(x) && x.waitingOn !== 'them').slice(0, 4))
    out.push({ id: `c-${c.id}`, kind: 'Promise', title: c.title, detail: `${c.owedTo ? `Owed to ${c.owedTo}` : 'Your commitment'}${c.dueAt ? ` · due ${fmtDate(c.dueAt)}` : ''}`, tone: overdue(c) ? 'risk' : 'signal', route: { view: 'commitments' } })
  for (const x of g.crm.tasks.filter(x => x.kind !== 'commitment' && overdue(x)).slice(0, 3))
    out.push({ id: `o-${x.id}`, kind: 'Overdue', title: x.title, detail: `Was due ${fmtDate(x.dueAt!)}`, tone: 'risk', route: { view: 'commitments' } })
  for (const o of openOpps(g)) {
    const d = ago(lastActivityFor(g, o))
    if (d !== null && d > 21) out.push({ id: `s-${o.id}`, kind: 'Stale deal', title: o.name, detail: `No activity for ${d} days${o.nextAction ? ` · next: ${o.nextAction}` : ' · no next action'}`, tone: 'risk', route: { view: 'forecast' } })
    else if (!o.nextAction.trim()) out.push({ id: `n-${o.id}`, kind: 'No next action', title: o.name, detail: 'Open deal without a recorded next step', tone: 'signal', route: { page: 'crm' } })
  }
  for (const th of g.threads) {
    const last = th.messages[th.messages.length - 1]
    const d = last ? ago(last.at) : null
    if (last?.from === 'them') { const m = g.members.find(x => x.id === th.memberId); out.push({ id: `u-${th.id}`, kind: 'Unanswered', title: `${m?.name ?? 'Member'} is waiting on you`, detail: `${d !== null && !Number.isNaN(d) ? `${d} days · ` : ''}“${last.text.slice(0, 70)}”`, tone: 'signal', route: { threadId: th.id } }) }
  }
  for (const mt of inp.meetings.filter(m => t(m.startsAt) > Date.now() && t(m.startsAt) < Date.now() + 7 * DAY)) {
    const noContext = !mt.memberId && !mt.notes.trim()
    if (noContext) out.push({ id: `m-${mt.id}`, kind: 'Meeting without context', title: mt.title, detail: `${fmtDate(mt.startsAt)} · no linked person or notes`, tone: 'info', route: { page: 'calendar' } })
    else if (mt.memberId) out.push({ id: `m-${mt.id}`, kind: 'Prepare', title: mt.title, detail: `${fmtDate(mt.startsAt)} · brief ready from recorded context`, tone: 'info', route: { view: 'prepare', memberId: mt.memberId } })
  }
  for (const d of inp.decisions.filter(d => d.status !== 'archived' && d.reviewDate && t(d.reviewDate) <= Date.now()))
    out.push({ id: `d-${d.id}`, kind: 'Decision review due', title: d.title, detail: `Review date ${fmtDate(d.reviewDate!)}`, tone: 'signal', route: { view: 'decisions', arg: d.id } })
  const pending = inp.approvals.filter(a => a.status === 'pending')
  if (pending.length) out.push({ id: 'appr', kind: 'Approvals', title: `${pending.length} action${pending.length === 1 ? '' : 's'} waiting for approval`, detail: pending[0]!.summary, tone: 'signal', route: { view: 'approvals' } })
  return out
}

/* ───────────── who can change this? ───────────── */
export type ChangeKind = 'any' | 'customer' | 'capital' | 'talent' | 'partnership' | 'acquisition' | 'expertise' | 'vendor'
const kindWords: Record<Exclude<ChangeKind, 'any'>, string[]> = {
  customer: ['customer', 'buyer', 'client', 'procurement', 'sales', 'pilot', 'purchase'],
  capital: ['capital', 'invest', 'investor', 'fund', 'funding', 'raise', 'vc', 'venture', 'lp', 'equity', 'debt', 'bank'],
  talent: ['hire', 'hiring', 'cfo', 'cto', 'coo', 'recruit', 'talent', 'executive search', 'leader', 'vp'],
  partnership: ['partner', 'partnership', 'alliance', 'distribution', 'channel', 'jv', 'logistics'],
  acquisition: ['acquire', 'acquisition', 'm&a', 'buyout', 'exit', 'merger', 'sell the company'],
  expertise: ['advisor', 'expert', 'expertise', 'regulatory', 'legal', 'board', 'operator'],
  vendor: ['vendor', 'supplier', 'provider', 'agency', 'manufacturer', 'logistics'],
}
export function detectKind(problem: string): ChangeKind {
  const q = problem.toLowerCase()
  for (const [k, words] of Object.entries(kindWords)) if (words.some(w => q.includes(w))) return k as ChangeKind
  return 'any'
}
const stop = new Set(['need', 'a', 'an', 'the', 'to', 'for', 'at', 'in', 'of', 'and', 'we', 'i', 'my', 'our', 'with', 'who', 'can', 'find', 'get', 'someone', 'looking', 'want'])
export interface ChangeMatch { member: Member; strength: 'strong' | 'moderate' | 'weak'; evidence: string[]; whyThem: string; whyYou: string; whyNow: string; path: string[]; pathNote: string; next: string }
export function whoCanChange(problem: string, kind: ChangeKind, g: GraphInputs, limit = 5): ChangeMatch[] {
  const k = kind === 'any' ? detectKind(problem) : kind
  const tokens = problem.toLowerCase().replace(/\$[\d.,]+[mkb]?/g, ' ').split(/[^a-z0-9&+]+/).filter(w => w.length > 1 && !stop.has(w))
  const words = [...new Set([...tokens, ...(k !== 'any' ? kindWords[k] : [])])]
  const rows = g.members.map(m => {
    const evidence: string[] = []
    let score = 0
    const hit = (field: string, list: string[], weight: number) => {
      const found = list.filter(v => words.some(w => v.toLowerCase().includes(w)))
      if (found.length) { score += weight; evidence.push(`${field}: ${found.slice(0, 2).join(', ')}`) }
    }
    hit('Can help with', [...m.offers, ...(m.openTo ?? [])], 30)
    hit('Expertise', [...m.expertise, ...m.tags], 22)
    hit('Role', [m.title, m.role, m.whatIDo ?? ''].filter(Boolean), 16)
    hit('Company / industry', [m.company, m.industry].filter(Boolean), 18)
    const named = tokens.filter(w => w.length > 2 && m.company.toLowerCase().includes(w))
    if (named.length) { score += 25; evidence.push(`Works at ${m.company}`) }
    if (!score) return null
    if (g.verifiedIds.has(m.id)) { score += 5; evidence.push('Verified member') }
    if (g.connections.includes(m.id)) { score += 8; evidence.push('Already connected to you') }
    const route = routeTo(m, g)
    const best = route.best
    const direct = evidence.filter(e => e.startsWith('Can help') || e.startsWith('Works at') || e.startsWith('Expertise')).length
    const strength: ChangeMatch['strength'] = direct >= 2 || score >= 60 ? 'strong' : direct >= 1 && score >= 35 ? 'moderate' : 'weak'
    const path = best ? best.labels : ['You', m.name]
    return {
      score, match: {
        member: m, strength, evidence,
        whyThem: m.whyThem || evidence[0] || '',
        whyYou: m.whyYou || (g.me.offers[0] ? `You list “${g.me.offers[0]}” as something you can help with.` : 'Not enough recorded evidence about what you offer them.'),
        whyNow: m.whyNow || (g.asks.find(a => a.memberId === m.id)?.ask ? `Active Signal: ${g.asks.find(a => a.memberId === m.id)!.ask}` : 'No time-bound signal recorded.'),
        path, pathNote: best ? `${best.recorded ? 'Recorded path' : 'Suggested path'} · ${best.reasons.map(r => r.label).join(' · ')}` : g.connections.includes(m.id) ? 'Direct connection' : 'No recorded warm path — a direct, reasoned request is the honest option.',
        next: g.connections.includes(m.id) ? `Message ${m.name.split(' ')[0]} with the specific ask` : best && best.hops[0] ? `Ask ${best.hops[0].name} for a double-opt-in intro` : `Request a double-opt-in intro to ${m.name.split(' ')[0]}`,
      } satisfies ChangeMatch,
    }
  }).filter(Boolean) as { score: number; match: ChangeMatch }[]
  return rows.sort((a, b) => b.score - a.score).slice(0, limit).map(r => r.match)
}

/* ───────────── decisions: what changed since ───────────── */
export function sinceDecided(d: Decision, g: GraphInputs, events: EntityEvent[]): string[] {
  const from = t(d.decidedAt ?? d.createdAt)
  const out: string[] = []
  for (const id of d.linkedOpportunityIds) {
    const o = g.crm.opportunities.find(x => x.id === id)
    if (!o) continue
    const ev = events.filter(e => e.entityId === id && t(e.createdAt) > from)
    out.push(`${o.name}: now ${o.stageName || 'no stage'} · ${o.status}${ev.length ? ` · ${ev.length} recorded change${ev.length === 1 ? '' : 's'} since` : ' · no recorded change since'}`)
  }
  for (const id of d.linkedPersonIds) {
    const p = g.crm.people.find(x => x.id === id)
    if (!p) continue
    const acts = g.crm.activities.filter(a => a.personId === id && t(a.occurredAt) > from)
    out.push(`${p.fullName}: ${acts.length} activit${acts.length === 1 ? 'y' : 'ies'} since the decision`)
  }
  return out
}

/* ───────────── network ROI ───────────── */
export interface Roi { label: string; value: string; note: string }
export function networkRoi(g: GraphInputs, outcomes: Outcome[]): Roi[] {
  const made = g.members.filter(m => m.introState !== 'recommended').length
  const accepted = g.members.filter(m => ['accepted', 'introduced', 'conversing', 'closed'].includes(m.introState)).length
  const introPeople = new Set(g.members.filter(m => ['accepted', 'introduced', 'conversing', 'closed'].includes(m.introState)).map(m => g.crm.personForMember(m.id)?.id).filter(Boolean) as string[])
  const meetings = g.crm.activities.filter(a => a.kind === 'meeting' && (a.introRequestId || (a.personId && introPeople.has(a.personId)))).length
  const linked = g.crm.opportunities.filter(o => !o.archived && ((o.personId && introPeople.has(o.personId)) || /intro/i.test(o.source)))
  const won = linked.filter(o => o.status === 'won')
  const cur = won[0]?.currency || 'USD'
  const value = won.filter(o => (o.currency || 'USD') === cur && o.amount > 0).reduce((s, o) => s + o.amount, 0)
  const hires = outcomes.filter(o => o.type === 'hire').length
  const partners = outcomes.filter(o => o.type === 'partnership').length
  return [
    { label: 'Intros made', value: String(made), note: 'Requested or further' },
    { label: 'Intros accepted', value: String(accepted), note: 'Both sides opted in' },
    { label: 'Meetings from intros', value: String(meetings), note: 'Logged meetings linked to an intro or introduced person' },
    { label: 'Opportunities linked', value: String(linked.length), note: 'Person came through an intro, or source says intro' },
    { label: 'Won opportunities', value: String(won.length), note: 'Linked and marked won' },
    { label: 'Attributed value', value: value ? money(value, cur) : '—', note: value ? 'Sum of won linked deal amounts' : 'Only counted from won deals with an amount' },
    { label: 'Hires', value: String(hires), note: 'Explicitly recorded outcomes' },
    { label: 'Partnerships', value: String(partners), note: 'Explicitly recorded outcomes' },
  ]
}

/* ───────────── executive brief ───────────── */
export type BriefVariant = 'board' | 'investor' | 'weekly'
export function executiveBrief(variant: BriefVariant, inp: CeoInputs, outcomes: Outcome[], company: string): string {
  const { g } = inp
  const title = variant === 'board' ? 'Board Brief' : variant === 'investor' ? 'Investor Update' : 'Weekly Executive Brief'
  const lines: string[] = [`${title}${company ? ` — ${company}` : ''}`, new Date().toLocaleDateString(undefined, { dateStyle: 'long' }), '']
  const sec = (h: string, items: string[], empty: string) => { lines.push(h.toUpperCase()); lines.push(...(items.length ? items.map(i => `• ${i}`) : [`• ${empty}`])); lines.push('') }
  sec('What changed', whatChanged(inp).slice(0, 6).map(i => `${i.title}${i.detail ? ` — ${i.detail}` : ''}`), 'Nothing important recorded since the last review.')
  const wonRecent = g.crm.opportunities.filter(o => o.status === 'won' && (ago(o.updatedAt) ?? 999) <= 30)
  sec('Wins (last 30 days)', wonRecent.map(o => `${o.name}${o.amount ? ` — ${money(o.amount, o.currency)}` : ''}`), 'No deals recorded as won in the last 30 days.')
  const pulse = companyPulse(inp)
  sec('Pipeline', pulse.slice(0, 2).map(p => `${p.label}: ${p.value} (${p.note})`), 'No open pipeline recorded.')
  const health = openOpps(g).map(o => dealHealth(o, inp))
  sec('Forecast', [...forecastDelta(inp).slice(0, 5), `${health.filter(h => h.label === 'Strong').length} strong · ${health.filter(h => h.label === 'Watch').length} watch · ${health.filter(h => h.label === 'At risk').length} at risk`], 'No forecast movement recorded.')
  sec('Key risks', health.filter(h => h.label === 'At risk').slice(0, 5).map(h => `${h.opp.name}: ${h.factors.filter(f => f.effect === 'down').map(f => f.label.toLowerCase()).join('; ')}`), 'No deal meets the at-risk rule.')
  sec('Major decisions', inp.decisions.filter(d => d.status !== 'archived').slice(0, 5).map(d => `${d.title} — ${d.status}${d.chosenOption ? `: ${d.chosenOption}` : ''}`), 'No decisions recorded.')
  sec('Commitments', g.crm.tasks.filter(x => openTask(x) && x.kind === 'commitment').slice(0, 6).map(c => `${c.title}${c.owedTo ? ` (to ${c.owedTo})` : ''}${c.dueAt ? ` — due ${fmtDate(c.dueAt)}` : ''}${overdue(c) ? ' — OVERDUE' : ''}`), 'No open commitments.')
  if (variant !== 'investor') {
    const roi = networkRoi(g, outcomes)
    sec('Relationship & network movement', [...roi.slice(0, 5).map(r => `${r.label}: ${r.value}`), `${needingAttention(g).length} relationships need attention`], 'No network movement recorded.')
  }
  const next = [
    ...openOpps(g).filter(o => o.expectedClose && t(o.expectedClose) < Date.now() + 30 * DAY && t(o.expectedClose) > Date.now()).map(o => `${o.name} expected to close ${fmtDate(o.expectedClose!)}`),
    ...inp.decisions.filter(d => d.reviewDate && t(d.reviewDate) < Date.now() + 30 * DAY).map(d => `Review decision: ${d.title} (${fmtDate(d.reviewDate!)})`),
    ...g.crm.tasks.filter(x => openTask(x) && x.dueAt && t(x.dueAt) < Date.now() + 30 * DAY && t(x.dueAt) >= Date.now()).slice(0, 5).map(x => `${x.title} — ${fmtDate(x.dueAt!)}`),
  ]
  sec('Next 30 days', next, 'Nothing scheduled in recorded data.')
  lines.push('Prepared by Ask Intros from recorded account data only. No figures are estimated.')
  return lines.join('\n')
}

/* ───────────── Ask Intros command recognition ───────────── */
export { recognizeCommand } from './capabilities/match'
export const ceoViewLabel: Record<CeoView, string> = {
  missing: 'What am I missing?', redteam: 'Challenge this', help: 'Who can I help?', coverage: 'Relationship coverage', strategic: 'Strategic relationships',
  time: 'CEO time ROI', promises: 'Trust at risk', collisions: 'Opportunity collisions', companies: 'Company-to-company match', bench: 'Executive bench',
  replay: 'Executive replay', patterns: 'Patterns from outcomes', singles: 'Single-thread risk',
  changed: 'What changed', forgetting: 'What am I forgetting?', who: 'Who can change this?', decisions: 'Decision Room', commitments: 'Commitments',
  health: 'Relationships needing attention', forecast: 'Forecast confidence', brief: 'Executive brief', approvals: 'Approval queue',
  prepare: 'Prepare me', close: 'Close the meeting', roi: 'Network ROI', commit: 'Create commitment',
  customerRisk: 'Customer Risk Radar', capitalMap: 'Capital Map', negotiation: 'Negotiation Room', scenario: 'Scenario Room', delegation: 'Delegation Intelligence',
  boardNetwork: 'Board Network', advisor: 'Advisor on Demand', trustProfile: 'Executive Trust Profile', dealMemory: 'Deal & Company Memory', dependencies: 'Key-person dependency',
  officeHours: 'Executive Office Hours', privateAsk: 'Private Ask',
}
