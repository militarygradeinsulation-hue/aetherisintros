/**
 * Opportunity Graph provider: private missions, Digital You rules, intro
 * feedback, delegates and passports. Owner-scoped tables with strict RLS
 * when signed in; a local-only fallback keeps demo/preview functional.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { useOps } from './crm/store'
import { useOS } from './os-store'
import { useNetwork } from './store'
import {
  splitList, type FeedbackRecord, type GraphInputs, type Mission, type MissionType, type Rule, type RuleKind,
} from './opportunity-graph'

export interface Delegate { id: string; delegateEmail: string; roleLabel: string; permissions: string[]; status: 'invited' | 'active' | 'revoked'; createdAt: string }
export interface Passport { id: string; kind: 'network' | 'shareable'; label: string; token: string; fields: string[]; selectedAskId: string | null; revoked: boolean; createdAt: string }

interface GraphApi {
  signedIn: boolean
  userId: string | null
  missions: Mission[]
  rules: Rule[]
  feedback: FeedbackRecord[]
  delegates: Delegate[]
  passports: Passport[]
  error: string
  saveMission: (m: Partial<Mission> & { title: string }) => Promise<void>
  setMissionStatus: (id: string, status: Mission['status']) => Promise<void>
  removeMission: (id: string) => Promise<void>
  setRule: (kind: RuleKind, action: Rule['action'], enabled: boolean) => Promise<void>
  recordFeedback: (f: Omit<FeedbackRecord, 'id' | 'createdAt'> & { privateNote: string }) => Promise<void>
  addDelegate: (email: string, roleLabel: string, permissions: string[]) => Promise<void>
  revokeDelegate: (id: string) => Promise<void>
  createPassport: (p: { kind: Passport['kind']; label: string; fields: string[]; selectedAskId: string | null }) => Promise<void>
  revokePassport: (id: string) => Promise<void>
  logEvent: (entityType: string, entityId: string, event: string, summary: string, detail?: Record<string, unknown>) => Promise<void>
}

const Ctx = createContext<GraphApi | null>(null)
const LOCAL = 'aetheris.graph.local.v1'
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
const now = () => new Date().toISOString()

type Local = { missions: Mission[]; rules: Rule[]; feedback: FeedbackRecord[]; delegates: Delegate[]; passports: Passport[] }
const emptyLocal: Local = { missions: [], rules: [], feedback: [], delegates: [], passports: [] }

/* eslint-disable @typescript-eslint/no-explicit-any */
const missionFromRow = (r: any): Mission => ({
  id: r.id, title: r.title, objective: r.objective, missionType: r.mission_type as MissionType, targetCompany: r.target_company,
  targetIndustry: r.target_industry, targetGeography: r.target_geography, targetDate: r.target_date, horizon: r.horizon,
  privacy: r.privacy, status: r.status, successDefinition: r.success_definition, linkedOpportunityId: r.linked_opportunity_id,
  linkedCompanyId: r.linked_company_id, linkedAskId: r.linked_ask_id, createdAt: r.created_at, updatedAt: r.updated_at,
})
const missionToRow = (m: Partial<Mission>) => ({
  ...(m.title !== undefined && { title: m.title }), ...(m.objective !== undefined && { objective: m.objective }),
  ...(m.missionType !== undefined && { mission_type: m.missionType }), ...(m.targetCompany !== undefined && { target_company: m.targetCompany }),
  ...(m.targetIndustry !== undefined && { target_industry: m.targetIndustry }), ...(m.targetGeography !== undefined && { target_geography: m.targetGeography }),
  ...(m.targetDate !== undefined && { target_date: m.targetDate || null }), ...(m.horizon !== undefined && { horizon: m.horizon }),
  ...(m.privacy !== undefined && { privacy: m.privacy }), ...(m.status !== undefined && { status: m.status }),
  ...(m.successDefinition !== undefined && { success_definition: m.successDefinition }),
  ...(m.linkedOpportunityId !== undefined && { linked_opportunity_id: m.linkedOpportunityId }),
  ...(m.linkedCompanyId !== undefined && { linked_company_id: m.linkedCompanyId }),
  ...(m.linkedAskId !== undefined && { linked_ask_id: m.linkedAskId }),
})

export function GraphProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [data, setData] = useState<Local>(emptyLocal)
  const [error, setError] = useState('')

  const loadLocal = () => { try { return { ...emptyLocal, ...JSON.parse(localStorage.getItem(LOCAL) ?? '{}') } as Local } catch { return emptyLocal } }
  const writeLocal = (next: Local) => { setData(next); localStorage.setItem(LOCAL, JSON.stringify(next)) }

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    const id = auth.user?.id ?? null
    setUserId(id)
    if (!id) { setData(loadLocal()); return }
    const db = supabase as any
    const [m, r, f, d, p] = await Promise.all([
      db.from('missions').select('*').order('updated_at', { ascending: false }),
      db.from('digital_you_rules').select('*'),
      db.from('intro_feedback').select('*').eq('author_id', id),
      db.from('delegates').select('*').eq('principal_id', id),
      db.from('passports').select('*').eq('owner_id', id).order('created_at', { ascending: false }),
    ])
    const firstError = [m, r, f, d, p].find(x => x.error)?.error
    setError(firstError ? firstError.message : '')
    setData({
      missions: (m.data ?? []).map(missionFromRow),
      rules: (r.data ?? []).map((x: any) => ({ id: x.id, ruleKind: x.rule_kind, action: x.action, enabled: x.enabled })),
      feedback: (f.data ?? []).map((x: any) => ({ id: x.id, introRequestId: x.intro_request_id, memberId: x.member_id, connectorName: x.connector_name, relevant: x.relevant, contextAccurate: x.context_accurate, wouldTakeAgain: x.would_take_again, outcomeCategory: x.outcome_category, shareable: x.shareable, createdAt: x.created_at })),
      delegates: (d.data ?? []).map((x: any) => ({ id: x.id, delegateEmail: x.delegate_email, roleLabel: x.role_label, permissions: x.permissions, status: x.status, createdAt: x.created_at })),
      passports: (p.data ?? []).map((x: any) => ({ id: x.id, kind: x.kind, label: x.label, token: x.token, fields: x.fields, selectedAskId: x.selected_ask_id, revoked: x.revoked, createdAt: x.created_at })),
    })
  }, [])

  useEffect(() => {
    void refresh()
    const { data: sub } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void refresh() })
    return () => sub.subscription.unsubscribe()
  }, [refresh])

  const run = async (op: PromiseLike<{ error: { message: string } | null }>) => {
    const res = await op
    if (res.error) setError(res.error.message)
    await refresh()
  }

  const api = useMemo<GraphApi>(() => {
    const db = supabase as any
    const signedIn = Boolean(userId)
    return {
      signedIn, userId, error, ...data,
      async saveMission(m) {
        if (!signedIn) {
          const exists = m.id && data.missions.some(x => x.id === m.id)
          const base: Mission = { id: uid(), title: m.title, objective: '', missionType: 'custom', targetCompany: '', targetIndustry: '', targetGeography: '', targetDate: null, horizon: '', privacy: 'private', status: 'active', successDefinition: '', linkedOpportunityId: null, linkedCompanyId: null, linkedAskId: null, createdAt: now(), updatedAt: now() }
          writeLocal({ ...data, missions: exists ? data.missions.map(x => x.id === m.id ? { ...x, ...m, updatedAt: now() } : x) : [{ ...base, ...m, id: base.id }, ...data.missions] })
          return
        }
        if (m.id) await run(db.from('missions').update(missionToRow(m)).eq('id', m.id))
        else await run(db.from('missions').insert(missionToRow(m)))
      },
      async setMissionStatus(id, status) {
        if (!signedIn) { writeLocal({ ...data, missions: data.missions.map(x => x.id === id ? { ...x, status, updatedAt: now() } : x) }); return }
        await run(db.from('missions').update({ status }).eq('id', id))
      },
      async removeMission(id) {
        if (!signedIn) { writeLocal({ ...data, missions: data.missions.filter(x => x.id !== id) }); return }
        await run(db.from('missions').delete().eq('id', id))
      },
      async setRule(kind, action, enabled) {
        const existing = data.rules.find(r => r.ruleKind === kind)
        if (!signedIn) {
          writeLocal({ ...data, rules: existing ? data.rules.map(r => r.ruleKind === kind ? { ...r, action, enabled } : r) : [...data.rules, { id: uid(), ruleKind: kind, action, enabled }] })
          return
        }
        if (existing) await run(db.from('digital_you_rules').update({ action, enabled }).eq('id', existing.id))
        else await run(db.from('digital_you_rules').insert({ rule_kind: kind, action, enabled }))
      },
      async recordFeedback(f) {
        if (!signedIn) { writeLocal({ ...data, feedback: [{ ...f, id: uid(), createdAt: now() }, ...data.feedback] }); return }
        await run(db.from('intro_feedback').insert({
          intro_request_id: f.introRequestId, member_id: f.memberId, connector_name: f.connectorName, relevant: f.relevant,
          context_accurate: f.contextAccurate, would_take_again: f.wouldTakeAgain, outcome_category: f.outcomeCategory,
          private_note: f.privateNote, shareable: f.shareable,
        }))
      },
      async addDelegate(email, roleLabel, permissions) {
        if (!signedIn) { setError('Sign in with a verified account to authorise a delegate.'); return }
        await run(db.from('delegates').insert({ delegate_email: email.trim().toLowerCase(), role_label: roleLabel, permissions }))
      },
      async revokeDelegate(id) { if (signedIn) await run(db.from('delegates').update({ status: 'revoked', permissions: [] }).eq('id', id)) },
      async createPassport(p) {
        if (!signedIn) { setError('Sign in with a verified account to create a passport.'); return }
        await run(db.from('passports').insert({ kind: p.kind, label: p.label, fields: p.fields, selected_ask_id: p.selectedAskId }))
      },
      async revokePassport(id) { if (signedIn) await run(db.from('passports').update({ revoked: true }).eq('id', id)) },
      async logEvent(entityType, entityId, event, summary, detail = {}) {
        if (!signedIn) return
        await db.from('entity_events').insert({ entity_type: entityType, entity_id: entityId, event, summary, detail, source: 'ask-intros' })
      },
    }
  }, [data, userId, error])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useGraph() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGraph must be used inside GraphProvider')
  return ctx
}

/** Assemble deterministic graph inputs from the canonical stores. */
export function useGraphInputs(): GraphInputs {
  const net = useNetwork()
  const ops = useOps()
  const os = useOS()
  const graph = useGraph()
  return useMemo(() => ({
    me: {
      name: net.profile.name,
      offers: splitList(net.profile.canHelpWith ?? ''),
      expertise: net.profile.expertise ?? [],
      industries: net.profile.industries ?? [],
      location: net.profile.location ?? '',
      openTo: net.profile.openTo ?? [],
      whatIDo: net.profile.whatIDo ?? '',
    },
    members: net.members,
    connections: net.connections,
    threads: net.threads,
    asks: net.asks,
    crm: { people: ops.people, activities: ops.activities, tasks: ops.tasks, opportunities: ops.opportunities, personForMember: ops.personForMember },
    missions: graph.missions,
    feedback: graph.feedback,
    strainedConnectors: os.trustBudgets.filter(b => b.health === 'strained').map(b => b.connectorName),
    verifiedIds: new Set<string>(),
  }), [net.profile, net.members, net.connections, net.threads, net.asks, ops.people, ops.activities, ops.tasks, ops.opportunities, ops.personForMember, graph.missions, graph.feedback, os.trustBudgets])
}
