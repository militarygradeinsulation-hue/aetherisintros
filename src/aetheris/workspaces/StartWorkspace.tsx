/**
 * "Open a workspace" entry point for an existing conversation or an accepted introduction. The
 * caller decides where it is mounted; the database re-checks that the member really belongs to
 * the source. Nothing is created until the member submits, and what they typed stays on screen
 * when a write fails.
 */
import { useEffect, useRef, useState } from 'react'
import { Briefcase } from 'lucide-react'

import { Btn } from '../ui'
import { CURRENCIES, validateWorkspaceInput, type WorkspaceInput, type WorkspaceSource } from './lifecycle'
import { createWorkspace, findWorkspaceForSource } from './repo'

export const OPEN_WORKSPACE_KEY = 'aetheris-workspace-open'

export function StartWorkspaceButton({ source, sourceId, withName, onOpen, label = 'Open a business workspace' }: {
  source: WorkspaceSource; sourceId: string; withName: string; onOpen: () => void; label?: string
}) {
  const [open, setOpen] = useState(false)
  const [existing, setExisting] = useState<{ id: string; title: string } | null>(null)
  const [checked, setChecked] = useState(false)
  const [form, setForm] = useState<WorkspaceInput>({ title: '', scope: '', nextAction: '', budget: '', currency: 'usd', dueOn: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof WorkspaceInput, string>>>({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  useEffect(() => {
    let live = true
    setChecked(false); setExisting(null)
    findWorkspaceForSource(source, sourceId).then(r => { if (live) { setExisting(r); setChecked(true) } }, () => { if (live) setChecked(true) })
    return () => { live = false }
  }, [source, sourceId])

  const go = (id: string) => { try { sessionStorage.setItem(OPEN_WORKSPACE_KEY, id) } catch { /* private mode */ } onOpen() }

  const submit = async () => {
    if (lock.current) return
    const v = validateWorkspaceInput(form)
    if (!v.ok) { setErrors(v.errors); return }
    setErrors({}); setFailure('')
    lock.current = true; setBusy(true)
    try {
      const r = await createWorkspace(source, sourceId, v.value)
      if (!r.created) { setFailure('A workspace already exists for this source, so nothing new was created. Open it from Workspaces if you are on it.'); return }
      go(r.id)
      setOpen(false)
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not open the workspace.')
    } finally { lock.current = false; setBusy(false) }
  }

  if (existing) return <Btn kind="secondary" onClick={() => go(existing.id)}><Briefcase size={14} /> Open workspace: {existing.title}</Btn>

  const field = (k: keyof WorkspaceInput, text: string, extra: React.ReactNode) => <label>{text}{extra}{errors[k] && <small role="alert" className="og-note">{errors[k]}</small>}</label>
  const set = (k: keyof WorkspaceInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return <div className="og-start-workspace">
    {!open && <Btn kind="secondary" disabled={!checked} onClick={() => { setForm(f => ({ ...f, title: f.title || `Work with ${withName}` })); setOpen(true) }}><Briefcase size={14} /> {label}</Btn>}
    {open && <form className="executive-section" aria-label="Open a business workspace" onSubmit={e => { e.preventDefault(); void submit() }}>
      <p className="og-note">Private to you and {withName}. {withName} is invited and sees nothing until they accept. Messages and introduction notes are not copied in.</p>
      <div className="og-form">
        {field('title', 'Title', <input aria-label="Workspace title" value={form.title} onChange={set('title')} maxLength={160} />)}
        {field('scope', 'Scope', <textarea aria-label="Scope" rows={3} value={form.scope} onChange={set('scope')} />)}
        {field('nextAction', 'Next action', <input aria-label="Next action" value={form.nextAction} onChange={set('nextAction')} maxLength={500} />)}
        {field('budget', 'Budget (optional)', <input aria-label="Budget" inputMode="decimal" value={form.budget} onChange={set('budget')} />)}
        {field('currency', 'Currency', <select aria-label="Currency" value={form.currency} onChange={set('currency')}>{CURRENCIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select>)}
        {field('dueOn', 'Due date (optional)', <input aria-label="Due date" type="date" value={form.dueOn} onChange={set('dueOn')} />)}
      </div>
      {failure && <p role="alert" className="executive-form-note">{failure} Your entries are kept — try again.</p>}
      <div className="og-inline">
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Opening…' : 'Open workspace'}</button>
        <Btn kind="quiet" disabled={busy} onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </form>}
  </div>
}
