/**
 * Deal workspace data access. Reads go straight to the tables (row-level security limits them to
 * the roster); every write is an RPC that takes the actor from the session, so nothing here can
 * name another user. Failures throw an Error carrying the database's message.
 */
import { supabase } from '@/integrations/supabase/client'
import type { Milestone, WorkspaceRole, WorkspaceSource, WorkspaceStatus, ValidInput } from './lifecycle'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface WorkspaceRow {
  id: string; createdBy: string; sourceType: WorkspaceSource; sourceId: string; title: string; scope: string; nextAction: string
  budgetCents: number | null; currency: string | null; dueOn: string | null; status: WorkspaceStatus; createdAt: string; updatedAt: string
}
export interface MemberRow { userId: string; name: string; role: WorkspaceRole; status: 'invited' | 'active' | 'declined' | 'removed' }
export interface StepRow { id: string; text: string; done: boolean; createdBy: string; doneBy: string | null; createdAt: string }
export interface EventRow { id: string; actorId: string | null; kind: string; detail: string; createdAt: string }
export interface WorkspaceDetail { workspace: WorkspaceRow; members: MemberRow[]; steps: StepRow[]; confirmations: Array<{ userId: string; milestone: Milestone }>; events: EventRow[] }

const toRow = (r: any): WorkspaceRow => ({
  id: r.id, createdBy: r.created_by, sourceType: r.source_type, sourceId: r.source_id, title: r.title, scope: r.scope ?? '', nextAction: r.next_action ?? '',
  budgetCents: r.budget_cents == null ? null : Number(r.budget_cents), currency: r.currency ?? null, dueOn: r.due_on ?? null, status: r.status,
  createdAt: r.created_at, updatedAt: r.updated_at,
})

async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const r = await db.rpc(name, args)
  if (r.error) throw new Error(r.error.message || 'That did not save. Try again.')
  return r.data as T
}

export async function listWorkspaces(): Promise<Array<WorkspaceRow & { myStatus: MemberRow['status'] | null }>> {
  const { data: u } = await db.auth.getUser()
  const uid: string | undefined = u?.user?.id
  const w = await db.from('deal_workspaces').select('*').order('updated_at', { ascending: false }).limit(100)
  if (w.error) throw new Error(w.error.message)
  const ids = (w.data ?? []).map((x: any) => x.id)
  const mine = ids.length && uid ? await db.from('deal_workspace_members').select('workspace_id, status').eq('user_id', uid).in('workspace_id', ids) : { data: [] }
  const by = new Map<string, MemberRow['status']>((mine.data ?? []).map((m: any) => [m.workspace_id, m.status]))
  return (w.data ?? []).map((x: any) => ({ ...toRow(x), myStatus: by.get(x.id) ?? null }))
}

export async function loadWorkspace(id: string): Promise<WorkspaceDetail | null> {
  const w = await db.from('deal_workspaces').select('*').eq('id', id).maybeSingle()
  if (w.error) throw new Error(w.error.message)
  if (!w.data) return null
  const [m, s, c, e] = await Promise.all([
    db.from('deal_workspace_members').select('user_id, role, status').eq('workspace_id', id),
    db.from('deal_workspace_steps').select('*').eq('workspace_id', id).order('created_at'),
    db.from('deal_workspace_confirmations').select('user_id, milestone').eq('workspace_id', id),
    db.from('deal_workspace_events').select('*').eq('workspace_id', id).order('created_at', { ascending: false }).limit(30),
  ])
  const failed = [m, s, c, e].find(x => x.error)
  if (failed) throw new Error(failed.error.message)
  const userIds: string[] = (m.data ?? []).map((x: any) => x.user_id)
  const names = userIds.length ? await db.from('profiles').select('id, name').in('id', userIds) : { data: [] }
  const nameBy = new Map<string, string>((names.data ?? []).map((p: any) => [p.id, (p.name as string)?.trim() || 'A member']))
  return {
    workspace: toRow(w.data),
    members: (m.data ?? []).map((x: any): MemberRow => ({ userId: x.user_id, name: nameBy.get(x.user_id) ?? 'A member', role: x.role, status: x.status })),
    steps: (s.data ?? []).map((x: any): StepRow => ({ id: x.id, text: x.text, done: x.done, createdBy: x.created_by, doneBy: x.done_by, createdAt: x.created_at })),
    confirmations: (c.data ?? []).map((x: any) => ({ userId: x.user_id, milestone: x.milestone })),
    events: (e.data ?? []).map((x: any): EventRow => ({ id: x.id, actorId: x.actor_id, kind: x.kind, detail: x.detail, createdAt: x.created_at })),
  }
}

/** Finds the workspace already opened from a source, if the caller is on its roster. */
export async function findWorkspaceForSource(type: WorkspaceSource, sourceId: string): Promise<{ id: string; title: string } | null> {
  const r = await db.from('deal_workspaces').select('id, title').eq('source_type', type).eq('source_id', sourceId).maybeSingle()
  if (r.error) throw new Error(r.error.message)
  return r.data ?? null
}

export const createWorkspace = (type: WorkspaceSource, sourceId: string, v: ValidInput) =>
  rpc<{ id: string; created: boolean }>('create_deal_workspace', {
    p_source_type: type, p_source_id: sourceId, p_title: v.title, p_scope: v.scope, p_next_action: v.nextAction,
    p_budget_cents: v.budgetCents, p_currency: v.currency, p_due_on: v.dueOn,
  })
export const respondToInvite = (id: string, accept: boolean) => rpc('respond_workspace_invite', { p_ws: id, p_accept: accept })
export const inviteMember = (id: string, userId: string) => rpc('invite_workspace_member', { p_ws: id, p_user: userId })
export const removeMember = (id: string, userId: string) => rpc('remove_workspace_member', { p_ws: id, p_user: userId })
export const updateDetails = (id: string, v: Pick<ValidInput, 'title' | 'scope' | 'budgetCents' | 'currency' | 'dueOn'>) =>
  rpc('update_workspace_details', { p_ws: id, p_title: v.title, p_scope: v.scope, p_budget_cents: v.budgetCents, p_currency: v.currency, p_due_on: v.dueOn })
export const setNextAction = (id: string, text: string) => rpc('set_workspace_next_action', { p_ws: id, p_text: text })
export const addStep = (id: string, text: string) => rpc('add_workspace_step', { p_ws: id, p_text: text })
export const setStepDone = (stepId: string, done: boolean) => rpc('set_workspace_step_done', { p_step: stepId, p_done: done })
export const moveStage = (id: string, to: WorkspaceStatus) => rpc('transition_workspace_status', { p_ws: id, p_to: to })
export const confirmMilestone = (id: string, milestone: Milestone) => rpc<string>('confirm_workspace_milestone', { p_ws: id, p_milestone: milestone })
