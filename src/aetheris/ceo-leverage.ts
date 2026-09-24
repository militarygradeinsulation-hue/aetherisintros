/** Deterministic CEO leverage engines. Every finding cites recorded or direct evidence. */
import type { CeoInputs, NegotiationRoom, ScenarioRoom } from './ceo-engine'
import { functionalRole, replay, timeRoi, type Evidence, type Gap, type ReplayStep } from './ceo-insights'
import { activeMission, missionFit, routeTo, tokens } from './opportunity-graph'
import type { Member } from './social'

const DAY = 86_400_000
const at = (v: string | null | undefined) => v ? new Date(v).getTime() : NaN
const days = (v: string | null | undefined) => { const x = at(v); return Number.isFinite(x) ? Math.max(0, Math.floor((Date.now() - x) / DAY)) : null }
const open = (status: string) => status !== 'done' && status !== 'cancelled'
const latest = (values: (string | null | undefined)[]) => values.filter(Boolean).reduce<string | null>((best, v) => !best || at(v) > at(best) ? v ?? best : best, null)

export interface RiskRow { id: string; company: string; level: 'WATCH' | 'AT RISK'; reasons: Evidence[]; missing: string[]; next: string; companyId: string | null }
export function customerRisk(inp: CeoInputs): RiskRow[] {
  const { g } = inp
  const customerPeople = g.crm.people.filter(p => !p.archived && p.lifecycle === 'Customer')
  const ids = new Set(customerPeople.map(p => p.companyId).filter(Boolean) as string[])
  for (const o of g.crm.opportunities.filter(o => !o.archived && o.status === 'open' && o.companyId)) ids.add(o.companyId!)
  const rows: RiskRow[] = []
  for (const companyId of ids) {
    const co = inp.companies.find(c => c.id === companyId)
    const people = g.crm.people.filter(p => p.companyId === companyId && !p.archived)
    const opps = g.crm.opportunities.filter(o => o.companyId === companyId && !o.archived && o.status === 'open')
    const tasks = g.crm.tasks.filter(t => t.companyId === companyId && open(t.status))
    const acts = g.crm.activities.filter(a => a.companyId === companyId || people.some(p => p.id === a.personId))
    const last = latest([...acts.map(a => a.occurredAt), ...people.map(p => p.lastActivityAt)])
    const staleDays = days(last)
    const reasons: Evidence[] = []
    const late = tasks.filter(t => t.dueAt && at(t.dueAt) < Date.now())
    if (staleDays === null) reasons.push({ text: 'No account or contact activity is recorded.', source: 'RECORDED' })
    else if (staleDays > 45) reasons.push({ text: `No recorded account/contact activity for ${staleDays} days.`, source: 'OBSERVED' })
    if (late.length >= 2) reasons.push({ text: `${late.length} overdue promises or tasks.`, source: 'RECORDED' })
    if (people.length <= 1 && opps.length) reasons.push({ text: `${people.length || 'No'} known relationship${people.length === 1 ? '' : 's'} across ${opps.length} open opportunities.`, source: 'INFERRED' })
    if (people.length && !people.some(p => /chief|ceo|owner|founder|president|vp|vice president|head|director/i.test(p.title))) reasons.push({ text: 'No executive relationship is identified by recorded titles.', source: 'INFERRED' })
    const stale = opps.filter(o => (days(latest([o.updatedAt, ...acts.filter(a => a.opportunityId === o.id).map(a => a.occurredAt)])) ?? 999) > 30)
    if (stale.length) reasons.push({ text: `${stale.length} open opportunit${stale.length === 1 ? 'y is' : 'ies are'} stale for 30+ days.`, source: 'OBSERVED' })
    const memberIds = people.map(p => p.memberId).filter(Boolean)
    const future = inp.meetings.some(m => m.memberId && memberIds.includes(m.memberId) && at(m.startsAt) > Date.now())
    if (!future) reasons.push({ text: 'No future meeting is recorded with a known account contact.', source: 'RECORDED' })
    if (!reasons.length) continue
    const severe = late.length >= 2 || reasons.length >= 3
    rows.push({ id: companyId, company: co?.name ?? people[0]?.companyName ?? 'Unidentified account', level: severe ? 'AT RISK' : 'WATCH', reasons, missing: [...(!people.length ? ['Known account contact'] : []), ...(!future ? ['Future meeting'] : [])], next: late.length ? 'Review and renegotiate overdue commitments.' : people.length <= 1 ? 'Add an executive or second relationship.' : 'Schedule the next evidence-producing conversation.', companyId })
  }
  return rows.sort((a, b) => (a.level === 'AT RISK' ? 0 : 1) - (b.level === 'AT RISK' ? 0 : 1))
}

export interface CapitalMatch { member: Member; capitalType: string; evidence: Evidence[]; path: string; relationship: string; gap: Gap; next: string }
export function capitalMap(inp: CeoInputs): CapitalMatch[] {
  const mission = activeMission(inp.g.missions)
  const capitalMission = mission?.missionType === 'capital' ? mission : undefined
  const rows: CapitalMatch[] = []
  for (const m of inp.g.members) {
    const direct = [...m.offers, ...m.expertise, m.title, m.role, m.industry].filter(x => /invest|capital|lender|credit|debt|venture|private equity|family office|bank/i.test(x))
    const crm = inp.g.crm.personForMember(m.id)
    const lifecycle = crm?.lifecycle === 'Investor'
    if (!direct.length && !lifecycle) continue
    const typeEvidence = direct.find(x => /family office|private equity|venture|credit|debt|lender|bank|strategic capital/i.test(x))
    const route = routeTo(m, inp.g)
    const fit = capitalMission ? missionFit(m, capitalMission) : { score: 0, reasons: [] }
    rows.push({ member: m, capitalType: typeEvidence ?? (lifecycle ? 'Investor (CRM lifecycle)' : 'Not explicitly recorded'), evidence: [
      ...(direct.length ? [{ text: `Profile states: ${direct.slice(0, 3).join(' · ')}`, source: 'DIRECT' as const }] : []),
      ...(lifecycle ? [{ text: 'CRM lifecycle is Investor.', source: 'RECORDED' as const }] : []),
      ...fit.reasons.map(r => ({ text: r.evidence, source: 'INFERRED' as const })),
    ], path: route.best?.labels.join(' → ') ?? 'No recorded warm path', relationship: inp.g.connections.includes(m.id) ? 'Connected' : crm ? 'In CRM' : m.introState,
    gap: { known: [`${direct.length + (lifecycle ? 1 : 0)} explicit capital evidence point(s)`], unknown: [...(!typeEvidence ? ['Specific capital type is not recorded.'] : []), ...(!route.best ? ['No recorded warm path.'] : [])], improve: !typeEvidence ? 'Record the capital type only after the person states it.' : 'Confirm mandate and fit directly.' },
    next: inp.g.connections.includes(m.id) ? `Ask ${m.name.split(' ')[0]} whether the recorded mandate fits.` : route.best?.hops[0] ? `Request a double-opt-in path through ${route.best.hops[0].name}.` : 'Post a specific capital Mission or request a direct introduction.' })
  }
  return rows.sort((a, b) => b.evidence.length - a.evidence.length).slice(0, 12)
}

export type ExpertKind = 'advisor' | 'board'
export interface ExpertMatch { member: Member; evidence: Evidence[]; path: string; gap: string[] }
export function expertMatches(problem: string, kind: ExpertKind, inp: CeoInputs): ExpertMatch[] {
  const q = tokens(problem)
  const rows: ExpertMatch[] = []
  for (const member of inp.g.members) {
    const statements = [...member.expertise, ...member.offers, ...(member.openTo ?? []), member.title, member.role]
    const role = kind === 'board' ? statements.filter(x => /board|director|chair|advisor/i.test(x)) : statements.filter(x => /advisor|advisory|expert|mentor|specialist/i.test(x))
    const subject = q.length ? statements.filter(x => tokens(x).some(w => q.includes(w))) : []
    if (!role.length && !subject.length) continue
    const route = routeTo(member, inp.g)
    rows.push({ member, evidence: [...role.slice(0, 2).map(text => ({ text, source: 'DIRECT' as const })), ...subject.slice(0, 2).map(text => ({ text: `Problem match: ${text}`, source: 'DIRECT' as const }))], path: route.best?.labels.join(' → ') ?? 'No recorded warm path', gap: [...(!role.length ? [`No explicit ${kind} role is stated.`] : []), ...(!subject.length && q.length ? ['No subject-specific match is stated.'] : []), ...(!route.best ? ['No warm path recorded.'] : [])] })
  }
  return rows.sort((a, b) => b.evidence.length - a.evidence.length).slice(0, 12)
}

export interface Dependency { company: string; people: string[]; evidence: Evidence[]; missing: string[]; level: 'WATCH' | 'HIGH' }
export function keyDependencies(inp: CeoInputs): Dependency[] {
  const companies = new Set(inp.g.crm.opportunities.filter(o => !o.archived && o.status === 'open' && o.companyId).map(o => o.companyId as string))
  return [...companies].map(id => {
    const company = inp.companies.find(c => c.id === id)
    const people = inp.g.crm.people.filter(p => p.companyId === id && !p.archived)
    const active = people.filter(p => inp.g.crm.activities.some(a => a.personId === p.id) || p.lastActivityAt)
    const decisions = people.filter(p => ['Economic buyer', 'Executive sponsor'].includes(functionalRole(p.title)))
    if (active.length > 1 && decisions.length > 1) return null
    const opps = inp.g.crm.opportunities.filter(o => o.companyId === id && o.status === 'open' && !o.archived)
    return { company: company?.name ?? people[0]?.companyName ?? 'Unknown company', people: active.map(p => p.fullName), evidence: [{ text: `${opps.length} open opportunities; ${active.length} active known relationships; ${decisions.length} executive/economic-buyer titles.`, source: 'INFERRED' }], missing: [...(active.length <= 1 ? ['A second active relationship'] : []), ...(!decisions.length ? ['Recorded executive or economic buyer'] : [])], level: active.length <= 1 && opps.length ? 'HIGH' : 'WATCH' }
  }).filter((x): x is Dependency => Boolean(x))
}

export function delegationCandidates(inp: CeoInputs) {
  const roi = timeRoi(inp, 90)
  const taskRows = inp.g.crm.tasks.filter(t => open(t.status) && /follow.?up|schedule|coordinate|send|update|admin|book/i.test(`${t.title} ${t.detail}`) && (!t.assignee || /me|ceo/i.test(t.assignee)))
  return [
    ...roi.delegation.map(x => ({ id: `meeting-${x.title}`, title: x.title, why: `${x.count} repeated internal meetings produced no recorded decision, commitment, activity or notes.`, source: 'OBSERVED' as const })),
    ...taskRows.map(t => ({ id: `task-${t.id}`, title: t.title, why: `Open operational follow-up assigned to ${t.assignee || 'the CEO'}; review suitability before assigning.`, source: 'RECORDED' as const })),
  ]
}

export function scenarioProjection(type: ScenarioRoom['scenarioType'], opp: { amount: number; probability: number; expectedClose: string | null } | undefined, assumptions: Record<string, number>) {
  const baseline = { amount: opp?.amount ?? 0, probability: opp?.probability ?? 0, weighted: opp ? opp.amount * opp.probability / 100 : 0, closeDelayDays: 0, revenueImpact: 0, costImpact: 0 }
  const result = { ...baseline }
  if (type === 'deal_slip') result.closeDelayDays = Math.max(0, assumptions['days'] ?? 0)
  if (type === 'opportunity_win') { result.probability = 100; result.weighted = result.amount }
  if (type === 'opportunity_loss' || type === 'customer_churn') { result.probability = 0; result.weighted = 0; result.revenueImpact = -(assumptions['revenue'] ?? result.amount) }
  if (type === 'probability') { result.probability = Math.max(0, Math.min(100, assumptions['probability'] ?? result.probability)); result.weighted = result.amount * result.probability / 100 }
  if (type === 'headcount') result.costImpact = (assumptions['headcount'] ?? 0) * (assumptions['annualCost'] ?? 0)
  if (type === 'revenue' || type === 'custom') result.revenueImpact = assumptions['revenue'] ?? 0
  return { baseline, result }
}

export function dealMemory(arg: string, inp: CeoInputs, memberId?: string) {
  const history = replay(arg, inp, memberId)
  if (!history) return null
  const unresolved: string[] = []
  const q = arg.toLowerCase()
  const opp = inp.g.crm.opportunities.find(o => o.name.toLowerCase().includes(q))
  const co = inp.companies.find(c => c.name.toLowerCase().includes(q))
  const people = co ? inp.g.crm.people.filter(p => p.companyId === co.id) : []
  for (const t of inp.g.crm.tasks.filter(t => open(t.status) && ((opp && t.opportunityId === opp.id) || (co && t.companyId === co.id) || people.some(p => p.id === t.personId)))) unresolved.push(`${t.title}${t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString()}` : ''}`)
  if (opp?.nextAction) unresolved.push(`Next action: ${opp.nextAction}`)
  const why = history.steps.length ? `${history.subject} exists in the graph because ${history.steps[0]!.text.toLowerCase()} Since then, ${history.steps.length - 1} timestamped change${history.steps.length === 2 ? '' : 's'} ${history.steps.length === 1 ? 'has' : 'have'} been recorded.` : `No timestamped history is recorded for ${history.subject}.`
  return { ...history, unresolved, why }
}

export function negotiationEvidence(room: Partial<NegotiationRoom>, inp: CeoInputs) {
  const opp = room.linkedOpportunityId ? inp.g.crm.opportunities.find(o => o.id === room.linkedOpportunityId) : undefined
  const person = room.linkedPersonId ? inp.g.crm.people.find(p => p.id === room.linkedPersonId) : undefined
  const tasks = inp.g.crm.tasks.filter(t => open(t.status) && (t.opportunityId === opp?.id || t.personId === person?.id))
  const marks = person ? inp.marks.filter(m => m.subjectId === person.id && m.kind === 'influence') : []
  const recorded: ReplayStep[] = [
    ...(opp ? [{ at: opp.updatedAt, kind: 'Opportunity', text: `${opp.name}: ${opp.stageName}, ${opp.probability}% recorded probability, next action “${opp.nextAction || 'not recorded'}”.`, source: 'RECORDED' as const }] : []),
    ...tasks.map(t => ({ at: t.createdAt, kind: t.kind === 'commitment' ? 'Commitment' : 'Task', text: `${t.title} — ${t.status}`, source: 'RECORDED' as const })),
    ...marks.map(m => ({ at: m.updatedAt, kind: 'Influence', text: `${person?.fullName}: ${m.label}`, source: 'RECORDED' as const })),
  ]
  return { opp, person, tasks, recorded, unknowns: [...(!person ? ['Counterpart person is not linked.'] : []), ...(!marks.length ? ['No manual influence or decision-maker tag is recorded.'] : []), ...(!room.counterpartPriorities?.trim() ? ['Counterpart priorities are not recorded.'] : []), ...(!room.batna?.trim() ? ['Your BATNA is not recorded.'] : [])] }
}