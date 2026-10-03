import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthContract } from './auth-gate'
import {
  CandidateListSchema, ENRICH_CAPABILITY_ID, FIELD_LABEL, diffFields, rankCandidates, withFullName, withinLookupWindow,
  type NormalizedCandidate,
} from '@/aetheris/capabilities/enrichment'

export interface ProfessionalInfo {
  profile: { id: string; external_url: string; status: string; confirmed_at: string | null; last_checked_at: string; last_changed_at: string | null } | null
  conflicts: { id: string; external_url: string; status: string }[]
  snapshots: { id: string; source_channel: string; normalized: NormalizedCandidate; checked_at: string; match_confidence: number }[]
  openProposals: { id: string; summary: string; status: string }[]
}

export const getProfessionalInfo = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((d: unknown) => z.object({ personId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ProfessionalInfo> => {
    const db = context.supabase
    const [{ data: profiles }, { data: snaps }, { data: props }] = await Promise.all([
      db.from('person_external_profiles').select('id,external_url,status,confirmed_at,last_checked_at,last_changed_at').eq('person_id', data.personId),
      db.from('person_enrichment_snapshots').select('id,source_channel,normalized,checked_at,match_confidence').eq('person_id', data.personId).order('checked_at', { ascending: false }).limit(12),
      db.from('capability_proposals').select('id,summary,status').eq('target_type', 'person').eq('target_id', data.personId).in('status', ['open', 'queued']).limit(10),
    ])
    const list = (profiles ?? []) as any[]
    return {
      profile: list.find(p => p.status === 'confirmed') ?? null,
      conflicts: list.filter(p => p.status === 'conflict'),
      snapshots: (snaps ?? []) as any,
      openProposals: (props ?? []) as any,
    }
  })

async function ownRun(db: any, runId: string) {
  const { data: run } = await db.from('capability_runs').select('id,status,subject_id,capability_id,result').eq('id', runId).maybeSingle()
  if (!run || run.capability_id !== ENRICH_CAPABILITY_ID) throw new Error('Run not found')
  return run
}

/** Real lookup results handed in (assistant connector or manual paste). Validated, stripped, capped at 10. */
export const submitProfessionalCandidates = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((d: unknown) => z.object({
    runId: z.string().uuid(),
    channel: z.enum(['assistant_connector', 'manual']),
    candidates: CandidateListSchema,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase
    const run = await ownRun(db, data.runId)
    if (run.status !== 'needs_input') throw new Error('This check is not waiting for results.')
    const { loadPerson } = await import('./capabilities/enrichment.server')
    const person = await loadPerson(db, run.subject_id)
    // 1 lookup per person per 24h (manual pastes are the member's own data and always allowed; admins may override).
    if (data.channel === 'assistant_connector') {
      const { data: last } = await db.from('person_enrichment_snapshots').select('checked_at').eq('person_id', person.id)
        .eq('source_channel', 'assistant_connector').order('checked_at', { ascending: false }).limit(1).maybeSingle()
      const { data: admin } = await db.rpc('is_admin')
      if (withinLookupWindow((last as any)?.checked_at) && !admin) throw new Error('This person was checked in the last 24 hours. The saved result is shown instead.')
    }
    const candidates = data.candidates.map(withFullName)
    const ranked = rankCandidates(candidates, { fullName: person.full_name, companyName: person.company_name, title: person.title, location: person.location, linkedinUrl: person.linkedin_url })
    const prev = (run.result ?? {}) as any
    const result = { ...prev, output: { ...(prev.output ?? {}), candidates: ranked.scored, preselect: ranked.preselect, channel: data.channel, checkedAt: new Date().toISOString() } }
    const step = (s: string, extra: Record<string, unknown> = {}) => db.rpc('set_capability_run_status', { p_run_id: data.runId, p_status: s, ...extra } as never)
    await step('running', { p_step_label: 'Matching candidates' })
    const r = await step('needs_input', { p_progress: 70, p_step_label: ranked.scored.length > 1 ? 'Choose the right person' : 'Confirm the match', p_result: result })
    if (r.error) throw new Error(r.error.message)
    return { ok: true }
  })

/** Member confirms one candidate. Saves the snapshot, then proposes field changes — never writes CRM fields directly. */
export const confirmProfessionalCandidate = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((d: unknown) => z.object({ runId: z.string().uuid(), index: z.number().int().min(0).max(9) }).parse(d))
  .handler(async ({ data, context }): Promise<{ status: 'confirmed' | 'conflict'; proposals: number; message: string }> => {
    const db = context.supabase
    const run = await ownRun(db, data.runId)
    if (run.status !== 'needs_input') throw new Error('This check is not waiting for a choice.')
    const out = (run.result as any)?.output ?? {}
    const pick = out.candidates?.[data.index]
    if (!pick) throw new Error('That candidate is no longer available.')
    const { loadPerson } = await import('./capabilities/enrichment.server')
    const person = await loadPerson(db, run.subject_id)
    const step = (s: string, extra: Record<string, unknown> = {}) => db.rpc('set_capability_run_status', { p_run_id: data.runId, p_status: s, ...extra } as never)
    await step('running', { p_step_label: 'Saving the confirmed profile' })

    const { data: res, error } = await db.rpc('confirm_professional_profile', {
      p_run_id: data.runId, p_person_id: person.id, p_candidate: pick.candidate, p_query: out.query ?? {},
      p_channel: out.channel ?? 'manual', p_confidence: pick.confidence, p_reasons: pick.reasons,
    } as never)
    if (error) { await step('needs_input', { p_step_label: 'Choose the right person' }); throw new Error(error.message) }
    const r = res as any

    const finish = async (label: string) => {
      await step('result_ready', { p_progress: 90, p_step_label: label, p_result: { ...(run.result as any), output: { ...out, confirmed: r } } })
    }
    if (r.status === 'conflict') {
      await finish('Possible duplicate')
      await db.rpc('add_capability_proposal', {
        p_run_id: data.runId, p_impact: 'read', p_target_type: 'person', p_target_id: person.id, p_finding_id: null as never,
        p_summary: 'Possible duplicate — this LinkedIn profile is already confirmed on another contact. Review before merging.',
        p_action: { kind: 'merge_review', personId: person.id, otherPersonId: r.conflict_person_id, handle: r.handle },
      } as never)
      await step('proposals_ready', { p_progress: 100, p_step_label: 'Review the possible duplicate' })
      return { status: 'conflict', proposals: 1, message: 'Not imported: this profile is already linked to another contact. A merge review was created — nothing was merged.' }
    }

    const diffs = diffFields({ title: person.title, companyName: person.company_name, location: person.location, linkedinUrl: person.linkedin_url }, r.normalized)
    await finish(diffs.length ? 'Differences found' : 'Matches your record')
    for (const d of diffs) {
      await db.rpc('add_capability_proposal', {
        p_run_id: data.runId, p_impact: 'write', p_target_type: 'person', p_target_id: person.id, p_finding_id: null as never,
        p_summary: `${d.kind === 'fill' ? 'Add' : 'Update'} ${FIELD_LABEL[d.field].toLowerCase()}: ${d.current || '—'} → ${d.incoming}`.slice(0, 300),
        p_action: { kind: 'update_person_field', personId: person.id, field: d.field, from: d.current, to: d.incoming, snapshotId: r.snapshot_id, fieldKind: d.kind },
      } as never)
    }
    if (diffs.length) await step('proposals_ready', { p_progress: 100, p_step_label: 'Choose which changes to keep' })
    return {
      status: 'confirmed', proposals: diffs.length,
      message: diffs.length ? `Saved. ${diffs.length} field${diffs.length > 1 ? 's differ' : ' differs'} — keep yours or use LinkedIn.` : r.inserted ? 'Saved. Your record already matches LinkedIn.' : 'No change since the last check. Checked time updated.',
    }
  })

export const rejectProfessionalCandidate = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((d: unknown) => z.object({ runId: z.string().uuid(), index: z.number().int().min(0).max(9) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase
    const run = await ownRun(db, data.runId)
    const pick = (run.result as any)?.output?.candidates?.[data.index]
    if (!pick?.candidate?.profile_url) return { ok: true }
    const { error } = await db.rpc('reject_professional_candidate', { p_person_id: run.subject_id, p_profile_url: pick.candidate.profile_url })
    if (error) throw new Error(error.message)
    return { ok: true }
  })
