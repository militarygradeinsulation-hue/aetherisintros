/**
 * CEO intelligence layer — deterministic, explainable, provenance-tagged.
 * Blind Spot Radar, Red Team, Confidence Gaps, Reciprocity, Coverage,
 * Strategic Relationships, Time ROI, Promise Risk, Collisions, Company Match,
 * Bench, Replay and Patterns. Nothing here calls AI or invents facts: every
 * finding lists the records it came from and what is not recorded.
 */
import type { CrmCompany, CrmOpportunity, CrmPerson, CrmTask } from './crm/types'
import type { Member, NetworkAsk } from './social'
import { activeMission, tokens, type GraphInputs } from './opportunity-graph'
import { dealHealth, relationshipHealth, type CeoInputs, type CeoRoute, type Decision, type Mark } from './ceo-engine'

export type Provenance = 'VERIFIED' | 'RECORDED' | 'DIRECT' | 'OBSERVED' | 'INFERRED' | 'UNKNOWN'
export const provenanceNote: Record<Provenance, string> = {
  VERIFIED: 'Verified identity, business or executive data.',
  RECORDED: 'Taken from a CRM, calendar, task or decision record.',
  DIRECT: 'Stated by the member in their profile, Signal or Ask.',
  OBSERVED: 'Derived directly from recorded interactions or activity.',
  INFERRED: 'A fixed rule applied to several recorded facts.',
  UNKNOWN: 'Not enough evidence is recorded.',
}
export interface Evidence { text: string; source: Provenance }
export interface Gap { known: string[]; unknown: string[]; improve: string; action?: { label: string; route: CeoRoute } }
export interface Finding { id: string; kind: string; title: string; why: Evidence[]; missing: string[]; source: Provenance; route: CeoRoute; fix: string; severity: 1 | 2 | 3 }

const DAY = 86_400_000
const t = (v: string | null | undefined) => (v ? new Date(v).getTime() : NaN)
const ago = (v: string | null | undefined) => { const x = t(v); return Number.isFinite(x) ? Math.floor((Date.now() - x) / DAY) : null }
const openTask = (x: CrmTask) => x.status !== 'done' && x.status !== 'cancelled'
const overdue = (x: CrmTask) => openTask(x) && !!x.dueAt && t(x.dueAt) < Date.now()
const openOpps = (g: GraphInputs) => g.crm.opportunities.filter(o => !o.archived && o.status === 'open')
const money = (n: number, c = 'USD') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD', maximumFractionDigits: 0 }).format(n) } catch { return `${Math.round(n)}` } }
const fmt = (v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2 }

/** "Meaningful" = at or above the median open amount, or ≥ 25k when few deals. */
function meaningfulThreshold(g: GraphInputs) {
  const amounts = openOpps(g).map(o => o.amount).filter(a => a > 0)
  return amounts.length >= 3 ? median(amounts) : 25_000
}
function peopleAt(g: GraphInputs, companyId: string | null, companyName = '') {
  if (!companyId && !companyName) return []
  const n = companyName.trim().toLowerCase()
  return g.crm.people.filter(p => !p.archived && ((companyId && p.companyId === companyId) || (n && p.companyName.trim().toLowerCase() === n)))
}
const lastTouch = (g: GraphInputs, personId: string) => {
  const p = g.crm.people.find(x => x.id === personId)
  const acts = g.crm.activities.filter(a => a.personId === personId).map(a => a.occurredAt)
  const all = [...acts, p?.lastActivityAt].filter(Boolean) as string[]
  return all.reduce<string | null>((m, v) => (!m || t(v) > t(m) ? v : m), null)
}
const personName = (g: GraphInputs, id: string | null) => (id ? g.crm.people.find(p => p.id === id)?.fullName ?? '' : '')
const memberOf = (g: GraphInputs, p: CrmPerson | undefined) => (p?.memberId ? g.members.find(m => m.id === p.memberId) : undefined)
const subjectName = (inp: CeoInputs, id: string) => inp.g.members.find(m => m.id === id)?.name ?? inp.g.crm.people.find(p => p.id === id)?.fullName ?? 'Unknown person'

/* ───────────────────────── A) Blind Spot Radar ───────────────────────── */
export function blindSpots(inp: CeoInputs): Finding[] {
  const { g } = inp
  const out: Finding[] = []
  const big = meaningfulThreshold(g)
  for (const o of openOpps(g)) {
    const r: CeoRoute = { page: 'crm' }
    const coName = inp.companies.find(c => c.id === o.companyId)?.name ?? ''
    if (!o.personId) out.push({ id: `nop-${o.id}`, kind: 'No person', title: `${o.name} has no linked person`, why: [{ text: `Open opportunity, ${money(o.amount, o.currency)}, stage ${o.stageName || 'unset'}.`, source: 'RECORDED' }], missing: ['A linked contact or decision maker'], source: 'RECORDED', route: r, fix: 'Link the person who owns this decision.', severity: o.amount >= big ? 3 : 2 })
    if (!o.nextAction.trim()) out.push({ id: `nna-${o.id}`, kind: 'No next action', title: `${o.name} has no next action`, why: [{ text: 'Next action field is empty on an open opportunity.', source: 'RECORDED' }], missing: ['Next action'], source: 'RECORDED', route: r, fix: 'Record the next step and who owns it.', severity: 2 })
    const close = t(o.expectedClose)
    if (Number.isFinite(close) && close - Date.now() < 21 * DAY) {
      const acts = g.crm.activities.filter(a => a.opportunityId === o.id || (o.personId && a.personId === o.personId))
      const last = acts.reduce<string | null>((m, a) => (!m || t(a.occurredAt) > t(m) ? a.occurredAt : m), null)
      const d = ago(last)
      if (d === null || d > 14) out.push({ id: `cls-${o.id}`, kind: 'Close date at risk', title: `${o.name} closes ${fmt(o.expectedClose!)} with ${d === null ? 'no recorded activity' : `no activity for ${d} days`}`, why: [{ text: `Expected close ${fmt(o.expectedClose!)}.`, source: 'RECORDED' }, { text: d === null ? 'No activities linked.' : `Last linked activity ${d} days ago.`, source: 'OBSERVED' }], missing: ['Recent activity on this deal'], source: 'OBSERVED', route: r, fix: 'Log the latest contact or move the close date.', severity: 3 })
    }
    if (o.amount >= big && (o.companyId || coName)) {
      const people = peopleAt(g, o.companyId, coName)
      if (people.length <= 1) out.push({ id: `st-${o.id}`, kind: 'Single-thread risk', title: `${o.name}: ${people.length ? `only ${people[0]!.fullName} known` : 'no one known'} at ${coName || 'the account'}`, why: [{ text: `${money(o.amount, o.currency)} is at or above your median open deal.`, source: 'RECORDED' }, { text: `${people.length} CRM ${people.length === 1 ? 'person' : 'people'} linked to this company.`, source: 'RECORDED' }], missing: ['A second relationship at the account'], source: 'INFERRED', route: { view: 'coverage', arg: o.companyId ?? coName }, fix: 'Open Coverage and add another stakeholder.', severity: 3 })
    }
  }
  for (const m of inp.meetings.filter(m => t(m.startsAt) > Date.now() && t(m.startsAt) < Date.now() + 7 * DAY && !m.memberId && !m.notes.trim()))
    out.push({ id: `mt-${m.id}`, kind: 'Meeting without context', title: `“${m.title}” has no linked person or notes`, why: [{ text: `Calendar event ${fmt(m.startsAt)}.`, source: 'RECORDED' }], missing: ['Linked person', 'Meeting notes / purpose'], source: 'RECORDED', route: { page: 'calendar' }, fix: 'Link who you are meeting and why.', severity: 1 })
  for (const d of inp.decisions.filter(d => d.status !== 'archived')) {
    if (!d.reviewDate) out.push({ id: `dr-${d.id}`, kind: 'Decision without review', title: `“${d.title}” has no review date`, why: [{ text: `Decision status: ${d.status}.`, source: 'RECORDED' }], missing: ['Review date'], source: 'RECORDED', route: { view: 'decisions', arg: d.id }, fix: 'Set a date to check it against reality.', severity: 1 })
    else if (d.assumptions.trim() && !d.actualOutcome.trim() && t(d.reviewDate) < Date.now()) out.push({ id: `da-${d.id}`, kind: 'Assumption unreviewed', title: `“${d.title}” passed review with no outcome`, why: [{ text: `Review date ${fmt(d.reviewDate)} has passed.`, source: 'RECORDED' }, { text: 'Assumptions recorded; actual outcome empty.', source: 'RECORDED' }], missing: ['Actual outcome'], source: 'RECORDED', route: { view: 'decisions', arg: d.id }, fix: 'Record what actually happened.', severity: 2 })
  }
  for (const c of g.crm.tasks.filter(x => x.kind === 'commitment' && openTask(x) && (!x.dueAt || !(x.owedTo ?? '').trim())))
    out.push({ id: `cm-${c.id}`, kind: 'Loose commitment', title: `“${c.title}” has no ${!c.dueAt ? 'due date' : 'owed-to'}`, why: [{ text: 'Open commitment record.', source: 'RECORDED' }], missing: [!c.dueAt ? 'Due date' : 'Who it is owed to'], source: 'RECORDED', route: { view: 'commitments' }, fix: 'Complete the promise so it can be tracked.', severity: 1 })
  for (const s of inp.marks.filter(m => m.kind === 'strategic')) {
    const days = daysSinceSubject(inp, s.subjectId)
    const cadence = s.cadenceDays ?? 30
    if (days === null || days > cadence) out.push({ id: `sr-${s.id}`, kind: 'Priority relationship quiet', title: `${subjectName(inp, s.subjectId)}: ${days === null ? 'no recorded interaction' : `${days} days since last touch`}`, why: [{ text: `Marked strategic, cadence ${cadence} days.`, source: 'RECORDED' }, { text: days === null ? 'No interaction recorded.' : `Last interaction ${days} days ago.`, source: 'OBSERVED' }], missing: ['A recent interaction'], source: 'OBSERVED', route: { view: 'strategic' }, fix: 'Schedule a touch.', severity: 2 })
  }
  const mission = activeMission(g.missions)
  if (mission) {
    const words = tokens(`${mission.objective} ${mission.targetIndustry} ${mission.targetCompany} ${mission.title}`)
    const strong = g.members.filter(m => { const w = tokens(`${m.offers.join(' ')} ${m.expertise.join(' ')} ${m.industry} ${m.company}`); return words.filter(x => w.includes(x)).length >= 2 })
    if (!strong.length) out.push({ id: `ms-${mission.id}`, kind: 'Mission without people', title: `Mission “${mission.title}” has no strong matching people`, why: [{ text: 'No member shares two or more mission terms in their offers, expertise, industry or company.', source: 'INFERRED' }], missing: [mission.targetCompany ? 'Members matching the mission' : 'Target company on the mission'], source: 'INFERRED', route: { page: 'home' }, fix: 'Sharpen the mission or ask the network.', severity: 2 })
    if (mission.targetCompany && !peopleAt(g, null, mission.targetCompany).length && !g.members.some(m => m.company.toLowerCase() === mission.targetCompany.toLowerCase()))
      out.push({ id: `mc-${mission.id}`, kind: 'No path to company', title: `No known relationship at ${mission.targetCompany}`, why: [{ text: `Target company recorded on mission “${mission.title}”.`, source: 'RECORDED' }, { text: 'No CRM person or member at that company.', source: 'RECORDED' }], missing: ['Anyone at the target company'], source: 'INFERRED', route: { view: 'who', arg: mission.targetCompany }, fix: 'Ask who can introduce you.', severity: 2 })
  }
  for (const r of promiseRisk(inp)) out.push({ id: `pr-${r.key}`, kind: 'Trust at risk', title: r.title, why: r.evidence, missing: [], source: 'RECORDED', route: { view: 'promises' }, fix: 'Clear or renegotiate the promises.', severity: 3 })
  return out.sort((a, b) => b.severity - a.severity)
}
function daysSinceSubject(inp: CeoInputs, subjectId: string) {
  const person = inp.g.crm.people.find(p => p.id === subjectId) ?? inp.g.crm.personForMember(subjectId)
  const crmLast = person ? lastTouch(inp.g, person.id) : null
  const thread = inp.g.threads.find(x => x.memberId === subjectId)
  const vals = [crmLast, thread?.messages[thread.messages.length - 1]?.at].filter(v => v && Number.isFinite(t(v))) as string[]
  if (!vals.length) { const m = inp.g.members.find(x => x.id === subjectId); if (m && Number.isFinite(m.lastInteractionDays) && m.lastInteractionDays < 9999) return m.lastInteractionDays; return null }
  return Math.min(...vals.map(v => ago(v) ?? 9999))
}

/* ───────────────────────── J) Promise Risk ───────────────────────── */
export interface PromiseRisk { key: string; title: string; evidence: Evidence[]; tasks: CrmTask[] }
export function promiseRisk(inp: CeoInputs): PromiseRisk[] {
  const { g } = inp
  const mine = g.crm.tasks.filter(x => x.kind === 'commitment' && (x.waitingOn ?? 'me') === 'me' && openTask(x))
  const groups = new Map<string, CrmTask[]>()
  for (const c of mine) {
    const key = c.personId ? `p:${c.personId}` : c.companyId ? `c:${c.companyId}` : (c.owedTo ?? '').trim() ? `o:${c.owedTo!.trim().toLowerCase()}` : ''
    if (key) groups.set(key, [...(groups.get(key) ?? []), c])
  }
  const out: PromiseRisk[] = []
  for (const [key, list] of groups) {
    const late = list.filter(overdue)
    const who = key.startsWith('p:') ? personName(g, key.slice(2)) : key.startsWith('c:') ? inp.companies.find(c => c.id === key.slice(2))?.name ?? 'a company' : list[0]!.owedTo!
    const oppLinked = list.filter(x => x.opportunityId && openOpps(g).some(o => o.id === x.opportunityId))
    const nextMeet = inp.meetings.find(m => t(m.startsAt) > Date.now() && list.some(x => x.personId && g.crm.people.find(p => p.id === x.personId)?.memberId === m.memberId))
    const beforeMeet = nextMeet ? list.filter(x => x.dueAt && t(x.dueAt) < t(nextMeet.startsAt)) : []
    if (late.length >= 2 || list.length >= 3 || (late.length && oppLinked.length) || beforeMeet.length) {
      const ev: Evidence[] = [{ text: `${list.length} open ${list.length === 1 ? 'promise' : 'promises'} owed to ${who}; ${late.length} overdue.`, source: 'RECORDED' }]
      if (oppLinked.length) ev.push({ text: `${oppLinked.length} tied to an open opportunity.`, source: 'RECORDED' })
      if (beforeMeet.length && nextMeet) ev.push({ text: `${beforeMeet.length} due before your meeting on ${fmt(nextMeet.startsAt)}.`, source: 'RECORDED' })
      out.push({ key, title: `TRUST AT RISK — ${who}`, evidence: ev, tasks: list })
    }
  }
  return out
}

/* ───────────────────────── B/O) Red Team + Future Me ───────────────────────── */
export interface RedTeam { mustBeTrue: string[]; supports: Evidence[]; assumptions: string[]; missing: string[]; people: string[]; timing: string[]; counter: string[]; testers: { name: string; why: string; memberId?: string }[]; next: string[]; gap: Gap }
const lines = (s: string) => s.split(/\n|;|•/).map(x => x.trim()).filter(Boolean)
export function redTeam(d: Decision, inp: CeoInputs): RedTeam {
  const { g } = inp
  const opps = g.crm.opportunities.filter(o => d.linkedOpportunityIds.includes(o.id))
  const people = g.crm.people.filter(p => d.linkedPersonIds.includes(p.id))
  const assumptions = lines(d.assumptions)
  const supports: Evidence[] = []
  if (d.context.trim()) supports.push({ text: `Recorded context: ${d.context.trim().slice(0, 240)}`, source: 'RECORDED' })
  for (const o of opps) { const h = dealHealth(o, inp); supports.push({ text: `${o.name}: ${o.stageName || 'no stage'}, ${money(o.amount, o.currency)}, health ${h.label}.`, source: 'RECORDED' }) }
  const missing: string[] = []
  if (!d.context.trim()) missing.push('No evidence/context recorded.')
  if (!assumptions.length) missing.push('No assumptions written down — nothing can be tested.')
  if (!d.expectedOutcome.trim()) missing.push('No expected outcome recorded, so success is undefined.')
  if (!d.reviewDate) missing.push('No review date.')
  if (!opps.length && !people.length) missing.push('No linked people or opportunities.')
  if (d.options.length < 2) missing.push(d.options.length ? 'Only one option recorded.' : 'No alternative options recorded.')
  const peopleRisk: string[] = []
  for (const p of people) { const last = ago(lastTouch(g, p.id)); if (last === null) peopleRisk.push(`${p.fullName}: no recorded interaction.`); else if (last > 45) peopleRisk.push(`${p.fullName}: last interaction ${last} days ago.`) }
  for (const o of opps) { const n = peopleAt(g, o.companyId, '').length; if (o.companyId && n <= 1) peopleRisk.push(`${o.name} depends on ${n ? 'one' : 'no'} known relationship at the account.`) }
  const late = g.crm.tasks.filter(x => overdue(x) && (d.linkedPersonIds.includes(x.personId ?? '') || d.linkedOpportunityIds.includes(x.opportunityId ?? '')))
  if (late.length) peopleRisk.push(`${late.length} overdue linked ${late.length === 1 ? 'task/commitment' : 'tasks/commitments'}.`)
  const timing: string[] = []
  for (const o of opps) {
    if (o.expectedClose && t(o.expectedClose) < Date.now()) timing.push(`${o.name} close date ${fmt(o.expectedClose)} has passed.`)
    const h = dealHealth(o, inp); h.factors.filter(f => f.effect === 'down').forEach(f => timing.push(`${o.name}: ${f.label}`))
  }
  if (d.reviewDate && t(d.reviewDate) < Date.now() && !d.actualOutcome.trim()) timing.push('Review date passed without a recorded outcome.')
  const counter: string[] = []
  if (d.options.length > 1) d.options.filter(o => o !== d.chosenOption).forEach(o => counter.push(`Alternative recorded but not chosen: “${o}”. What would make it better?`))
  lines(d.risks).forEach(r => counter.push(`Your own recorded risk: ${r}`))
  if (opps.some(o => dealHealth(o, inp).label === 'At risk')) counter.push('A linked opportunity is At risk by the deal-health rule.')
  // Contradiction: expected outcome vs lost linked opps
  opps.filter(o => o.status === 'lost').forEach(o => counter.push(`Linked opportunity ${o.name} is recorded as lost.`))
  const words = tokens(`${d.title} ${d.assumptions} ${d.context}`)
  const testers = g.members.map(m => ({ m, hit: words.filter(w => tokens(`${m.expertise.join(' ')} ${m.offers.join(' ')} ${m.industry} ${m.title}`).includes(w)) }))
    .filter(x => x.hit.length >= 1).sort((a, b) => b.hit.length - a.hit.length).slice(0, 4)
    .map(x => ({ name: x.m.name, memberId: x.m.id, why: `Stated expertise/offers mention: ${x.hit.slice(0, 3).join(', ')}.` }))
  const mustBeTrue = [...assumptions, ...(d.expectedOutcome.trim() ? [`The expected outcome happens: ${d.expectedOutcome.trim()}`] : [])]
  const next = [
    ...assumptions.slice(0, 3).map(a => `Find one recorded fact that confirms or breaks: “${a}”.`),
    ...(missing.length ? [`Fill: ${missing[0]}`] : []),
    ...(testers[0] ? [`Ask ${testers[0].name} to pressure-test the riskiest assumption.`] : []),
  ]
  const known = [`${supports.length} supporting records`, `${assumptions.length} assumptions`, `${opps.length} opportunities / ${people.length} people linked`]
  return { mustBeTrue, supports, assumptions, missing, people: peopleRisk, timing, counter, testers, next,
    gap: { known, unknown: missing, improve: missing[0] ?? 'Record the actual outcome at review time.', action: { label: 'Edit decision', route: { view: 'decisions', arg: d.id } } } }
}

/* ───────────────────────── E) Reciprocity ───────────────────────── */
export interface HelpMatch { member: Member; ask: NetworkAsk | null; need: string; why: string[]; evidence: Evidence[]; action: string; context: string }
export function whoCanIHelp(g: GraphInputs): HelpMatch[] {
  const mine = tokens(`${g.me.offers.join(' ')} ${g.me.expertise.join(' ')} ${g.me.industries.join(' ')} ${g.me.whatIDo}`)
  if (!mine.length) return []
  const out: HelpMatch[] = []
  const seen = new Set<string>()
  const asks = g.asks.filter(a => !a.mine && a.visibility === 'network')
  for (const a of asks) {
    const m = g.members.find(x => x.id === a.memberId); if (!m) continue
    const hit = tokens(`${a.ask} ${a.detail} ${a.industry}`).filter(w => mine.includes(w))
    if (!hit.length) continue
    seen.add(`${m.id}:${a.ask}`)
    out.push({ member: m, ask: a, need: a.ask, why: [`Your offers/expertise share: ${hit.slice(0, 4).join(', ')}.`], evidence: [{ text: `Ask posted ${a.posted}: “${a.ask}”`, source: 'DIRECT' }, { text: `Your profile lists: ${g.me.offers.slice(0, 3).join(', ') || g.me.expertise.slice(0, 3).join(', ')}`, source: 'DIRECT' }], action: g.connections.includes(m.id) ? 'Reply to the Ask or message directly.' : 'Respond to the Ask or request an intro.', context: g.connections.includes(m.id) ? 'Connected' : m.mutuals.length ? `${m.mutuals.length} mutual${m.mutuals.length > 1 ? 's' : ''}` : 'No recorded path' })
  }
  for (const m of g.members) for (const need of m.needs) {
    if (seen.has(`${m.id}:${need}`)) continue
    const hit = tokens(need).filter(w => mine.includes(w)); if (!hit.length) continue
    out.push({ member: m, ask: null, need, why: [`Your offers/expertise share: ${hit.slice(0, 4).join(', ')}.`], evidence: [{ text: `Profile “Looking for”: ${need}`, source: 'DIRECT' }], action: 'Offer help or suggest someone who can.', context: g.connections.includes(m.id) ? 'Connected' : m.mutuals.length ? `${m.mutuals.length} mutual${m.mutuals.length > 1 ? 's' : ''}` : 'No recorded path' })
  }
  return out.sort((a, b) => (b.why[0]!.length - a.why[0]!.length) || (a.context === 'Connected' ? -1 : 1)).slice(0, 12)
}

/* ───────────────────────── F/G/N) Coverage + Influence ───────────────────────── */
export type FunctionalRole = 'Economic buyer' | 'Executive sponsor' | 'Operator/user' | 'Finance' | 'Procurement' | 'Technical' | 'Legal' | 'Unclassified'
export const influenceRoles = ['Champion', 'Decision maker', 'Blocker', 'Connector', 'Evaluator', 'Economic buyer', 'Unknown'] as const
export function functionalRole(title: string): FunctionalRole {
  const x = title.toLowerCase()
  if (!x.trim()) return 'Unclassified'
  if (/\b(cfo|finance|controller|treasur|accounting)\b/.test(x)) return 'Finance'
  if (/procure|purchas|sourcing|vendor manag/.test(x)) return 'Procurement'
  if (/legal|counsel|attorney|compliance/.test(x)) return 'Legal'
  if (/\b(cto|cio|ciso|engineer|architect|technical|developer|it\b|data|security)/.test(x)) return 'Technical'
  if (/\b(ceo|owner|founder|president|managing partner|principal|chief executive)\b/.test(x)) return 'Economic buyer'
  if (/\b(coo|cmo|cro|chief|evp|svp|vp|vice president|head of|director)\b/.test(x)) return 'Executive sponsor'
  if (/manager|operator|lead|specialist|coordinator|analyst|associate/.test(x)) return 'Operator/user'
  return 'Unclassified'
}
export interface CoverageRow { person: CrmPerson; member?: Member | undefined; functional: FunctionalRole; influence: string; connected: boolean; last: number | null; health: string; openCommitments: number; opps: CrmOpportunity[] }
export interface Coverage { company: { id: string | null; name: string }; rows: CoverageRow[]; opps: CrmOpportunity[]; singleThread: boolean; missingRoles: FunctionalRole[]; gap: Gap }
export function companyCoverage(key: string, inp: CeoInputs): Coverage | null {
  const { g } = inp
  const k = key.trim().toLowerCase()
  const co: CrmCompany | undefined = inp.companies.find(c => c.id === key) ?? inp.companies.find(c => c.name.toLowerCase() === k) ?? (k ? inp.companies.find(c => c.name.toLowerCase().includes(k)) : undefined)
  const name = co?.name ?? (key && !inp.companies.length ? key : '')
  if (!co && !name) return null
  const people = peopleAt(g, co?.id ?? null, name)
  const opps = g.crm.opportunities.filter(o => !o.archived && ((co && o.companyId === co.id) || people.some(p => p.id === o.personId)))
  const rows: CoverageRow[] = people.map(p => {
    const member = memberOf(g, p)
    const tag = inp.marks.find(m => m.kind === 'influence' && m.subjectId === p.id)
    return { person: p, member, functional: functionalRole(p.title), influence: tag?.label || 'Unknown', connected: member ? g.connections.includes(member.id) : false, last: ago(lastTouch(g, p.id)),
      health: member ? relationshipHealth(member, g).state : (ago(lastTouch(g, p.id)) ?? 999) <= 30 ? 'ACTIVE (CRM)' : 'NOT TRACKED',
      openCommitments: g.crm.tasks.filter(x => x.personId === p.id && openTask(x)).length, opps: opps.filter(o => o.personId === p.id) }
  })
  const open = opps.filter(o => o.status === 'open')
  const have = new Set(rows.map(r => r.functional))
  const missingRoles = (open.length ? (['Economic buyer', 'Executive sponsor', 'Finance', 'Technical'] as FunctionalRole[]) : []).filter(r => !have.has(r))
  const singleThread = open.some(o => o.amount > 0) && rows.length <= 1
  const hasEB = rows.some(r => r.influence === 'Economic buyer' || r.influence === 'Decision maker' || r.functional === 'Economic buyer')
  return { company: { id: co?.id ?? null, name: co?.name ?? name }, rows, opps, singleThread, missingRoles,
    gap: { known: [`${rows.length} known ${rows.length === 1 ? 'person' : 'people'}`, `${open.length} open opportunities`], unknown: [...(hasEB ? [] : ['No economic buyer or decision maker is identified.']), ...missingRoles.map(r => `No ${r} relationship recorded.`)],
      improve: hasEB ? 'Add a second relationship to remove single-thread risk.' : 'Tag or add the economic buyer.', action: { label: 'Open CRM', route: { page: 'crm' } } } }
}
export function singleThreadAccounts(inp: CeoInputs): Coverage[] {
  const ids = new Set(openOpps(inp.g).map(o => o.companyId).filter(Boolean) as string[])
  return [...ids].map(id => companyCoverage(id, inp)).filter((c): c is Coverage => !!c && c.singleThread)
}

/* ───────────────────────── H/M) Strategic + Bench ───────────────────────── */
export interface StrategicRow { mark: Mark; name: string; memberId?: string | undefined; last: number | null; dueIn: number | null; health: string; commitments: number; opps: string[]; mission: string }
export function strategicRows(inp: CeoInputs, kind: 'strategic' | 'bench' = 'strategic'): StrategicRow[] {
  const { g } = inp
  return inp.marks.filter(m => m.kind === kind).map(mark => {
    const member = g.members.find(m => m.id === mark.subjectId)
    const person = g.crm.people.find(p => p.id === mark.subjectId) ?? (member ? g.crm.personForMember(member.id) : undefined)
    const last = daysSinceSubject(inp, mark.subjectId)
    const cadence = mark.cadenceDays ?? 30
    const dueIn = mark.nextTouch ? Math.ceil((t(mark.nextTouch) - Date.now()) / DAY) : last === null ? 0 : cadence - last
    return { mark, name: member?.name ?? person?.fullName ?? 'Unknown person', memberId: member?.id ?? person?.memberId ?? undefined, last, dueIn,
      health: member ? relationshipHealth(member, g).state : 'NOT TRACKED',
      commitments: person ? g.crm.tasks.filter(x => x.personId === person.id && openTask(x) && x.kind === 'commitment').length : 0,
      opps: person ? g.crm.opportunities.filter(o => o.personId === person.id && o.status === 'open' && !o.archived).map(o => o.name) : [],
      mission: mark.missionId ? g.missions.find(m => m.id === mark.missionId)?.title ?? '' : '' }
  }).sort((a, b) => (a.dueIn ?? 999) - (b.dueIn ?? 999))
}

/* ───────────────────────── I) CEO Time ROI ───────────────────────── */
export const timeCategories = ['Customer', 'Sales', 'Internal', 'Recruiting/Talent', 'Investor/Capital', 'Partner', 'Vendor', 'Board', 'Strategy', 'Other'] as const
export type TimeCategory = typeof timeCategories[number]
export function meetingCategory(title: string, kind: string): { category: TimeCategory; inferred: boolean } {
  const recorded = timeCategories.find(c => c.toLowerCase() === kind.toLowerCase())
  if (recorded) return { category: recorded, inferred: false }
  const x = title.toLowerCase()
  const rules: [RegExp, TimeCategory][] = [[/board/, 'Board'], [/investor|fundrais|vc\b|capital|lp\b/, 'Investor/Capital'], [/interview|hiring|recruit|candidate|talent/, 'Recruiting/Talent'],
    [/customer|client|qbr|renewal|onboard/, 'Customer'], [/demo|pitch|prospect|sales|proposal|pipeline/, 'Sales'], [/partner|alliance/, 'Partner'], [/vendor|supplier|procure/, 'Vendor'],
    [/strategy|planning|offsite|roadmap/, 'Strategy'], [/1:1|one on one|standup|stand-up|sync|team|all hands|internal|weekly/, 'Internal']]
  const hit = rules.find(([r]) => r.test(x))
  return { category: hit ? hit[1] : 'Other', inferred: true }
}
export interface TimeRoi { days: number; total: number; hours: number; byCategory: { category: TimeCategory; hours: number; count: number; inferred: number }[]; withDecision: number; withCommitment: number; withOppMove: number; noOutcome: { id: string; title: string; when: string; category: TimeCategory }[]; delegation: { title: string; count: number }[] }
export function timeRoi(inp: CeoInputs, days: number): TimeRoi {
  const { g } = inp
  const from = Date.now() - days * DAY
  const list = inp.meetings.filter(m => t(m.startsAt) >= from && t(m.startsAt) <= Date.now())
  const by = new Map<TimeCategory, { hours: number; count: number; inferred: number }>()
  let withDecision = 0, withCommitment = 0, withOppMove = 0
  const noOutcome: TimeRoi['noOutcome'] = []
  const repeats = new Map<string, number>()
  for (const m of list) {
    const { category, inferred } = meetingCategory(m.title, m.kind)
    const h = Math.max(0, (t(m.endsAt) - t(m.startsAt)) / 3_600_000)
    const cur = by.get(category) ?? { hours: 0, count: 0, inferred: 0 }
    by.set(category, { hours: cur.hours + h, count: cur.count + 1, inferred: cur.inferred + (inferred ? 1 : 0) })
    const dec = inp.decisions.some(d => d.linkedEventIds.includes(m.id))
    const com = g.crm.tasks.some(x => x.calendarEventId === m.id)
    const acts = g.crm.activities.filter(a => a.calendarEventId === m.id)
    const opp = acts.some(a => a.opportunityId) || inp.events.some(e => e.entityType === 'crm_opportunities' && Math.abs(t(e.createdAt) - t(m.endsAt)) < DAY && e.event !== 'created')
    if (dec) withDecision++
    if (com) withCommitment++
    if (opp) withOppMove++
    if (!dec && !com && !acts.length && !m.notes.trim()) {
      noOutcome.push({ id: m.id, title: m.title, when: m.startsAt, category })
      if (category === 'Internal') { const k = m.title.trim().toLowerCase(); repeats.set(k, (repeats.get(k) ?? 0) + 1) }
    }
  }
  const byCategory = [...by.entries()].map(([category, v]) => ({ category, ...v, hours: Math.round(v.hours * 10) / 10 })).sort((a, b) => b.hours - a.hours)
  return { days, total: list.length, hours: Math.round(byCategory.reduce((s, c) => s + c.hours, 0) * 10) / 10, byCategory, withDecision, withCommitment, withOppMove, noOutcome,
    delegation: [...repeats.entries()].filter(([, n]) => n >= 2).map(([title, count]) => ({ title, count })) }
}

/* ───────────────────────── K/L) Collisions + Company match ───────────────────────── */
export interface Collision { a: Member; b: Member; why: string[]; gainA: string; gainB: string; path: string; whyNow: string; context: string; evidence: Evidence[] }
export function collisions(g: GraphInputs, limit = 10): Collision[] {
  const out: Collision[] = []
  const mission = activeMission(g.missions)
  for (const a of g.members) {
    const needs = [...a.needs, ...g.asks.filter(x => x.memberId === a.id && x.visibility === 'network').map(x => x.ask)]
    for (const need of needs) {
      const nw = tokens(need); if (!nw.length) continue
      for (const b of g.members) {
        if (b.id === a.id) continue
        const offer = b.offers.find(o => tokens(o).filter(w => nw.includes(w)).length >= 1) ?? b.expertise.find(o => tokens(o).filter(w => nw.includes(w)).length >= 1)
        if (!offer) continue
        const hit = tokens(offer).filter(w => nw.includes(w))
        const both = g.connections.includes(a.id) && g.connections.includes(b.id)
        const ask = g.asks.find(x => x.memberId === a.id && x.ask === need)
        out.push({ a, b, why: [`${a.name} needs “${need}”; ${b.name} offers “${offer}” (shared: ${hit.join(', ')}).`], gainA: need, gainB: a.offers[0] ? `Access to ${a.name}'s stated offer: ${a.offers[0]}` : 'Not recorded',
          path: both ? 'You know both directly — you are the warm connector.' : g.connections.includes(a.id) || g.connections.includes(b.id) ? 'You know one side directly.' : 'No recorded path.',
          whyNow: ask ? `Active Ask posted ${ask.posted}${ask.urgency === 'high' ? ', marked urgent' : ''}.` : mission && tokens(mission.objective).some(w => nw.includes(w)) ? 'Overlaps your active Mission.' : 'Stated on profile; timing not recorded.',
          context: `${a.name} is looking for ${need}. ${b.name} works on ${offer}. I think a short call would be useful to both.`,
          evidence: [{ text: `${a.name}: ${need}`, source: 'DIRECT' }, { text: `${b.name}: ${offer}`, source: 'DIRECT' }] })
        break
      }
    }
  }
  const rank = (c: Collision) => (c.path.startsWith('You know both') ? 2 : c.path.startsWith('You know one') ? 1 : 0) + (c.whyNow.startsWith('Active') ? 1 : 0)
  return out.sort((x, y) => rank(y) - rank(x)).slice(0, limit)
}
export interface CompanyMatch { a: string; b: string; need: string; capability: string; initiators: string[]; path: string; evidence: Evidence[]; gap: string }
export function companyMatches(g: GraphInputs, limit = 8): CompanyMatch[] {
  const byCo = new Map<string, Member[]>()
  for (const m of g.members) if (m.company.trim()) byCo.set(m.company, [...(byCo.get(m.company) ?? []), m])
  const cos = [...byCo.entries()]
  const out: CompanyMatch[] = []
  for (const [a, am] of cos) {
    const needs = am.flatMap(m => m.needs)
    for (const need of needs) {
      const nw = tokens(need)
      for (const [b, bm] of cos) {
        if (a === b) continue
        const cap = bm.flatMap(m => [...m.offers, ...m.expertise]).find(o => tokens(o).filter(w => nw.includes(w)).length >= 2)
        if (!cap) continue
        const known = [...am, ...bm].filter(m => g.connections.includes(m.id))
        out.push({ a, b, need, capability: cap, initiators: known.map(m => m.name), path: known.length ? `You know ${known.map(m => m.name).join(', ')}.` : 'No recorded path.',
          evidence: [{ text: `${a} member need: ${need}`, source: 'DIRECT' }, { text: `${b} member offer/expertise: ${cap}`, source: 'DIRECT' }],
          gap: 'Company-level need/capability is inferred from member statements — confirm with the company.' })
        break
      }
    }
  }
  return out.slice(0, limit)
}

/* ───────────────────────── P) Executive Replay ───────────────────────── */
export interface ReplayStep { at: string; kind: string; text: string; source: Provenance }
export function replay(arg: string, inp: CeoInputs, memberId?: string): { subject: string; steps: ReplayStep[] } | null {
  const { g } = inp
  const k = arg.trim().toLowerCase()
  const member = memberId ? g.members.find(m => m.id === memberId) : k ? g.members.find(m => m.name.toLowerCase().includes(k)) : undefined
  const person = member ? g.crm.personForMember(member.id) : k ? g.crm.people.find(p => p.fullName.toLowerCase().includes(k)) : undefined
  const opp = !member && !person && k ? g.crm.opportunities.find(o => o.name.toLowerCase().includes(k)) : undefined
  const co = !member && !person && !opp && k ? inp.companies.find(c => c.name.toLowerCase().includes(k)) : undefined
  const dec = !member && !person && !opp && !co && k ? inp.decisions.find(d => d.title.toLowerCase().includes(k)) : undefined
  const steps: ReplayStep[] = []
  const ids = new Set<string>()
  if (person) { ids.add(person.id); steps.push({ at: person.createdAt, kind: 'First record', text: `${person.fullName} added to CRM${person.source ? ` from ${person.source}` : ''}.`, source: 'RECORDED' }) }
  if (opp) { ids.add(opp.id); steps.push({ at: opp.createdAt, kind: 'Opportunity', text: `${opp.name} opened${opp.source ? ` (source: ${opp.source})` : ''}.`, source: 'RECORDED' }) }
  if (co) { ids.add(co.id); steps.push({ at: co.createdAt, kind: 'First record', text: `${co.name} added to CRM.`, source: 'RECORDED' }) }
  if (dec) {
    steps.push({ at: dec.createdAt, kind: 'Decision', text: `Opened “${dec.title}”.`, source: 'RECORDED' })
    if (dec.decidedAt) steps.push({ at: dec.decidedAt, kind: 'Decision', text: `Decided: ${dec.chosenOption || 'choice not recorded'}.`, source: 'RECORDED' })
    if (dec.actualOutcome) steps.push({ at: dec.updatedAt, kind: 'Outcome', text: dec.actualOutcome, source: 'RECORDED' })
  }
  const oppIds = new Set(g.crm.opportunities.filter(o => (person && o.personId === person.id) || (co && o.companyId === co.id) || (opp && o.id === opp.id)).map(o => o.id))
  for (const o of g.crm.opportunities.filter(o => oppIds.has(o.id) && o.id !== opp?.id)) steps.push({ at: o.createdAt, kind: 'Opportunity', text: `${o.name} opened — now ${o.status}, ${o.stageName}.`, source: 'RECORDED' })
  for (const a of g.crm.activities.filter(a => (person && a.personId === person.id) || (co && a.companyId === co.id) || (a.opportunityId && oppIds.has(a.opportunityId))))
    steps.push({ at: a.occurredAt, kind: a.kind === 'intro' ? 'Intro' : a.kind === 'meeting' ? 'Meeting' : a.kind === 'message' ? 'Message' : 'Activity', text: a.subject || a.kind, source: 'OBSERVED' })
  for (const x of g.crm.tasks.filter(x => (person && x.personId === person.id) || (co && x.companyId === co.id) || (x.opportunityId && oppIds.has(x.opportunityId))))
    steps.push({ at: x.createdAt, kind: x.kind === 'commitment' ? 'Commitment' : 'Task', text: `${x.title} — ${x.status}`, source: 'RECORDED' })
  for (const e of inp.events.filter(e => ids.has(e.entityId) || oppIds.has(e.entityId))) steps.push({ at: e.createdAt, kind: 'Change', text: e.summary || e.event, source: 'RECORDED' })
  if (member) for (const m of inp.meetings.filter(m => m.memberId === member.id)) steps.push({ at: m.startsAt, kind: 'Meeting', text: m.title, source: 'RECORDED' })
  for (const d of inp.decisions.filter(d => d !== dec && ((person && d.linkedPersonIds.includes(person.id)) || [...oppIds].some(id => d.linkedOpportunityIds.includes(id)) || (co && d.linkedCompanyIds.includes(co.id)))))
    steps.push({ at: d.decidedAt ?? d.createdAt, kind: 'Decision', text: d.title, source: 'RECORDED' })
  const subject = member?.name ?? person?.fullName ?? opp?.name ?? co?.name ?? dec?.title
  if (!subject) return null
  return { subject, steps: steps.filter(s => Number.isFinite(t(s.at))).sort((a, b) => t(a.at) - t(b.at)) }
}

/* ───────────────────────── Q) Patterns ───────────────────────── */
export interface Pattern { label: string; value: string; sample: number; small: boolean; note: string }
export const PATTERN_MIN = 5
export function patterns(inp: CeoInputs): Pattern[] {
  const { g } = inp
  const closed = g.crm.opportunities.filter(o => !o.archived && (o.status === 'won' || o.status === 'lost'))
  const out: Pattern[] = []
  const push = (label: string, value: string, sample: number, note: string) => out.push({ label, value, sample, small: sample < PATTERN_MIN, note })
  if (!closed.length) return out
  const bySource = new Map<string, { won: number; n: number }>()
  for (const o of closed) { const s = o.source.trim() || 'Not recorded'; const v = bySource.get(s) ?? { won: 0, n: 0 }; bySource.set(s, { won: v.won + (o.status === 'won' ? 1 : 0), n: v.n + 1 }) }
  for (const [s, v] of bySource) push(`Win rate — source: ${s}`, `${Math.round((v.won / v.n) * 100)}%`, v.n, `${v.won} won of ${v.n} closed.`)
  const won = closed.filter(o => o.status === 'won')
  const cycles = won.map(o => (t(o.updatedAt) - t(o.createdAt)) / DAY).filter(x => Number.isFinite(x) && x >= 0)
  if (cycles.length) push('Median cycle time (won)', `${Math.round(median(cycles))} days`, cycles.length, 'Created → last update on won deals. Approximate: uses record timestamps.')
  const lost = closed.filter(o => o.status === 'lost')
  if (lost.length) { const st = new Map<string, number>(); lost.forEach(o => st.set(o.stageName || 'Not recorded', (st.get(o.stageName || 'Not recorded') ?? 0) + 1)); const top = [...st.entries()].sort((a, b) => b[1] - a[1])[0]!; push('Most common stage for lost deals', top[0], lost.length, `${top[1]} of ${lost.length} lost deals stopped here.`) }
  const multi = (o: CrmOpportunity) => peopleAt(g, o.companyId, '').length >= 2
  const withMulti = closed.filter(multi), single = closed.filter(o => !multi(o))
  if (withMulti.length && single.length) push('Win rate — multi-threaded vs single', `${Math.round(withMulti.filter(o => o.status === 'won').length / withMulti.length * 100)}% vs ${Math.round(single.filter(o => o.status === 'won').length / single.length * 100)}%`, closed.length, 'Association only — not proof that coverage caused the result.')
  const intro = closed.filter(o => /intro|referral/i.test(o.source))
  if (intro.length) push('Win rate — intro/referral sourced', `${Math.round(intro.filter(o => o.status === 'won').length / intro.length * 100)}%`, intro.length, `vs ${closed.length - intro.length} other closed deals.`)
  const lateOpp = closed.filter(o => g.crm.tasks.some(x => x.opportunityId === o.id && x.dueAt && x.status !== 'cancelled' && t(x.dueAt) < t(o.updatedAt)))
  if (lateOpp.length) push('Closed deals that had late tasks', `${Math.round(lateOpp.filter(o => o.status === 'lost').length / lateOpp.length * 100)}% lost`, lateOpp.length, 'Association only, never causation.')
  return out
}

/* ───────────────────────── D) Confidence gaps for existing features ───────────────────────── */
export function forecastGap(g: GraphInputs): Gap {
  const open = openOpps(g)
  const unknown: string[] = []
  const noClose = open.filter(o => !o.expectedClose).length
  const noPerson = open.filter(o => !o.personId).length
  const noNext = open.filter(o => !o.nextAction.trim()).length
  if (noClose) unknown.push(`${noClose} open ${noClose === 1 ? 'deal has' : 'deals have'} no close date.`)
  if (noPerson) unknown.push(`${noPerson} ${noPerson === 1 ? 'has' : 'have'} no linked person / economic buyer.`)
  if (noNext) unknown.push(`${noNext} ${noNext === 1 ? 'has' : 'have'} no next action.`)
  return { known: [`${open.length} open opportunities with amount and probability`], unknown, improve: unknown[0] ? 'Fill the missing fields on those deals.' : 'Forecast inputs are complete.', action: { label: 'Open Work', route: { page: 'crm' } } }
}
export function whoGap(problem: string, g: GraphInputs, count: number): Gap {
  const unknown: string[] = []
  if (!problem.trim()) unknown.push('No problem described.')
  if (tokens(problem).length < 2) unknown.push('The problem is too short to match strongly.')
  if (!g.me.offers.length) unknown.push('Your own offers are not recorded, so “why you matter to them” is weak.')
  if (!count) unknown.push('No member states matching offers or expertise.')
  return { known: [`${g.members.length} members searched`, `${count} matches`], unknown, improve: unknown[0] ? 'Add a target company, industry or specific outcome.' : 'Matches rest on stated offers and your recorded paths.' }
}
