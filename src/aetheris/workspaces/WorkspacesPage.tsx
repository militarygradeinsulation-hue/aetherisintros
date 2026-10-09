/**
 * Business workspaces: list and detail. Everything shown is read back from the database after
 * each action, so the screen only ever reflects persisted records. Agreement and acceptance are
 * confirmed by each participant for themselves; nothing here records a contract or a payment.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Briefcase } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Btn, Eyebrow, Head } from '../ui'
import {
  STATUS_LABEL, CURRENCIES, formatBudget, isFinished, stageActions, stageNote, validateWorkspaceInput,
  type WorkspaceInput,
} from './lifecycle'
import {
  addStep, confirmMilestone, inviteMember, listWorkspaces, loadWorkspace, moveStage, removeMember, respondToInvite, setNextAction,
  setStepDone, updateDetails, type WorkspaceDetail, type WorkspaceRow,
} from './repo'
import { OPEN_WORKSPACE_KEY } from './StartWorkspace'

type ListRow = WorkspaceRow & { myStatus: string | null }
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

export function WorkspacesPage() {
  const [rows, setRows] = useState<ListRow[] | null>(null)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(() => { try { return sessionStorage.getItem(OPEN_WORKSPACE_KEY) } catch { return null } })

  const refresh = useCallback(async () => {
    try { setRows(await listWorkspaces()); setError('') } catch (e) { setError(msg(e)); setRows(r => r ?? []) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const open = (id: string | null) => { setActiveId(id); try { if (id) sessionStorage.setItem(OPEN_WORKSPACE_KEY, id); else sessionStorage.removeItem(OPEN_WORKSPACE_KEY) } catch { /* private mode */ } }

  return <>
    <Head label="WORKSPACES" title="Where a conversation becomes business."
      copy="A private workspace for the people actually doing the work: scope, next steps and a clear stage. Open one from a conversation or an accepted introduction."
      proof="private to the people on it · stages confirmed by each participant" />
    {rows === null && <p className="empty-state" role="status">Loading workspaces…</p>}
    {error && <p role="alert" className="executive-form-note">Could not load workspaces: {error} <button type="button" className="text-link" onClick={() => void refresh()}>Retry</button></p>}
    {rows && !rows.length && !error && <p className="empty-state">No workspaces yet. Open one from a conversation in Messages, or from an accepted introduction.</p>}
    {rows && rows.length > 0 && <div className="filter-chips" role="list" aria-label="Your workspaces">
      {rows.map(r => <button type="button" role="listitem" key={r.id} className={`chip ${activeId === r.id ? 'on' : ''}`} onClick={() => open(r.id)}>
        {r.title} · {r.myStatus === 'invited' ? 'Invitation' : STATUS_LABEL[r.status]}</button>)}
    </div>}
    {activeId && <WorkspaceDetailView key={activeId} id={activeId} onChanged={refresh} />}
  </>
}

function WorkspaceDetailView({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [detail, setDetail] = useState<WorkspaceDetail | null | undefined>(undefined)
  const [uid, setUid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [nextAction, setNext] = useState('')
  const [nextDirty, setNextDirtyState] = useState(false)
  const dirty = useRef(false)
  const setNextDirty = (v: boolean) => { dirty.current = v; setNextDirtyState(v) }
  const [step, setStep] = useState('')
  const [editing, setEditing] = useState(false)
  const [terms, setTerms] = useState<WorkspaceInput>({ title: '', scope: '', nextAction: '', budget: '', currency: 'usd', dueOn: '' })
  const [termErrors, setTermErrors] = useState<Partial<Record<keyof WorkspaceInput, string>>>({})

  const load = useCallback(async () => {
    try {
      const d = await loadWorkspace(id)
      setDetail(d); setError('')
      if (d) setNext(prev => (dirty.current ? prev : d.workspace.nextAction))
    } catch (e) { setError(msg(e)); setDetail(p => p ?? null) }
  }, [id])
  useEffect(() => { void supabase.auth.getUser().then(r => setUid(r.data.user?.id ?? null)) }, [])
  useEffect(() => { void load() }, [load])

  /** Runs one write; a second click while it is in flight is ignored. Returns true when it persisted. */
  const act = async (fn: () => Promise<unknown>): Promise<boolean> => {
    if (lock.current) return false
    lock.current = true; setBusy(true); setActionError('')
    try { await fn(); await load(); onChanged(); return true }
    catch (e) { setActionError(msg(e)); return false }
    finally { lock.current = false; setBusy(false) }
  }

  if (detail === undefined) return <p className="empty-state" role="status">Loading workspace…</p>
  if (detail === null) return <p role="alert" className="executive-form-note">{error ? `Could not load this workspace: ${error}` : 'This workspace is not available to you.'} <button type="button" className="text-link" onClick={() => void load()}>Retry</button></p>

  const { workspace: w, members, steps, confirmations, events } = detail
  const me = members.find(m => m.userId === uid)
  const role = me?.status === 'active' ? me.role : null
  const finished = isFinished(w.status)
  const myConfirmed = confirmations.filter(c => c.userId === uid).map(c => c.milestone)
  const actions = finished ? [] : stageActions(w.status, role, myConfirmed, w.scope.trim() !== '')
  const others = members.filter(m => m.userId !== uid)

  if (me?.status === 'invited') {
    return <section className="executive-section" aria-label="Workspace invitation">
      <Eyebrow signal>INVITATION</Eyebrow>
      <h2>{w.title}</h2>
      <p className="og-note">{members.find(m => m.role === 'owner')?.name ?? 'A member'} invited you to this workspace. Accepting lets you see next steps and confirm stages. Nothing is agreed by accepting.</p>
      {w.scope && <p>{w.scope}</p>}
      {actionError && <p role="alert" className="executive-form-note">{actionError}</p>}
      <div className="og-inline">
        <Btn disabled={busy} onClick={() => void act(() => respondToInvite(id, true))}><Check size={14} /> Accept invitation</Btn>
        <Btn kind="quiet" disabled={busy} onClick={() => void act(() => respondToInvite(id, false))}>Decline</Btn>
      </div>
    </section>
  }

  const startEdit = () => {
    setTerms({ title: w.title, scope: w.scope, nextAction: '', budget: w.budgetCents == null ? '' : (w.budgetCents / 100).toFixed(2), currency: w.currency ?? 'usd', dueOn: w.dueOn ?? '' })
    setTermErrors({}); setEditing(true)
  }
  const saveTerms = async () => {
    const v = validateWorkspaceInput(terms)
    if (!v.ok) { setTermErrors(v.errors); return }
    setTermErrors({})
    if (await act(() => updateDetails(id, v.value))) setEditing(false)
  }
  const saveNext = async () => { if (await act(() => setNextAction(id, nextAction.trim()))) setNextDirty(false) }
  const addNewStep = async () => { const t = step.trim(); if (t && await act(() => addStep(id, t))) setStep('') }
  const nameOf = (u: string | null) => members.find(m => m.userId === u)?.name ?? 'A member'
  const T = (k: keyof WorkspaceInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setTerms(t => ({ ...t, [k]: e.target.value }))

  return <section className="executive-section" aria-label={`Workspace ${w.title}`}>
    <Eyebrow signal><Briefcase size={12} /> {STATUS_LABEL[w.status].toUpperCase()}</Eyebrow>
    <h2>{w.title}</h2>
    {stageNote(w.status) && <p className="og-note">{stageNote(w.status)}</p>}
    {error && <p role="alert" className="executive-form-note">Could not refresh: {error}</p>}
    {actionError && <p role="alert" className="executive-form-note">{actionError}</p>}

    <h3>Participants</h3>
    <ul>{members.filter(m => m.status !== 'removed').map(m => <li key={m.userId}>{m.name}{m.userId === uid ? ' (you)' : ''} · {m.role}{m.status === 'invited' ? ' · invited, not yet accepted' : m.status === 'declined' ? ' · declined' : ''}
      {(w.status === 'proposal' || w.status === 'delivered') && m.status === 'active' && <> · {confirmations.some(c => c.userId === m.userId && c.milestone === (w.status === 'proposal' ? 'agreed' : 'accepted')) ? 'confirmed' : 'not yet confirmed'}</>}</li>)}</ul>
    {role === 'owner' && !finished && others.some(m => m.status === 'declined' || m.status === 'removed') && others.filter(m => m.status === 'declined' || m.status === 'removed').map(m =>
      <Btn key={m.userId} kind="secondary" disabled={busy} onClick={() => void act(() => inviteMember(id, m.userId))}>Invite {m.name} again</Btn>)}
    {role === 'owner' && !finished && others.filter(m => m.status === 'invited' || m.status === 'active').map(m =>
      <Btn key={m.userId} kind="quiet" disabled={busy} onClick={() => void act(() => removeMember(id, m.userId))}>Remove {m.name}</Btn>)}
    {role === 'collaborator' && !finished && <Btn kind="quiet" disabled={busy} onClick={() => void act(() => removeMember(id, uid!))}>Leave workspace</Btn>}

    <h3>Terms</h3>
    {!editing ? <dl>
      <div><dt>SCOPE</dt><dd>{w.scope || 'Not written yet'}</dd></div>
      <div><dt>BUDGET</dt><dd>{formatBudget(w.budgetCents, w.currency)}</dd></div>
      <div><dt>DUE</dt><dd>{w.dueOn ?? 'No due date'}</dd></div>
    </dl> : <form className="og-form" aria-label="Edit terms" onSubmit={e => { e.preventDefault(); void saveTerms() }}>
      <label>Title<input aria-label="Workspace title" value={terms.title} onChange={T('title')} maxLength={160} />{termErrors.title && <small role="alert">{termErrors.title}</small>}</label>
      <label>Scope<textarea aria-label="Scope" rows={3} value={terms.scope} onChange={T('scope')} />{termErrors.scope && <small role="alert">{termErrors.scope}</small>}</label>
      <label>Budget<input aria-label="Budget" inputMode="decimal" value={terms.budget} onChange={T('budget')} />{termErrors.budget && <small role="alert">{termErrors.budget}</small>}</label>
      <label>Currency<select aria-label="Currency" value={terms.currency} onChange={T('currency')}>{CURRENCIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select>{termErrors.currency && <small role="alert">{termErrors.currency}</small>}</label>
      <label>Due date<input aria-label="Due date" type="date" value={terms.dueOn} onChange={T('dueOn')} />{termErrors.dueOn && <small role="alert">{termErrors.dueOn}</small>}</label>
      <div className="og-inline"><button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save terms'}</button><Btn kind="quiet" disabled={busy} onClick={() => setEditing(false)}>Cancel</Btn></div>
    </form>}
    {role === 'owner' && !finished && !editing && <Btn kind="quiet" onClick={startEdit}>Edit terms</Btn>}
    {role === 'owner' && !finished && !editing && w.status === 'proposal' && <p className="og-note">Changing the terms clears confirmations already given.</p>}

    <h3>Next action</h3>
    {role && !finished ? <form className="og-inline" onSubmit={e => { e.preventDefault(); void saveNext() }}>
      <input aria-label="Next action" value={nextAction} maxLength={500} placeholder="What happens next, and who does it" onChange={e => { setNext(e.target.value); setNextDirty(true) }} />
      <button type="submit" disabled={busy || !nextDirty}>Save next action</button>
    </form> : <p>{w.nextAction || 'None set'}</p>}

    <h3>Shared next steps</h3>
    {!steps.length && <p className="empty-state">No steps yet.</p>}
    <ul aria-label="Next steps">{steps.map(s => <li key={s.id}>
      <label><input type="checkbox" checked={s.done} disabled={busy || !role || finished} onChange={e => void act(() => setStepDone(s.id, e.target.checked))} /> {s.text}</label>
      {s.done && s.doneBy && <small> · done by {nameOf(s.doneBy)}</small>}</li>)}</ul>
    {role && !finished && <form className="og-inline" onSubmit={e => { e.preventDefault(); void addNewStep() }}>
      <input aria-label="New step" value={step} maxLength={300} placeholder="Add a next step" onChange={e => setStep(e.target.value)} />
      <button type="submit" disabled={busy || !step.trim()}>Add step</button>
    </form>}

    <h3>Stage</h3>
    {!actions.length && <p className="og-note">{finished ? 'No further stage changes.' : role ? (role === 'owner' ? 'Nothing to do at this stage.' : 'The owner moves this workspace between stages.') : 'You are not an active participant.'}</p>}
    <div className="og-inline">{actions.map(a => a.kind === 'confirm'
      ? <Btn key={a.milestone} disabled={busy} onClick={() => void act(() => confirmMilestone(id, a.milestone))}>{a.milestone === 'agreed' ? 'Confirm we are agreed' : 'Confirm delivery accepted'}</Btn>
      : <Btn key={a.to} kind={a.to === 'cancelled' ? 'quiet' : 'secondary'} disabled={busy} onClick={() => void act(() => moveStage(id, a.to))}>{a.to === 'cancelled' ? 'Cancel workspace' : `Move to ${STATUS_LABEL[a.to]}`}</Btn>)}</div>
    {role === 'owner' && w.status === 'qualified' && !w.scope.trim() && <p className="og-note">Write the scope in the terms before moving to Proposal.</p>}
    {(w.status === 'proposal' || w.status === 'delivered') && <p className="og-note">Each participant confirms for themselves. The stage changes only when everyone has.</p>}

    <details><summary>Activity</summary>
      <ul>{events.map(ev => <li key={ev.id}><small>{new Date(ev.createdAt).toLocaleString()}</small> · {nameOf(ev.actorId)} · {ev.kind.replace(/_/g, ' ')}{ev.detail ? `: ${ev.detail}` : ''}</li>)}</ul>
    </details>
  </section>
}
