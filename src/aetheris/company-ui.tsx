/**
 * Company workspace: the relationships members chose to share with their company, how
 * much of that network depends on one person, and the departure handover. Shared-only:
 * nothing reaches the company unless its owner shares it here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, Check, LogOut, Plus, Trash2, UserPlus } from 'lucide-react'

import {
  coverageLabel, createInvite, createOrganization, joinOrganization, loadApprovedHandovers, loadMyHandover, loadMyOrgs,
  loadWorkspace, recordDeparture, saveHandover, setRole, shareRelationship, strengthLabel, summariseCoverage, withdrawShare,
  type CoverageRow, type Handover, type Org, type RosterRow, type SharedRelationship, type Strength,
} from './company'
import { useGraph } from './graph-store'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

function Setup({ onReady }: { onReady: (orgId: string) => void }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const create = async () => {
    if (!name.trim()) return
    const r = await createOrganization(name, domain)
    if (r.error || !r.id) { setMsg(r.error || 'Could not create the workspace.'); return }
    onReady(r.id)
  }
  const join = async () => {
    if (!code.trim()) return
    const r = await joinOrganization(code)
    if (r.error || !r.id) { setMsg(r.error || 'That invitation is not valid.'); return }
    onReady(r.id)
  }
  return <div className="og-form">
    <label>Company name<input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Manufacturing" /></label>
    <label>Website domain (optional)<input value={domain} onChange={e => setDomain(e.target.value)} placeholder="acme.com" /></label>
    <Btn kind="secondary" onClick={() => void create()}><Building2 size={14} /> Create company workspace</Btn>
    <label>Or join with an invitation code<input value={code} onChange={e => setCode(e.target.value)} placeholder="A1B2C3D4E5F6" /></label>
    <Btn kind="quiet" onClick={() => void join()}><UserPlus size={14} /> Join</Btn>
    {msg && <p className="og-note wide">{msg}</p>}
  </div>
}

const blankShare = { contactMemberId: '', contactName: '', contactCompany: '', strength: 'working' as Strength, context: '' }

export function CompanyWorkspacePanel() {
  const graph = useGraph()
  const net = useNetwork()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [orgId, setOrgId] = useState('')
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [shared, setShared] = useState<SharedRelationship[]>([])
  const [coverage, setCoverage] = useState<CoverageRow[]>([])
  const [handover, setHandover] = useState<Handover | null>(null)
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [draft, setDraft] = useState(blankShare)
  const [hand, setHand] = useState({ note: '', openLoops: '' })
  const [invite, setInvite] = useState('')
  const [msg, setMsg] = useState('')
  const me = graph.userId

  const loadOrgs = useCallback(async (prefer?: string) => {
    if (!me) return
    const r = await loadMyOrgs(me)
    setOrgs(r.data)
    setOrgId(cur => prefer ?? (r.data.some(o => o.id === cur) ? cur : r.data[0]?.id ?? ''))
    if (r.error) setMsg(r.error)
  }, [me])
  useEffect(() => { void loadOrgs() }, [loadOrgs])

  const org = orgs.find(o => o.id === orgId)
  const isAdmin = org?.role === 'admin'
  const load = useCallback(async () => {
    if (!orgId || !me) return
    const w = await loadWorkspace(orgId)
    setRoster(w.roster); setShared(w.shared); setCoverage(w.coverage)
    const h = await loadMyHandover(orgId, me)
    setHandover(h); setHand({ note: h?.note ?? '', openLoops: h?.openLoops ?? '' })
    setHandovers(isAdmin ? await loadApprovedHandovers(orgId) : [])
    if (w.error) setMsg(w.error)
  }, [orgId, me, isAdmin])
  useEffect(() => { void load() }, [load])

  const nameOf = useCallback((id: string) => (id === me ? 'You' : net.members.find(m => m.id === id)?.name ?? 'Former colleague'), [me, net.members])
  const summary = useMemo(() => summariseCoverage(coverage), [coverage])
  const connections = useMemo(() => net.members.filter(m => net.connections.includes(m.id)), [net.members, net.connections])

  const act = async (p: Promise<{ error: string }>, done: string) => {
    const r = await p
    setMsg(r.error || done)
    await load()
  }

  if (!graph.signedIn) return null

  return <section className="executive-section og-org cw">
    <Eyebrow><Building2 size={12} /> COMPANY WORKSPACE</Eyebrow>
    <h2>Relationships the company keeps when people move on.</h2>
    <p className="og-note">You choose what to share. While you work here you can withdraw any share. If you leave, the company keeps what you shared and the handover you approve. Everything else stays yours.</p>

    {orgs.length > 1 && <label>Workspace<select value={orgId} onChange={e => setOrgId(e.target.value)}>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
    {!org && <Setup onReady={id => void loadOrgs(id)} />}

    {org && <>
      <div className={`cw-summary ${summary.atRisk ? 'risk' : summary.singleOwner ? 'warn' : ''}`}>
        {(summary.atRisk > 0 || summary.singleOwner > 0) && <AlertTriangle size={14} />}
        <span><b>{org.name}</b> · {summary.headline}</span>
      </div>

      {coverage.length > 0 && <ul className="cw-list">{coverage.map(c => <li key={c.contactKey} className={`cov-${c.coverage}`}>
        <span><b>{c.contactName}</b>{c.contactCompany ? ` · ${c.contactCompany}` : ''}</span>
        <small>{coverageLabel[c.coverage]}{c.departedOwners ? ` · ${c.departedOwners} who held it have left` : ''}</small>
      </li>)}</ul>}

      <details className="og-feedback">
        <summary><Plus size={13} /> Share a relationship with {org.name}</summary>
        <div className="og-form">
          {connections.length > 0 && <label>From your network<select value={draft.contactMemberId} onChange={e => {
            const m = net.members.find(x => x.id === e.target.value)
            setDraft(d => ({ ...d, contactMemberId: e.target.value, contactName: m?.name ?? d.contactName, contactCompany: m?.company ?? d.contactCompany }))
          }}><option value="">Someone outside Ask Intros</option>{connections.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
          <label>Name<input value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} /></label>
          <label>Their company<input value={draft.contactCompany} onChange={e => setDraft(d => ({ ...d, contactCompany: e.target.value }))} /></label>
          <label>Relationship<select value={draft.strength} onChange={e => setDraft(d => ({ ...d, strength: e.target.value as Strength }))}>
            {(Object.keys(strengthLabel) as Strength[]).map(s => <option key={s} value={s}>{strengthLabel[s]}</option>)}</select></label>
          <label className="wide">What the company should know (shared with your team)<textarea rows={2} maxLength={1000} value={draft.context} onChange={e => setDraft(d => ({ ...d, context: e.target.value }))} placeholder="Role, what they care about, open work with us" /></label>
          <Btn kind="secondary" disabled={!draft.contactName.trim()} onClick={() => void (async () => {
            const r = await shareRelationship(orgId, { ...draft, contactMemberId: draft.contactMemberId || null })
            setMsg(r.error || 'Shared with the company.')
            if (!r.error) setDraft(blankShare)
            await load()
          })()}><Check size={14} /> Share</Btn>
        </div>
      </details>

      {shared.some(s => s.ownerId === me) && <details className="og-feedback">
        <summary>What you have shared ({shared.filter(s => s.ownerId === me).length})</summary>
        <ul className="cw-list">{shared.filter(s => s.ownerId === me).map(s => <li key={s.id}>
          <span><b>{s.contactName}</b>{s.contactCompany ? ` · ${s.contactCompany}` : ''} · {strengthLabel[s.strength]}</span>
          {s.context && <small>{s.context}</small>}
          <button aria-label={`Withdraw ${s.contactName}`} onClick={() => void act(withdrawShare(s.id), 'Withdrawn from the company workspace.')}><Trash2 size={12} /></button>
        </li>)}</ul>
      </details>}

      <details className="og-feedback">
        <summary>Team ({roster.filter(r => r.status === 'active').length} active)</summary>
        <ul className="cw-list">{roster.map(r => <li key={r.userId} className={r.status === 'departed' ? 'gone' : ''}>
          <span><b>{nameOf(r.userId)}</b> · {r.role === 'admin' ? 'Admin' : 'Member'}{r.status === 'departed' ? ' · left' : ''}</span>
          <small>{shared.filter(s => s.ownerId === r.userId).length} shared</small>
          {isAdmin && r.status === 'active' && r.userId !== me && <span className="cw-actions">
            <button onClick={() => void act(setRole(orgId, r.userId, r.role === 'admin' ? 'member' : 'admin'), 'Role updated.')}>{r.role === 'admin' ? 'Make member' : 'Make admin'}</button>
            <button onClick={() => void act(recordDeparture(orgId, r.userId), 'Departure recorded. Their shared relationships stay with the company.')}>Record departure</button>
          </span>}
        </li>)}</ul>
        {isAdmin && <div className="og-inline">
          <Btn kind="quiet" onClick={() => void createInvite(orgId, 10).then(r => { setInvite(r.code ?? ''); setMsg(r.error || 'Invitation code created. It works 10 times over 14 days.') })}><UserPlus size={13} /> Create invitation code</Btn>
          {invite && <code className="cw-code">{invite}</code>}
        </div>}
      </details>

      {isAdmin && handovers.length > 0 && <details className="og-feedback">
        <summary>Handovers from people who left ({handovers.length})</summary>
        <ul className="cw-list">{handovers.map(h => <li key={h.id}>
          <span><b>{nameOf(h.authorId)}</b>{h.approvedAt ? ` · ${new Date(h.approvedAt).toLocaleDateString()}` : ''}</span>
          <small className="cw-pre">{h.note}{h.openLoops ? `\n\nOpen loops: ${h.openLoops}` : ''}</small>
        </li>)}</ul>
      </details>}

      <details className="og-feedback">
        <summary><LogOut size={13} /> Leaving {org.name}</summary>
        <p className="og-note">Write a handover first. Your admins see it only after you approve it, and an approved handover cannot be changed. When you leave, you lose access to this workspace; what you shared stays with the company.</p>
        {handover?.approved
          ? <p className="og-note"><Check size={12} /> Handover approved{handover.approvedAt ? ` on ${new Date(handover.approvedAt).toLocaleDateString()}` : ''}.</p>
          : <div className="og-form">
            <label className="wide">Who matters and how to approach them<textarea rows={3} maxLength={4000} value={hand.note} onChange={e => setHand(h => ({ ...h, note: e.target.value }))} /></label>
            <label className="wide">Open loops and commitments<textarea rows={2} maxLength={4000} value={hand.openLoops} onChange={e => setHand(h => ({ ...h, openLoops: e.target.value }))} /></label>
            <Btn kind="quiet" onClick={() => void act(saveHandover(orgId, hand.note, hand.openLoops, false), 'Draft saved. Only you can see it.')}>Save draft</Btn>
            <Btn kind="secondary" disabled={!hand.note.trim()} onClick={() => void act(saveHandover(orgId, hand.note, hand.openLoops, true), 'Handover approved and shared with your admins.')}>Approve handover</Btn>
          </div>}
        {me && <Btn kind="quiet" onClick={() => {
          if (window.confirm(`Leave ${org.name}? You will lose access to its workspace. What you shared stays with the company.`)) void act(recordDeparture(orgId, me), 'You have left the workspace.').then(() => loadOrgs())
        }}><LogOut size={13} /> Leave {org.name}</Btn>}
      </details>
    </>}
    {msg && <p className="og-note">{msg}</p>}
  </section>
}
