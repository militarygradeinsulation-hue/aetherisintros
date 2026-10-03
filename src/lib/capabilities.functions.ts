import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthContract } from './auth-gate'
import type { EntityType, FindingRow, ProposalRow, ResultEnvelope, RunDetail, RunSummary, Scope } from '@/aetheris/capabilities/types'
import { ENTITY_TYPES, SCOPES } from '@/aetheris/capabilities/types'

const safeId = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.:-]+$/)

const StartInput = z.object({
  capabilityId: z.string().min(3).max(80).regex(/^[a-z]+(\.[a-z_]+)+$/),
  subject: z.object({ type: z.enum(ENTITY_TYPES), id: safeId }),
  scopes: z.array(z.enum(SCOPES)).max(10).optional(),
  principalId: z.string().uuid().optional(),
  /** Public research: only when the member explicitly confirmed the shown domain. */
  web: z.object({ domain: z.string().max(120), confirmed: z.literal(true) }).optional(),
  input: z.record(z.string(), z.unknown()).optional(),
})

function toSummary(r: Record<string, unknown>): RunSummary {
  return {
    id: String(r['id']),
    capabilityId: String(r['capability_id']),
    verb: r['verb'] as RunSummary['verb'],
    subject: { type: r['subject_type'] as EntityType, id: String(r['subject_id']) },
    status: r['status'] as RunSummary['status'],
    progress: Number(r['progress'] ?? 0),
    stepLabel: String(r['step_label'] ?? ''),
    engine: (r['engine'] as RunSummary['engine']) ?? null,
    costTier: r['cost_tier'] as RunSummary['costTier'],
    actorKind: r['actor_kind'] as RunSummary['actorKind'],
    result: (r['result'] as ResultEnvelope | null) ?? null,
    errorMessage: (r['error_message'] as string | null) ?? null,
    createdAt: String(r['created_at']),
  }
}

async function loadDetail(db: any, runId: string): Promise<RunDetail | null> {
  const { data: row } = await db.from('capability_runs').select('*').eq('id', runId).maybeSingle()
  if (!row) return null
  const [{ data: findings }, { data: proposals }] = await Promise.all([
    db.from('capability_findings').select('*').eq('run_id', runId).order('created_at'),
    db.from('capability_proposals').select('*').eq('run_id', runId).order('created_at'),
  ])
  return { run: toSummary(row), webDomains: (row.web_domains ?? []) as string[], findings: (findings ?? []) as FindingRow[], proposals: (proposals ?? []) as ProposalRow[] }
}

export const startCapabilityRun = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => StartInput.parse(data))
  .handler(async ({ data, context }): Promise<RunDetail> => {
    const { getServerCapability } = await import('./capabilities/registry.server')
    const { buildContextEnvelope } = await import('./capabilities/context.server')
    const { grantScopes, clampBudget } = await import('./capabilities/scope')
    const db = context.supabase
    const cap = getServerCapability(data.capabilityId)
    if (!cap) throw new Error('That capability is not available.')
    if (!cap.appliesTo.includes(data.subject.type)) throw new Error('That capability does not apply here.')

    const wantsWeb = Boolean(data.web?.confirmed) && cap.engine === 'diagnose'
    const granted: Scope[] = grantScopes(cap.scopes, data.scopes, wantsWeb)
    const ownerId = data.principalId ?? context.userId
    const inputJson = JSON.stringify(data.input ?? {})
    const { data: runId, error } = await db.rpc('start_capability_run', {
      p_capability_id: cap.id, p_verb: cap.verb, p_subject_type: data.subject.type, p_subject_id: data.subject.id,
      p_input: (data.input ?? {}) as never, p_input_hash: String(inputJson.length), p_scopes: granted,
      p_cost_tier: wantsWeb ? 'medium' : cap.costTier, p_principal: data.principalId ?? null as never,
    })
    if (error || !runId) throw new Error(error?.message ?? 'The run could not be started.')

    const step = (p_status: string, extra: Record<string, unknown> = {}) =>
      db.rpc('set_capability_run_status', { p_run_id: runId, p_status, ...extra } as never)

    try {
      await step('context_built', { p_progress: 20, p_step_label: 'Context prepared' })
      const envelope = await buildContextEnvelope(db, {
        requestId: runId, ownerId, actorId: context.userId, actor: data.principalId ? 'delegate' : 'member',
        subject: data.subject, granted, budget: clampBudget(undefined),
      })
      await step('running', { p_progress: 50, p_step_label: 'Reading evidence' })
      if (cap.engine === 'diagnose') {
        await runDiagnose(db, runId, data, granted, step)
      } else if (cap.engine === 'enrich') {
        const { beginEnrichment } = await import('./capabilities/enrichment.server')
        await beginEnrichment(db, data.subject.id, step)
      } else {
        const result = cap.deterministic(envelope)
        const r = await step('result_ready', { p_engine: result.engine, p_result: result, p_step_label: 'Ready' })
        if (r.error) throw new Error(r.error.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The run failed.'
      await step('failed', { p_error_code: 'run_error', p_error_message: message.slice(0, 500) })
    }
    const detail = await loadDetail(db, runId as string)
    if (!detail) throw new Error('The run could not be read back.')
    return detail
  })

async function runDiagnose(db: any, runId: string, data: z.infer<typeof StartInput>, granted: Scope[], step: (s: string, e?: Record<string, unknown>) => PromiseLike<any>) {
  const { gatherContext, evaluateProviders, publicDomainOf } = await import('./capabilities/diagnose.server')
  const ctx = await gatherContext(db, data.subject)
  const { reports, findings, proposals } = evaluateProviders(ctx)
  const sources = ['CRM records', 'Activity timeline', 'Tasks', 'Decisions', 'Active Memory events']
  let partial = false
  const webItems: { title: string; url: string }[] = []

  if (granted.includes('web:read') && data.web) {
    const domain = publicDomainOf(ctx.company)
    if (!domain || domain !== data.web.domain.toLowerCase()) {
      partial = true
    } else {
      try {
        await db.rpc('record_capability_web_domain', { p_run_id: runId, p_domain: domain })
        const { searchWeb } = await import('./webSearch.server')
        // The query contains only the public domain — never CRM, people or memory content.
        const results = await searchWeb(domain, 5)
        for (const r of results) webItems.push({ title: r.title.slice(0, 140), url: r.url })
        sources.push(`Public web: ${domain}`)
        if (webItems.length) findings.push({
          key: 'web-signals', kind: 'pattern', provider: 'web', layer: 'fact', severity: 'low', confidence: 40,
          claim: `${webItems.length} public source${webItems.length > 1 ? 's' : ''} mention ${domain}. Review before treating any as a signal.`,
          evidence: webItems.map(w => ({ kind: 'url' as const, ref: w.url, label: w.title })), unknowns: ['Relevance and recency of each public source'],
        })
      } catch { partial = true }
    }
  }

  await step('running', { p_progress: 75, p_step_label: 'Recording findings' })
  const idByKey = new Map<string, string>()
  for (const f of findings) {
    const { key, ...payload } = f
    const { data: id, error } = await db.rpc('add_capability_finding_v2', { p_run_id: runId, p: payload as never })
    if (error) throw new Error(error.message)
    idByKey.set(key, id as string)
  }
  let proposalCount = 0
  for (const p of proposals) {
    const findingId = idByKey.get(p.findingKey)
    if (!findingId) continue
    const { error } = await db.rpc('add_capability_proposal', {
      p_run_id: runId, p_impact: p.impact, p_summary: p.summary, p_action: p.action as never,
      p_target_type: p.target.type, p_target_id: p.target.id, p_finding_id: findingId,
    })
    if (!error) proposalCount++
  }
  const result: ResultEnvelope = {
    status: partial ? 'partial' : 'ok', engine: 'deterministic',
    output: { providers: reports as never, focus: (data.input?.['focus'] as string) ?? null, web: webItems as never },
    items: [
      { layer: 'fact', text: findings.length ? `${findings.length} finding${findings.length > 1 ? 's' : ''} from ${reports.filter(r => r.status === 'ok').length} evidence areas.` : 'No findings: the recorded evidence does not show a problem here.' },
      ...(proposalCount ? [{ layer: 'recommendation' as const, text: `${proposalCount} recommended action${proposalCount > 1 ? 's' : ''} ready for your decision.` }] : []),
    ],
    provenance: { inputs: [data.subject], sources },
    ...(partial ? { unavailableReason: 'Public research could not run for the recorded domain; internal evidence only.' } : {}),
  }
  const r = await step(partial ? 'partial' : 'result_ready', { p_progress: 100, p_engine: 'deterministic', p_result: result, p_step_label: 'Ready' })
  if (r.error) throw new Error(r.error.message)
  if (proposalCount) await step('proposals_ready', { p_step_label: 'Actions ready for your decision' })
}

export const getRunDetail = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ runId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => loadDetail(context.supabase, data.runId))

export const getCapabilityRun = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ runId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<RunSummary | null> => {
    const { data: row } = await context.supabase.from('capability_runs').select('*').eq('id', data.runId).maybeSingle()
    return row ? toSummary(row as Record<string, unknown>) : null
  })

export const listSubjectRuns = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ type: z.enum(ENTITY_TYPES), id: safeId }).parse(data))
  .handler(async ({ data, context }): Promise<RunSummary[]> => {
    const { data: rows } = await context.supabase.from('capability_runs').select('*')
      .eq('subject_type', data.type).eq('subject_id', data.id).neq('capability_id', 'system.noop_check')
      .order('created_at', { ascending: false }).limit(12)
    return (rows ?? []).map(r => toSummary(r as Record<string, unknown>))
  })

export const cancelCapabilityRun = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ runId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await context.supabase.rpc('set_capability_run_status', { p_run_id: data.runId, p_status: 'cancelled', p_step_label: 'Stopped by you' } as never)
    return error ? { ok: false, error: error.message } : { ok: true }
  })

export const resolveFinding = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), status: z.enum(['open', 'resolved', 'dismissed']), note: z.string().max(500).default('') }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('resolve_capability_finding', { p_id: data.id, p_status: data.status, p_note: data.note })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/**
 * Level 1 autonomy. "apply" works only for read/draft proposals the member created;
 * "queue" sends write/external proposals to the approval queue; "approve_apply" is the
 * principal approving their own queued proposal, which executes the action server-side.
 */
export const decideProposal = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), decision: z.enum(['apply', 'queue', 'reject', 'dismiss', 'approve_apply']) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const db = context.supabase
    const { data: p } = await db.from('capability_proposals').select('*').eq('id', data.id).maybeSingle()
    if (!p) throw new Error('Proposal not found')
    const setRun = (s: string, label: string) => db.rpc('set_capability_run_status', { p_run_id: p.run_id, p_status: s, p_step_label: label } as never)

    if (data.decision !== 'approve_apply') {
      const { error } = await db.rpc('decide_capability_proposal', { p_id: data.id, p_decision: data.decision })
      if (error) throw new Error(error.message)
      if (data.decision === 'queue') await setRun('needs_approval', 'Waiting for your approval')
      if (data.decision === 'apply') await setRun('applied', 'Action applied')
      return { ok: true, message: data.decision === 'queue' ? 'Sent to your approval queue.' : data.decision === 'apply' ? 'Saved.' : 'Removed.' }
    }

    // Approve and execute (principal only; RLS lets only the owner approve pending rows).
    if (p.status !== 'queued' || !p.approval_id) throw new Error('This action is not waiting for approval.')
    const { data: approved, error: aErr } = await db.from('approval_queue').update({ status: 'approved', acted_at: new Date().toISOString() })
      .eq('id', p.approval_id).eq('status', 'pending').select('id')
    if (aErr || !approved?.length) throw new Error(aErr?.message ?? 'Only the account owner can approve this action.')
    const action = p.action as Record<string, any>
    if (action['kind'] === 'create_task') {
      const due = new Date(Date.now() + Number(action['dueInDays'] ?? 2) * 86_400_000).toISOString()
      const { error } = await db.from('crm_tasks').insert({
        owner_id: context.userId, title: String(action['title']).slice(0, 200), detail: String(action['detail'] ?? '').slice(0, 1000),
        due_at: due, opportunity_id: action['opportunityId'] ?? null, company_id: action['companyId'] ?? null,
      } as never)
      if (error) throw new Error(`Approved, but the task could not be created: ${error.message}`)
    }
    if (action['kind'] === 'update_person_field') {
      const { error } = await db.rpc('apply_professional_field', { p_proposal_id: p.id })
      if (error) throw new Error(`Approved, but the change could not be saved: ${error.message}`)
    }
    const { error: xErr } = await db.rpc('mark_approval_executed', { p_id: p.approval_id })
    if (xErr) throw new Error(xErr.message)
    await setRun('applied', 'Approved action applied')
    return { ok: true, message: 'Approved and applied. Intros will check the outcome against the baseline.' }
  })

/** Closed loop: compare the recorded metric now against the baseline. Never claims recovery without data. */
export const verifyFindingOutcome = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ verified: boolean; message: string }> => {
    const db = context.supabase
    const { data: f } = await db.from('capability_findings').select('*').eq('id', data.id).maybeSingle()
    if (!f) throw new Error('Finding not found')
    const oppRef = ((f.evidence ?? []) as { ref: string }[]).find(e => e.ref?.startsWith('crm_opportunities:'))
    const oppId = oppRef?.ref.split(':')[1]
    if (!oppId || (f.baseline_metric as any)?.metric !== 'days_since_touch') return { verified: false, message: 'No measurable metric is recorded for this finding yet.' }
    const [{ data: opp }, { data: acts }] = await Promise.all([
      db.from('crm_opportunities').select('id,name,status,amount,currency').eq('id', oppId).maybeSingle(),
      db.from('crm_activities').select('id,occurred_at,subject').eq('opportunity_id', oppId).gt('occurred_at', f.created_at).order('occurred_at', { ascending: false }).limit(1),
    ])
    const act = acts?.[0]
    if (!act && opp?.status !== 'won') return { verified: false, message: 'No new recorded activity since the finding — not verifiable yet.' }
    const evidence = [
      ...(act ? [{ kind: 'record', ref: `crm_activities:${act.id}`, label: `Touch recorded: ${String(act.subject).slice(0, 60)}` }] : []),
      ...(opp?.status === 'won' ? [{ kind: 'record', ref: `crm_opportunities:${opp.id}`, label: `${opp.name} marked won` }] : []),
    ]
    const actual = { metric: 'days_since_touch', value: act ? Math.floor((Date.now() - new Date(act.occurred_at).getTime()) / 86_400_000) : null, unit: 'days' }
    const recovered = opp?.status === 'won' ? Number(opp.amount) || null : null
    const { error } = await db.rpc('record_finding_outcome', { p_id: data.id, p_actual: actual as never, p_recovered: recovered as never, p_evidence: evidence as never })
    if (error) return { verified: false, message: error.message }
    return { verified: true, message: recovered ? 'Outcome verified: the opportunity was won after the action.' : 'Momentum restored and verified from the activity record.' }
  })

/** Decision memory: remember what was decided, who owns it and what is expected. */
export const rememberOutcome = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => z.object({
    runId: z.string().uuid(), findingId: z.string().uuid().optional(),
    kind: z.enum(['finding', 'decision', 'action', 'outcome']), summary: z.string().min(1).max(400),
    owner: z.string().max(120).default(''), expected: z.string().max(400).default(''),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('append_capability_event', {
      p_run_id: data.runId, p_event: `memory.${data.kind}`, p_summary: data.summary,
      p_detail: { finding_id: data.findingId ?? null, owner: data.owner, expected_outcome: data.expected, layer: 'fact' } as never,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })
