import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { EntityType, ResultEnvelope, RunSummary, Scope } from '@/aetheris/capabilities/types'
import { ENTITY_TYPES, SCOPES } from '@/aetheris/capabilities/types'

const safeId = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.:-]+$/)

const StartInput = z.object({
  capabilityId: z.string().min(3).max(80).regex(/^[a-z]+(\.[a-z_]+)+$/),
  subject: z.object({ type: z.enum(ENTITY_TYPES), id: safeId }),
  scopes: z.array(z.enum(SCOPES)).max(10).optional(),
  principalId: z.string().uuid().optional(),
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

export const startCapabilityRun = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => StartInput.parse(data))
  .handler(async ({ data, context }): Promise<RunSummary> => {
    const { getServerCapability } = await import('./capabilities/registry.server')
    const { buildContextEnvelope } = await import('./capabilities/context.server')
    const { grantScopes, clampBudget } = await import('./capabilities/scope')
    const db = context.supabase
    const cap = getServerCapability(data.capabilityId)
    if (!cap) throw new Error('That capability is not available.')
    if (!cap.appliesTo.includes(data.subject.type)) throw new Error('That capability does not apply here.')

    const granted: Scope[] = grantScopes(cap.scopes, data.scopes, false)
    const ownerId = data.principalId ?? context.userId
    const inputJson = JSON.stringify(data.input ?? {})
    const { data: runId, error } = await db.rpc('start_capability_run', {
      p_capability_id: cap.id, p_verb: cap.verb, p_subject_type: data.subject.type, p_subject_id: data.subject.id,
      p_input: (data.input ?? {}) as never, p_input_hash: String(inputJson.length), p_scopes: granted,
      p_cost_tier: cap.costTier, p_principal: data.principalId ?? null as never,
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
      await step('running', { p_progress: 50, p_step_label: 'Working' })
      const result = cap.deterministic(envelope)
      const r = await step('result_ready', { p_engine: result.engine, p_result: result, p_step_label: 'Ready' })
      if (r.error) throw new Error(r.error.message)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The run failed.'
      await step('failed', { p_error_code: 'run_error', p_error_message: message.slice(0, 500) })
    }
    const { data: row } = await db.from('capability_runs').select('*').eq('id', runId).single()
    return toSummary(row as Record<string, unknown>)
  })

export const getCapabilityRun = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ runId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<RunSummary | null> => {
    const { data: row } = await context.supabase.from('capability_runs').select('*').eq('id', data.runId).maybeSingle()
    return row ? toSummary(row as Record<string, unknown>) : null
  })

export const cancelCapabilityRun = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ runId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await context.supabase.rpc('set_capability_run_status', { p_run_id: data.runId, p_status: 'cancelled', p_step_label: 'Stopped by you' } as never)
    return error ? { ok: false, error: error.message } : { ok: true }
  })
