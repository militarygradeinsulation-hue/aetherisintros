/**
 * Diagnose engine. Deterministic, evidence-first. Reads only through the caller's
 * RLS client, cites every figure, never invents money, and turns weak signals into
 * "Unknown worth checking" instead of claims.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CauseStep, EntityRef, EvidenceRef, FindingDraft, ProposalDraft, ProviderId, ProviderReport,
} from '@/aetheris/capabilities/types'
import { enforceEvidenceRule } from '@/aetheris/capabilities/evidence'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any
export interface DiagnoseCtx {
  subject: EntityRef
  company: Row | null
  opps: Row[]
  people: Row[]
  tasks: Row[]
  activities: Row[]
  decisions: Row[]
  events: Row[]
  /** Table → error message for every source that could not be read (vs. read and empty). Optional so hand-built contexts stay valid. */
  sourceErrors?: Record<string, string>
}

const ref = (table: string, id: string, label: string): EvidenceRef => ({ kind: 'record', ref: `${table}:${id}`, label })
const DAY = 86_400_000
const days = (from: string | null | undefined, now: number) => (from ? Math.floor((now - new Date(from).getTime()) / DAY) : null)

/* ───────────── evidence gathering (RLS client only) ───────────── */

export async function gatherContext(db: SupabaseClient, subject: EntityRef, limit = 100): Promise<DiagnoseCtx> {
  const sourceErrors: Record<string, string> = {}
  const ctx: DiagnoseCtx = { subject, company: null, opps: [], people: [], tasks: [], activities: [], decisions: [], events: [], sourceErrors }
  /** Records a source failure so "unavailable" is never confused with "zero records". Returns true when one occurred. */
  const capErr = (table: string, error: { message?: string } | null | undefined): boolean => {
    if (!error) return false
    sourceErrors[table] = sourceErrors[table] ? `${sourceErrors[table]}; ${error.message ?? 'read failed'}` : (error.message ?? 'read failed')
    return true
  }
  const many = (table: string, res: { data: unknown; error: { message?: string } | null }): Row[] => (capErr(table, res.error) ? [] : ((res.data ?? []) as Row[]))
  const one = async (table: string, id: string) => {
    const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle()
    return capErr(table, error) ? null : (data as Row | null)
  }
  let companyId: string | null = null
  if (subject.type === 'company') companyId = subject.id
  if (subject.type === 'opportunity') {
    const o = await one('crm_opportunities', subject.id)
    if (o) { ctx.opps = [o]; companyId = o.company_id }
  }
  if (subject.type === 'person') {
    const p = await one('crm_people', subject.id)
    if (p) { ctx.people = [p]; companyId = p.company_id }
    ctx.opps = many('crm_opportunities', await db.from('crm_opportunities').select('*').eq('person_id', subject.id).eq('archived', false).order('updated_at', { ascending: false }).order('id').limit(limit))
  }
  if (subject.type === 'decision') {
    const d = await one('decisions', subject.id)
    if (d) ctx.decisions = [d]
    return ctx
  }
  if (companyId) {
    ctx.company = await one('crm_companies', companyId)
    if (subject.type === 'company') {
      ctx.opps = many('crm_opportunities', await db.from('crm_opportunities').select('*').eq('company_id', companyId).eq('archived', false).order('updated_at', { ascending: false }).order('id').limit(limit))
    }
    if (subject.type !== 'person') ctx.people = many('crm_people', await db.from('crm_people').select('*').eq('company_id', companyId).eq('archived', false).order('created_at', { ascending: false }).order('id').limit(limit))
    ctx.decisions = many('decisions', await db.from('decisions').select('*').contains('linked_company_ids', [companyId]).order('created_at', { ascending: false }).order('id').limit(25))
  }
  const oppIds = ctx.opps.map(o => o.id)
  const ors = [companyId && `company_id.eq.${companyId}`, oppIds.length && `opportunity_id.in.(${oppIds.join(',')})`, subject.type === 'person' && `person_id.eq.${subject.id}`].filter(Boolean).join(',')
  if (ors) {
    ctx.tasks = many('crm_tasks', await db.from('crm_tasks').select('*').or(ors).order('created_at', { ascending: false }).order('id').limit(limit))
    ctx.activities = many('crm_activities', await db.from('crm_activities').select('*').or(ors).order('occurred_at', { ascending: false }).order('id').limit(limit))
  }
  ctx.events = many('entity_events', await db.from('entity_events').select('event,summary,created_at,entity_type,entity_id').eq('entity_type', subject.type).eq('entity_id', subject.id).order('created_at', { ascending: false }).limit(30))
  return ctx
}

/* ───────────── providers ───────────── */

export interface ProviderOutput { report: ProviderReport; findings: FindingDraft[]; proposals: ProposalDraft[] }
type Provider = (ctx: DiagnoseCtx, now: number) => ProviderOutput

const NOT_CONNECTED: Record<string, string> = {
  asset: 'No asset or inventory source is connected.',
  vendor: 'No procurement or accounts-payable source is connected.',
  supply: 'No supply-chain or operations source is connected.',
  compliance: 'No compliance or policy source is connected.',
  access: 'No identity or access-management source is connected.',
}

const revenue: Provider = (ctx, now) => {
  const findings: FindingDraft[] = []
  const proposals: ProposalDraft[] = []
  const open = ctx.opps.filter(o => o.status === 'open' && !o.archived)
  for (const o of open) {
    const acts = ctx.activities.filter(a => a.opportunity_id === o.id || (!a.opportunity_id && a.company_id && a.company_id === o.company_id))
    const last = acts[0]
    const quiet = days(last?.occurred_at ?? null, now) ?? days(o.updated_at, now) ?? 0
    const overdue = ctx.tasks.filter(t => t.opportunity_id === o.id && t.due_at && new Date(t.due_at).getTime() < now && !['done', 'cancelled'].includes(t.status))
    const closePassed = o.expected_close && new Date(o.expected_close).getTime() < now
    const oppRef = ref('crm_opportunities', o.id, `${o.name} · ${o.stage_name || 'no stage'} · ${o.probability}%`)
    const amount = Number(o.amount) || 0
    const currency = String(o.currency || 'USD').toUpperCase()
    const hasMoney = amount > 0 && /^[A-Z]{3}$/.test(currency)
    const group = `opportunity:${o.id}`

    if (quiet >= 21) {
      const evidence: EvidenceRef[] = [oppRef]
      if (last) evidence.push(ref('crm_activities', last.id, `Last touch ${quiet} days ago: ${String(last.subject).slice(0, 60)}`))
      for (const t of overdue.slice(0, 2)) evidence.push(ref('crm_tasks', t.id, `Overdue: ${String(t.title).slice(0, 60)}`))
      const chain: CauseStep[] = [
        { step: 'Revenue exposure', detail: hasMoney ? `${o.name} is open at ${o.probability}% probability.` : `${o.name} is open with no recorded value.`, evidence: [oppRef], hypothesis: false },
        { step: 'Momentum change', detail: `No recorded touch for ${quiet} days.`, evidence: last ? [evidence[1]!] : [], hypothesis: !last },
        { step: 'Process gap', detail: overdue.length ? `${overdue.length} follow-up task${overdue.length > 1 ? 's are' : ' is'} overdue.` : o.next_action ? `Next action “${String(o.next_action).slice(0, 60)}” has no recorded completion.` : 'No next action is recorded.', evidence: overdue.slice(0, 2).map(t => ref('crm_tasks', t.id, String(t.title).slice(0, 60))), hypothesis: !overdue.length },
        { step: 'Possible cause (unverified)', detail: 'Ownership of the next step may be unclear or not being worked.', evidence: [], hypothesis: true },
      ]
      const key = `stale-${o.id}`
      findings.push(enforceEvidenceRule({
        key, kind: 'leak', provider: 'revenue', layer: 'fact',
        claim: `${o.name} is stalling: ${quiet} days without a recorded touch${overdue.length ? ` and ${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}` : ''}.`,
        severity: quiet >= 45 || amount >= 50_000 ? 'high' : 'medium', confidence: Math.min(80, 40 + evidence.length * 12),
        evidence, unknowns: ['Whether contact happened outside recorded channels', 'Whether the buyer’s priorities changed'],
        ...(hasMoney ? { financial_classification: 'estimated_exposure' as const, financial_low: Math.round(amount * (Number(o.probability) || 0) / 100), financial_high: amount, currency } : {}),
        root_cause: 'Possibly: the next step on this opportunity is not being worked (hypothesis, not verified).', cause_chain: chain, overlap_group: group,
        baseline_metric: { metric: 'days_since_touch', value: quiet, unit: 'days' }, target_metric: { metric: 'days_since_touch', value: 7, unit: 'days' },
      }))
      const person = ctx.people.find(p => p.id === o.person_id)
      proposals.push({ findingKey: key, impact: 'write', summary: `Create a follow-up task for ${o.name}, due in 2 days`, target: { type: 'opportunity', id: o.id },
        action: { kind: 'create_task', title: `Re-engage on ${o.name}`, detail: `Created from a Diagnose finding: ${quiet} days without a recorded touch.`, dueInDays: 2, opportunityId: o.id, companyId: o.company_id ?? null } })
      proposals.push({ findingKey: key, impact: 'draft', summary: `Draft a re-engagement note${person ? ` to ${person.full_name}` : ''}`, target: { type: 'opportunity', id: o.id },
        action: { kind: 'draft_note', text: `${person ? `Hi ${String(person.full_name).split(' ')[0]}, ` : ''}picking up where we left off on ${o.name}. Is the timing still right on your side, and is there anything you need from us to move forward?` } })
    }
    if (closePassed) {
      const evidence: EvidenceRef[] = [ref('crm_opportunities', o.id, `Expected close ${o.expected_close} has passed while still open`)]
      findings.push(enforceEvidenceRule({
        key: `close-${o.id}`, kind: 'risk', provider: 'revenue', layer: 'fact',
        claim: `${o.name} is past its expected close date and still open — this is a forecast risk until the close date is updated or the stage changes.`,
        severity: 'medium', confidence: 70, evidence, unknowns: ['The buyer’s actual decision date'],
        ...(hasMoney ? { financial_classification: 'risk_exposure' as const, financial_low: Math.round(amount * (Number(o.probability) || 0) / 100), financial_high: amount, currency } : {}),
        overlap_group: group,
        cause_chain: [{ step: 'Forecast risk', detail: 'Close date passed without a stage change.', evidence, hypothesis: false }],
      }))
    }
    if (!String(o.next_action ?? '').trim()) {
      findings.push({ key: `nna-${o.id}`, kind: 'gap', provider: 'revenue', layer: 'fact', claim: `${o.name} has no next action recorded.`, severity: 'low', confidence: 90,
        evidence: [oppRef], unknowns: [], overlap_group: group })
    }
  }
  const oppErr = ctx.sourceErrors?.['crm_opportunities']
  const note = oppErr ? `Source unavailable: ${oppErr}` : ctx.opps.length ? `${open.length} open opportunities read.` : 'No opportunities recorded for this subject.'
  return { report: { id: 'revenue', status: ctx.opps.length && !oppErr ? 'ok' : 'insufficient', note, evidenceCount: ctx.opps.length + ctx.activities.length }, findings, proposals }
}

const customer: Provider = ctx => {
  const findings: FindingDraft[] = []
  if (!ctx.company) return { report: { id: 'customer', status: 'insufficient', note: 'No company record in scope.', evidenceCount: 0 }, findings, proposals: [] }
  const active = ctx.people.filter(p => !p.archived)
  const open = ctx.opps.filter(o => o.status === 'open')
  const cRef = ref('crm_companies', ctx.company.id, ctx.company.name)
  if (open.length && active.length <= 1) {
    findings.push({ key: `single-${ctx.company.id}`, kind: 'risk', provider: 'customer', layer: 'fact',
      claim: active.length ? `${ctx.company.name} is single-threaded through ${active[0]!.full_name}.` : `${ctx.company.name} has open opportunities but no known contact.`,
      severity: 'medium', confidence: 75, evidence: [cRef, ...active.map(p => ref('crm_people', p.id, p.full_name)), ...open.slice(0, 1).map(o => ref('crm_opportunities', o.id, o.name))],
      unknowns: ['Who else influences the decision'], root_cause: 'Relationship coverage depends on one person.',
      cause_chain: [{ step: 'Coverage', detail: `${active.length} known relationship${active.length === 1 ? '' : 's'} at the account.`, evidence: [cRef], hypothesis: false }] })
  }
  return { report: { id: 'customer', status: 'ok', note: `${active.length} contacts, ${open.length} open opportunities.`, evidenceCount: active.length + 1 }, findings, proposals: [] }
}

const decision: Provider = (ctx, now) => {
  const findings: FindingDraft[] = []
  for (const d of ctx.decisions) {
    if (d.review_date && new Date(d.review_date).getTime() < now && !String(d.actual_outcome ?? '').trim() && d.status !== 'archived') {
      findings.push({ key: `assume-${d.id}`, kind: 'unknown', provider: 'decision', layer: 'fact',
        claim: `Assumption review is overdue on “${d.title}”.`, severity: 'medium', confidence: 85,
        evidence: [ref('decisions', d.id, `Review date ${d.review_date}; no actual outcome recorded`)],
        unknowns: [String(d.assumptions || 'The original assumptions').slice(0, 200)] })
    }
  }
  return { report: { id: 'decision', status: ctx.decisions.length ? 'ok' : 'insufficient', note: ctx.decisions.length ? `${ctx.decisions.length} linked decisions read.` : 'No decisions linked to this subject.', evidenceCount: ctx.decisions.length }, findings, proposals: [] }
}

const workforce: Provider = (ctx, now) => {
  const overdue = ctx.tasks.filter(t => t.due_at && new Date(t.due_at).getTime() < now && !['done', 'cancelled'].includes(t.status))
  const findings: FindingDraft[] = overdue.length >= 3 ? [{ key: 'followthrough', kind: 'gap', provider: 'workforce', layer: 'fact',
    claim: `${overdue.length} follow-ups on this account are overdue.`, severity: overdue.length >= 6 ? 'high' : 'medium', confidence: 90,
    evidence: overdue.slice(0, 4).map(t => ref('crm_tasks', t.id, String(t.title).slice(0, 60))), unknowns: ['Whether owners have capacity'] }] : []
  return { report: { id: 'workforce', status: ctx.tasks.length ? 'ok' : 'insufficient', note: ctx.tasks.length ? `${ctx.tasks.length} tasks read; no HR system connected.` : 'No tasks recorded; no HR system connected.', evidenceCount: ctx.tasks.length }, findings, proposals: [] }
}

const strategic: Provider = ctx => ({
  report: { id: 'strategic', status: ctx.events.length ? 'ok' : 'insufficient', note: ctx.events.length ? `${ctx.events.length} memory events read.` : 'Not enough recorded strategy context.', evidenceCount: ctx.events.length },
  findings: [], proposals: [],
})

const PROVIDERS: Record<ProviderId, Provider> = {
  revenue, customer, decision, workforce, strategic,
  asset: () => ({ report: { id: 'asset', status: 'not_connected', note: NOT_CONNECTED['asset']!, evidenceCount: 0 }, findings: [], proposals: [] }),
  vendor: () => ({ report: { id: 'vendor', status: 'not_connected', note: NOT_CONNECTED['vendor']!, evidenceCount: 0 }, findings: [], proposals: [] }),
  supply: () => ({ report: { id: 'supply', status: 'not_connected', note: NOT_CONNECTED['supply']!, evidenceCount: 0 }, findings: [], proposals: [] }),
  compliance: () => ({ report: { id: 'compliance', status: 'not_connected', note: NOT_CONNECTED['compliance']!, evidenceCount: 0 }, findings: [], proposals: [] }),
  access: () => ({ report: { id: 'access', status: 'not_connected', note: NOT_CONNECTED['access']!, evidenceCount: 0 }, findings: [], proposals: [] }),
}

/** What evidence the run could and could not read. `complete` is false when any source errored. */
export interface DataQuality {
  complete: boolean
  sourceErrors: Record<string, string>
  unavailableSources: string[]
  recordsRead: Record<string, number>
}

function dataQualityOf(ctx: DiagnoseCtx): DataQuality {
  const sourceErrors = { ...(ctx.sourceErrors ?? {}) }
  const unavailableSources = Object.keys(sourceErrors).sort()
  return {
    complete: unavailableSources.length === 0,
    sourceErrors,
    unavailableSources,
    recordsRead: {
      crm_companies: ctx.company ? 1 : 0, crm_opportunities: ctx.opps.length, crm_people: ctx.people.length, crm_tasks: ctx.tasks.length,
      crm_activities: ctx.activities.length, decisions: ctx.decisions.length, entity_events: ctx.events.length,
    },
  }
}

export function evaluateProviders(ctx: DiagnoseCtx, now = Date.now()) {
  const reports: ProviderReport[] = []
  const findings: FindingDraft[] = []
  const proposals: ProposalDraft[] = []
  for (const p of Object.values(PROVIDERS)) {
    const out = p(ctx, now)
    reports.push(out.report); findings.push(...out.findings.map(enforceEvidenceRule)); proposals.push(...out.proposals)
  }
  const sevRank = { critical: 4, high: 3, medium: 2, low: 1 }
  findings.sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || (b.financial_high ?? 0) - (a.financial_high ?? 0))
  // Proposals only for findings that survived the evidence rule as actionable.
  const actionable = new Set(findings.filter(f => f.kind !== 'unknown').map(f => f.key))
  return { reports, findings, proposals: proposals.filter(p => actionable.has(p.findingKey)), dataQuality: dataQualityOf(ctx) }
}

/** Public domain only: host of the recorded website/domain. Never CRM notes or people. */
export function publicDomainOf(company: Row | null): string | null {
  const raw = String(company?.domain || company?.website || '').trim().toLowerCase()
  if (!raw) return null
  const host = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] ?? ''
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null
}
