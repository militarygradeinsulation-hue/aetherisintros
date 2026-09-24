/**
 * CEO OS provider: private decisions + approval queue (owner-only RLS when
 * signed in; isolated local storage otherwise), upcoming calendar meetings,
 * last-visit and forecast snapshots for deterministic deltas, and the
 * contextual drawer state any surface or Ask Intros can open.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { useOps } from './crm/store'
import { useGraph, useGraphInputs } from './graph-store'
import { snapshotOf, type Approval, type ApprovalStatus, type ApprovalType, type CalMeeting, type CeoInputs, type Mark, type CeoRoute, type Decision, type NegotiationRoom, type OfficeHour, type OfficeHourRequest, type OppSnapshot, type ScenarioRoom } from './ceo-engine'

interface CeoApi {
  inputs: CeoInputs
  signedIn: boolean
  error: string
  route: CeoRoute | null
  open: (route: CeoRoute) => void
  close: () => void
  saveDecision: (d: Partial<Decision> & { title: string }) => Promise<Decision | null>
  removeDecision: (id: string) => Promise<void>
  queueApproval: (a: { actionType: ApprovalType; summary: string; payload?: Record<string, unknown>; source?: string }) => Promise<void>
  setApproval: (id: string, status: ApprovalStatus) => Promise<void>
  saveMark: (m: Partial<Mark> & { kind: Mark['kind']; subjectId: string }) => Promise<void>
  removeMark: (id: string) => Promise<void>
  negotiations: NegotiationRoom[]
  scenarios: ScenarioRoom[]
  officeHours: OfficeHour[]
  officeRequests: OfficeHourRequest[]
  saveNegotiation: (room: Partial<NegotiationRoom> & { title: string }) => Promise<void>
  saveScenario: (room: Partial<ScenarioRoom> & { title: string }) => Promise<void>
  saveOfficeHour: (window: { label: string; startsAt: string; endsAt: string; durationMinutes: number; capacity: number; purpose: string; relevance: string }) => Promise<void>
  setOfficeRequest: (id: string, status: OfficeHourRequest['status']) => Promise<void>
}

const Ctx = createContext<CeoApi | null>(null)
const LOCAL = 'aetheris.ceo.local.v1'
const VISIT = 'aetheris.ceo.lastVisit'
const SNAP = 'aetheris.ceo.forecastSnapshot'
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
const now = () => new Date().toISOString()

/* eslint-disable @typescript-eslint/no-explicit-any */
const decisionFromRow = (r: any): Decision => ({
  id: r.id, title: r.title, status: r.status, context: r.context, options: Array.isArray(r.options) ? r.options.map(String) : [],
  chosenOption: r.chosen_option, rationale: r.rationale, assumptions: r.assumptions, risks: r.risks, expectedOutcome: r.expected_outcome,
  reviewDate: r.review_date, actualOutcome: r.actual_outcome, linkedPersonIds: r.linked_person_ids ?? [], linkedCompanyIds: r.linked_company_ids ?? [],
  linkedOpportunityIds: r.linked_opportunity_ids ?? [], linkedEventIds: r.linked_event_ids ?? [], createdAt: r.created_at, decidedAt: r.decided_at, updatedAt: r.updated_at,
  prediction: r.prediction ?? '', confidence: r.confidence ?? null, assumptionReview: r.assumption_review ?? '', sameAgain: r.same_again ?? '',
})
const decisionToRow = (d: Partial<Decision>) => ({
  ...(d.title !== undefined && { title: d.title }), ...(d.status !== undefined && { status: d.status }), ...(d.context !== undefined && { context: d.context }),
  ...(d.options !== undefined && { options: d.options }), ...(d.chosenOption !== undefined && { chosen_option: d.chosenOption }),
  ...(d.rationale !== undefined && { rationale: d.rationale }), ...(d.assumptions !== undefined && { assumptions: d.assumptions }),
  ...(d.risks !== undefined && { risks: d.risks }), ...(d.expectedOutcome !== undefined && { expected_outcome: d.expectedOutcome }),
  ...(d.reviewDate !== undefined && { review_date: d.reviewDate || null }), ...(d.actualOutcome !== undefined && { actual_outcome: d.actualOutcome }),
  ...(d.linkedPersonIds !== undefined && { linked_person_ids: d.linkedPersonIds }), ...(d.linkedCompanyIds !== undefined && { linked_company_ids: d.linkedCompanyIds }),
  ...(d.linkedOpportunityIds !== undefined && { linked_opportunity_ids: d.linkedOpportunityIds }), ...(d.linkedEventIds !== undefined && { linked_event_ids: d.linkedEventIds }),
  ...(d.decidedAt !== undefined && { decided_at: d.decidedAt }),
  ...(d.prediction !== undefined && { prediction: d.prediction }), ...(d.confidence !== undefined && { confidence: d.confidence }),
  ...(d.assumptionReview !== undefined && { assumption_review: d.assumptionReview }), ...(d.sameAgain !== undefined && { same_again: d.sameAgain }),
})
const markFromRow = (r: any): Mark => ({ id: r.id, kind: r.kind, subjectId: r.subject_id, companyId: r.company_id, label: r.label ?? '', outcome: r.outcome ?? '', cadenceDays: r.cadence_days,
  valueGive: r.value_give ?? '', valueNeed: r.value_need ?? '', nextAction: r.next_action ?? '', nextTouch: r.next_touch, missionId: r.mission_id, notes: r.notes ?? '', createdAt: r.created_at, updatedAt: r.updated_at })
const markToRow = (m: Partial<Mark>) => ({ ...(m.kind !== undefined && { kind: m.kind }), ...(m.subjectId !== undefined && { subject_id: m.subjectId }), ...(m.companyId !== undefined && { company_id: m.companyId }),
  ...(m.label !== undefined && { label: m.label }), ...(m.outcome !== undefined && { outcome: m.outcome }), ...(m.cadenceDays !== undefined && { cadence_days: m.cadenceDays }),
  ...(m.valueGive !== undefined && { value_give: m.valueGive }), ...(m.valueNeed !== undefined && { value_need: m.valueNeed }), ...(m.nextAction !== undefined && { next_action: m.nextAction }),
  ...(m.nextTouch !== undefined && { next_touch: m.nextTouch || null }), ...(m.missionId !== undefined && { mission_id: m.missionId }), ...(m.notes !== undefined && { notes: m.notes }) })
const approvalFromRow = (r: any): Approval => ({ id: r.id, actionType: r.action_type, summary: r.summary, payload: r.payload ?? {}, source: r.source, status: r.status, createdAt: r.created_at, actedAt: r.acted_at })

export function CeoProvider({ children }: { children: ReactNode }) {
  const graph = useGraph()
  const g = useGraphInputs()
  const ops = useOps()
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [meetings, setMeetings] = useState<CalMeeting[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [negotiations, setNegotiations] = useState<NegotiationRoom[]>([])
  const [scenarios, setScenarios] = useState<ScenarioRoom[]>([])
  const [officeHours, setOfficeHours] = useState<OfficeHour[]>([])
  const [officeRequests, setOfficeRequests] = useState<OfficeHourRequest[]>([])
  const [error, setError] = useState('')
  const [route, setRoute] = useState<CeoRoute | null>(null)
  const [since] = useState(() => { if (typeof window === 'undefined') return Date.now() - 86_400_000; const v = Number(localStorage.getItem(VISIT)); return v > 0 ? v : Date.now() - 86_400_000 })
  const [snapshot] = useState<OppSnapshot | null>(() => { if (typeof window === 'undefined') return null; try { return JSON.parse(localStorage.getItem(SNAP) ?? 'null') } catch { return null } })
  const signedIn = Boolean(graph.userId)
  const db = supabase as any

  const writeLocal = (d: Decision[], a: Approval[], k?: Mark[]) => { setDecisions(d); setApprovals(a); if (k) setMarks(k); let prev: Mark[] = []; try { prev = JSON.parse(localStorage.getItem(LOCAL) ?? '{}').marks ?? [] } catch { /* empty */ } localStorage.setItem(LOCAL, JSON.stringify({ decisions: d, approvals: a, marks: k ?? prev })) }

  const refresh = useCallback(async () => {
    if (!graph.userId) {
      try { const l = JSON.parse(localStorage.getItem(LOCAL) ?? '{}'); setDecisions(l.decisions ?? []); setApprovals(l.approvals ?? []); setMarks(l.marks ?? []) } catch { /* empty */ }
      setMeetings([]); return
    }
    const horizon = new Date(Date.now() + 14 * 86_400_000).toISOString()
    const [d, a, m, k, n, s, oh, oq] = await Promise.all([
      db.from('decisions').select('*').order('updated_at', { ascending: false }),
      db.from('approval_queue').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('calendar_events').select('id,title,starts_at,ends_at,member_id,kind,notes').gte('ends_at', new Date(Date.now() - 90 * 86_400_000).toISOString()).lte('starts_at', horizon).order('starts_at'),
      db.from('ceo_relationship_marks').select('*').order('updated_at', { ascending: false }),
      db.from('negotiation_rooms').select('*').order('updated_at', { ascending: false }),
      db.from('scenario_rooms').select('*').order('updated_at', { ascending: false }),
      db.from('executive_office_hours').select('*').eq('owner_id', graph.userId).order('starts_at'),
      db.from('office_hour_requests').select('*').order('created_at', { ascending: false }),
    ])
    setMarks((k.data ?? []).map(markFromRow))
    if (d.error || a.error) setError('Some private CEO records could not load. Try again shortly.')
    setDecisions((d.data ?? []).map(decisionFromRow))
    setApprovals((a.data ?? []).map(approvalFromRow))
    setMeetings((m.data ?? []).map((r: any) => ({ id: r.id, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at, memberId: r.member_id, kind: r.kind, notes: r.notes ?? '' })))
    setNegotiations((n.data ?? []).map((r: any) => ({ id: r.id, title: r.title, status: r.status, linkedPersonId: r.linked_person_key ?? r.linked_person_id, linkedCompanyId: r.linked_company_key ?? r.linked_company_id, linkedOpportunityId: r.linked_opportunity_key ?? r.linked_opportunity_id, objective: r.objective, desiredOutcome: r.desired_outcome, mustHaves: r.must_haves, niceToHaves: r.nice_to_haves, walkAway: r.walk_away, counterpartPriorities: r.counterpart_priorities, leverageEvidence: r.leverage_evidence, unknowns: r.unknowns, batna: r.batna, concessions: Array.isArray(r.concessions) ? r.concessions.map(String) : [], meetingPrep: r.meeting_prep, outcome: r.outcome, createdAt: r.created_at, updatedAt: r.updated_at })))
    setScenarios((s.data ?? []).map((r: any) => ({ id: r.id, title: r.title, linkedOpportunityId: r.linked_opportunity_key ?? r.linked_opportunity_id, scenarioType: r.scenario_type, recordedInputs: r.recorded_inputs ?? {}, assumptions: r.assumptions ?? {}, baseline: r.baseline ?? {}, scenarioResult: r.scenario_result ?? {}, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at })))
    setOfficeHours((oh.data ?? []).map((r: any) => ({ id: r.id, ownerId: r.owner_id, label: r.label, startsAt: r.starts_at, endsAt: r.ends_at, durationMinutes: r.duration_minutes, capacity: r.capacity, purpose: r.purpose, relevance: r.relevance, enabled: r.enabled, createdAt: r.created_at, updatedAt: r.updated_at })))
    setOfficeRequests((oq.data ?? []).map((r: any) => ({ id: r.id, windowId: r.window_id, requesterId: r.requester_id, ownerId: r.owner_id, reason: r.reason, status: r.status, createdAt: r.created_at, actedAt: r.acted_at })))
  }, [graph.userId])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { localStorage.setItem(VISIT, String(Date.now())) }, [])
  const wroteSnap = useRef(false)
  useEffect(() => {
    if (wroteSnap.current || !ops.ready) return
    const tm = window.setTimeout(() => { localStorage.setItem(SNAP, JSON.stringify(snapshotOf(ops.opportunities))); wroteSnap.current = true }, 4000)
    return () => window.clearTimeout(tm)
  }, [ops.ready, ops.opportunities])
  useEffect(() => {
    const onOpen = (e: Event) => setRoute((e as CustomEvent<CeoRoute>).detail ?? null)
    window.addEventListener('aetheris:ceo', onOpen)
    return () => window.removeEventListener('aetheris:ceo', onOpen)
  }, [])

  const saveDecision = useCallback(async (input: Partial<Decision> & { title: string }) => {
    setError('')
    const decidedAt = input.status === 'decided' && !input.decidedAt ? (decisions.find(x => x.id === input.id)?.decidedAt ?? now()) : input.decidedAt
    const patch = { ...input, ...(decidedAt !== undefined && { decidedAt }) }
    if (!graph.userId) {
      const existing = decisions.find(x => x.id === input.id)
      const next: Decision = existing ? { ...existing, ...patch, updatedAt: now() } as Decision : {
        id: uid(), status: 'exploring', context: '', options: [], chosenOption: '', rationale: '', assumptions: '', risks: '', expectedOutcome: '',
        reviewDate: null, actualOutcome: '', linkedPersonIds: [], linkedCompanyIds: [], linkedOpportunityIds: [], linkedEventIds: [],
        createdAt: now(), decidedAt: null, updatedAt: now(), ...patch,
      } as Decision
      writeLocal([next, ...decisions.filter(x => x.id !== next.id)], approvals)
      return next
    }
    const res = input.id
      ? await db.from('decisions').update(decisionToRow(patch)).eq('id', input.id).select().single()
      : await db.from('decisions').insert(decisionToRow(patch)).select().single()
    if (res.error) { setError('The decision could not be saved. Check the title and try again.'); return null }
    const saved = decisionFromRow(res.data)
    setDecisions(list => [saved, ...list.filter(x => x.id !== saved.id)])
    void graph.logEvent('decision', saved.id, input.id ? 'updated' : 'created', `Decision ${input.id ? 'updated' : 'opened'}: ${saved.title}`)
    return saved
  }, [graph, decisions, approvals])

  const removeDecision = useCallback(async (id: string) => {
    if (!graph.userId) { writeLocal(decisions.filter(x => x.id !== id), approvals); return }
    await db.from('decisions').delete().eq('id', id)
    setDecisions(list => list.filter(x => x.id !== id))
  }, [graph.userId, decisions, approvals])

  const queueApproval = useCallback(async (a: { actionType: ApprovalType; summary: string; payload?: Record<string, unknown>; source?: string }) => {
    const row = { action_type: a.actionType, summary: a.summary.slice(0, 500), payload: a.payload ?? {}, source: a.source ?? 'manual' }
    if (!graph.userId) {
      writeLocal(decisions, [{ id: uid(), actionType: a.actionType, summary: row.summary, payload: row.payload, source: row.source, status: 'pending', createdAt: now(), actedAt: null }, ...approvals]); return
    }
    const res = await db.from('approval_queue').insert(row).select().single()
    if (res.error) { setError('The action could not be queued for approval.'); return }
    setApprovals(list => [approvalFromRow(res.data), ...list])
  }, [graph.userId, decisions, approvals])

  const setApproval = useCallback(async (id: string, status: ApprovalStatus) => {
    const actedAt = now()
    if (!graph.userId) { writeLocal(decisions, approvals.map(x => x.id === id ? { ...x, status, actedAt } : x)); return }
    const res = await db.from('approval_queue').update({ status, acted_at: actedAt }).eq('id', id).select().single()
    if (res.error) { setError('The approval could not be updated.'); return }
    setApprovals(list => list.map(x => x.id === id ? approvalFromRow(res.data) : x))
    void graph.logEvent('approval', id, status, `Approval ${status}`)
  }, [graph, decisions, approvals])

  const saveMark = useCallback(async (m: Partial<Mark> & { kind: Mark['kind']; subjectId: string }) => {
    setError('')
    const existing = marks.find(x => x.kind === m.kind && x.subjectId === m.subjectId)
    if (!graph.userId) {
      const next: Mark = { id: existing?.id ?? uid(), companyId: null, label: '', outcome: '', cadenceDays: null, valueGive: '', valueNeed: '', nextAction: '', nextTouch: null, missionId: null, notes: '', createdAt: existing?.createdAt ?? now(), ...existing, ...m, updatedAt: now() } as Mark
      writeLocal(decisions, approvals, [next, ...marks.filter(x => x.id !== next.id)]); return
    }
    const res = existing
      ? await db.from('ceo_relationship_marks').update(markToRow((({ kind: _k, subjectId: _s, ...rest }) => rest)(m))).eq('id', existing.id).select().single()
      : await db.from('ceo_relationship_marks').insert(markToRow(m)).select().single()
    if (res.error) { setError('That could not be saved privately. Try again.'); return }
    const saved = markFromRow(res.data)
    setMarks(list => [saved, ...list.filter(x => x.id !== saved.id)])
  }, [graph.userId, marks, decisions, approvals])

  const removeMark = useCallback(async (id: string) => {
    if (!graph.userId) { writeLocal(decisions, approvals, marks.filter(x => x.id !== id)); return }
    await db.from('ceo_relationship_marks').delete().eq('id', id)
    setMarks(list => list.filter(x => x.id !== id))
  }, [graph.userId, marks, decisions, approvals])

  const inputs = useMemo<CeoInputs>(() => ({ g, events: ops.events, decisions, approvals, meetings, marks, companies: ops.companies, since, snapshot }), [g, ops.events, ops.companies, decisions, approvals, meetings, marks, since, snapshot])

  const saveNegotiation = useCallback(async (room: Partial<NegotiationRoom> & { title: string }) => {
    const row = { title: room.title, ...(room.status !== undefined && { status: room.status }), ...(room.linkedPersonId !== undefined && { linked_person_key: room.linkedPersonId }), ...(room.linkedCompanyId !== undefined && { linked_company_key: room.linkedCompanyId }), ...(room.linkedOpportunityId !== undefined && { linked_opportunity_key: room.linkedOpportunityId }), objective: room.objective ?? '', desired_outcome: room.desiredOutcome ?? '', must_haves: room.mustHaves ?? '', nice_to_haves: room.niceToHaves ?? '', walk_away: room.walkAway ?? '', counterpart_priorities: room.counterpartPriorities ?? '', leverage_evidence: room.leverageEvidence ?? '', unknowns: room.unknowns ?? '', batna: room.batna ?? '', concessions: room.concessions ?? [], meeting_prep: room.meetingPrep ?? '', outcome: room.outcome ?? '' }
    if (!graph.userId) { setError('Sign in to save a private negotiation room.'); return }
    const res = room.id ? await db.from('negotiation_rooms').update(row).eq('id', room.id) : await db.from('negotiation_rooms').insert(row)
    if (res.error) setError('The negotiation room could not be saved.'); else await refresh()
  }, [graph.userId, refresh])
  const saveScenario = useCallback(async (room: Partial<ScenarioRoom> & { title: string }) => {
    const row = { title: room.title, linked_opportunity_key: room.linkedOpportunityId ?? null, scenario_type: room.scenarioType ?? 'custom', recorded_inputs: room.recordedInputs ?? {}, assumptions: room.assumptions ?? {}, baseline: room.baseline ?? {}, scenario_result: room.scenarioResult ?? {}, notes: room.notes ?? '' }
    if (!graph.userId) { setError('Sign in to save a private scenario.'); return }
    const res = room.id ? await db.from('scenario_rooms').update(row).eq('id', room.id) : await db.from('scenario_rooms').insert(row)
    if (res.error) setError('The scenario could not be saved.'); else await refresh()
  }, [graph.userId, refresh])
  const saveOfficeHour = useCallback(async (window: { label: string; startsAt: string; endsAt: string; durationMinutes: number; capacity: number; purpose: string; relevance: string }) => {
    if (!graph.userId) { setError('Sign in to offer executive office hours.'); return }
    const res = await db.from('executive_office_hours').insert({ label: window.label, starts_at: window.startsAt, ends_at: window.endsAt, duration_minutes: window.durationMinutes, capacity: window.capacity, purpose: window.purpose, relevance: window.relevance })
    if (res.error) setError('The office-hours window could not be saved.'); else await refresh()
  }, [graph.userId, refresh])
  const setOfficeRequest = useCallback(async (id: string, status: OfficeHourRequest['status']) => {
    const res = await db.from('office_hour_requests').update({ status, acted_at: now() }).eq('id', id)
    if (res.error) setError('The office-hours request could not be updated.'); else await refresh()
  }, [refresh])

  const api = useMemo<CeoApi>(() => ({
    inputs, signedIn, error, route, open: setRoute, close: () => setRoute(null), saveDecision, removeDecision, queueApproval, setApproval, saveMark, removeMark,
    negotiations, scenarios, officeHours, officeRequests, saveNegotiation, saveScenario, saveOfficeHour, setOfficeRequest,
  }), [inputs, signedIn, error, route, saveDecision, removeDecision, queueApproval, setApproval, saveMark, removeMark, negotiations, scenarios, officeHours, officeRequests, saveNegotiation, saveScenario, saveOfficeHour, setOfficeRequest])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useCeo() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCeo must be used inside CeoProvider')
  return ctx
}
/** Open a CEO drawer from anywhere (including outside the provider tree). */
export const openCeo = (route: CeoRoute) => window.dispatchEvent(new CustomEvent('aetheris:ceo', { detail: route }))
