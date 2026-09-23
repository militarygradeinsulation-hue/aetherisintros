/**
 * AETHERIS CRM — the operating layer over one account-scoped data graph.
 *
 * Every list here is a view over the same canonical records Grid projects and
 * Intros links to. A person entered once is the same person everywhere; nothing
 * is copied between modules.
 */
import { useState } from 'react'
import {
  ArrowRight, Building2, CheckCircle2, ChevronLeft, ClipboardList, Compass, Grid3x3,
  Handshake, Plus, Target, UserRound,
} from 'lucide-react'

import { Btn, Eyebrow, Head } from '../ui'
import { useNav } from '../nav'
import { useNetwork } from '../store'
import { useOps } from '../crm/store'
import { lifecycles } from '../crm/types'
import { WeatherPanel } from '../opportunity-ui'
import type { CrmCompany, CrmOpportunity, CrmPerson, CrmTask, Lifecycle } from '../crm/types'

type Tab = 'overview' | 'people' | 'companies' | 'opportunities' | 'activities' | 'tasks' | 'analytics'
type Selection = { type: 'person' | 'company' | 'opportunity'; id: string } | null

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'companies', label: 'Companies' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'activities', label: 'Activity' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'analytics', label: 'Analytics' },
]

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

export default function CrmPage() {
  const ops = useOps()
  const net = useNetwork()
  const nav = useNav()
  const [tab, setTab] = useState<Tab>(() => (typeof window === 'undefined' ? 'overview' : (localStorage.getItem('aetheris.crm.tab') as Tab) || 'overview'))
  const [selected, setSelected] = useState<Selection>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<'person' | 'company' | 'opportunity' | 'task' | null>(null)

  const go = (next: Tab) => { setTab(next); setSelected(null); try { localStorage.setItem('aetheris.crm.tab', next) } catch { /* ignore */ } }

  const people = ops.people.filter(p => !p.archived)
  const companies = ops.companies.filter(c => !c.archived)
  const opportunities = ops.opportunities.filter(o => !o.archived)
  const openOpps = opportunities.filter(o => o.status === 'open')
  const openTasks = ops.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const pipelineValue = openOpps.reduce((sum, o) => sum + o.amount, 0)
  const weighted = openOpps.reduce((sum, o) => sum + (o.amount * o.probability) / 100, 0)
  const stages = ops.stages.filter(s => s.pipelineId === (ops.pipelines[0]?.id ?? '')).sort((a, b) => a.position - b.position)

  const memberFor = (person: CrmPerson) => (person.memberId ? net.members.find(m => m.id === person.memberId) : undefined)
  const term = query.trim().toLowerCase()
  const match = (text: string) => !term || text.toLowerCase().includes(term)

  if (!ops.ready) return <p className="ops-note">Loading your records…</p>

  /* --------------------------------------------------------------- detail */

  if (selected) {
    return <CrmDetail selection={selected} onClose={() => setSelected(null)} onOpen={setSelected} />
  }

  const empty = !people.length && !companies.length && !opportunities.length

  return <>
    <Head label="AETHERIS CRM" title="One record per person. Everywhere."
      copy="Enter a person, company, opportunity or number once and the whole account uses it — CRM lists, Grid sheets, your pipeline and the relationship intelligence beside them."
      proof="Private to your account. Nothing here is visible to the network."
      action={<Btn onClick={() => setCreating('person')}><Plus size={14} /> New person</Btn>} />

    <nav className="ops-tabs" role="tablist" aria-label="CRM sections">
      {tabs.map(t => <button key={t.id} role="tab" aria-selected={t.id === tab}
        className={t.id === tab ? 'active' : ''} onClick={() => go(t.id)}>{t.label}</button>)}
    </nav>

    {creating && <CreateForm kind={creating} onClose={() => setCreating(null)} />}

    {empty && tab !== 'overview' && <p className="ops-note">Nothing here yet. Add your first record from Overview.</p>}

    {tab === 'overview' && <section className="ops-overview">
      <div className="ops-stats">
        <div><Eyebrow>OPEN PIPELINE</Eyebrow><strong>{money(pipelineValue)}</strong><small>{openOpps.length} active opportunities</small></div>
        <div><Eyebrow>WEIGHTED</Eyebrow><strong>{money(Math.round(weighted))}</strong><small>By stage probability — modelled, not promised</small></div>
        <div><Eyebrow>PEOPLE</Eyebrow><strong>{people.length}</strong><small>{people.filter(p => p.memberId).length} linked to network members</small></div>
        <div><Eyebrow>TASKS DUE</Eyebrow><strong>{openTasks.length}</strong><small>{openTasks.filter(t => t.dueAt && t.dueAt < new Date().toISOString()).length} overdue</small></div>
      </div>

      <div className="ops-cols">
        <article className="ops-panel">
          <Eyebrow>RELATIONSHIPS NEEDING ATTENTION</Eyebrow>
          {people.filter(p => !p.lastActivityAt).slice(0, 6).map(p => <button key={p.id} className="ops-row" onClick={() => setSelected({ type: 'person', id: p.id })}>
            <span><b>{p.fullName}</b><small>{p.title || p.lifecycle}{p.companyName ? ` · ${p.companyName}` : ''}</small></span>
            <em>No activity logged</em><ArrowRight size={14} />
          </button>)}
          {!people.length && <p className="ops-note">Add a person, or link one from the network with “Add to CRM” on their profile.</p>}
        </article>

        <article className="ops-panel">
          <Eyebrow>RECENT CHANGES</Eyebrow>
          {ops.events.slice(0, 8).map(e => <p key={e.id} className="ops-event"><b>{e.summary}</b><small>{day(e.createdAt)}</small></p>)}
          {!ops.events.length && <p className="ops-note">Every create, edit and Grid change is recorded here.</p>}
        </article>
      </div>

      <div className="ops-quick">
        <Eyebrow>QUICK CREATE</Eyebrow>
        <div>
          <Btn kind="secondary" onClick={() => setCreating('person')}><UserRound size={14} /> Person</Btn>
          <Btn kind="secondary" onClick={() => setCreating('company')}><Building2 size={14} /> Company</Btn>
          <Btn kind="secondary" onClick={() => setCreating('opportunity')}><Target size={14} /> Opportunity</Btn>
          <Btn kind="secondary" onClick={() => setCreating('task')}><ClipboardList size={14} /> Task</Btn>
          <Btn kind="quiet" onClick={() => nav.setPage('grid')}><Grid3x3 size={14} /> Open Grid</Btn>
        </div>
      </div>
    </section>}

    {tab === 'people' && <section>
      <div className="ops-toolbar">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people, titles, companies…" aria-label="Search people" />
        <Btn kind="secondary" onClick={() => setCreating('person')}><Plus size={14} /> New person</Btn>
      </div>
      <div className="ops-table-scroll" tabIndex={0} aria-label="CRM people table">
      <table className="ops-table">
        <thead><tr><th>Person</th><th>Lifecycle</th><th>Company</th><th>Title</th><th>Network</th><th>Last activity</th></tr></thead>
        <tbody>
          {people.filter(p => match(`${p.fullName} ${p.title} ${p.companyName} ${p.email}`)).map(p => {
            const member = memberFor(p)
            return <tr key={p.id} onClick={() => setSelected({ type: 'person', id: p.id })}>
              <td><b>{p.fullName}</b></td>
              <td><span className="ops-chip">{p.lifecycle}</span></td>
              <td>{p.companyName || '—'}</td><td>{p.title || '—'}</td>
              <td>{member ? <em className="ops-signal">{member.scoreTotal} · {member.relationshipStatus}</em> : '—'}</td>
              <td>{day(p.lastActivityAt)}</td>
            </tr>
          })}
        </tbody>
      </table>
      </div>
    </section>}

    {tab === 'companies' && <section>
      <div className="ops-toolbar">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies…" aria-label="Search companies" />
        <Btn kind="secondary" onClick={() => setCreating('company')}><Plus size={14} /> New company</Btn>
      </div>
      <div className="ops-table-scroll" tabIndex={0} aria-label="CRM companies table">
      <table className="ops-table">
        <thead><tr><th>Company</th><th>Industry</th><th>Location</th><th>People</th><th>Open value</th></tr></thead>
        <tbody>
          {companies.filter(c => match(`${c.name} ${c.industry} ${c.location}`)).map(c => <tr key={c.id} onClick={() => setSelected({ type: 'company', id: c.id })}>
            <td><b>{c.name}</b></td><td>{c.industry || '—'}</td><td>{c.location || '—'}</td>
            <td>{people.filter(p => p.companyId === c.id).length}</td>
            <td>{money(openOpps.filter(o => o.companyId === c.id).reduce((s, o) => s + o.amount, 0))}</td>
          </tr>)}
        </tbody>
      </table>
      </div>
    </section>}

    {tab === 'opportunities' && <section>
      <div className="ops-toolbar">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search opportunities…" aria-label="Search opportunities" />
        <Btn kind="secondary" onClick={() => setCreating('opportunity')}><Plus size={14} /> New opportunity</Btn>
      </div>
      <div className="ops-board">
        {stages.map(stage => {
          const items = opportunities.filter(o => o.stageId === stage.id && match(o.name))
          return <div key={stage.id} className="ops-lane">
            <header><b>{stage.name}</b><small>{money(items.reduce((s, o) => s + o.amount, 0))}</small></header>
            {items.map(o => <button key={o.id} className="ops-card" onClick={() => setSelected({ type: 'opportunity', id: o.id })}>
              <b>{o.name}</b>
              <small>{money(o.amount)} · {o.probability}%</small>
              {o.nextAction && <em>{o.nextAction}</em>}
            </button>)}
            {!items.length && <p className="ops-lane-empty">—</p>}
          </div>
        })}
      </div>
      <div className="ops-table-scroll" tabIndex={0} aria-label="CRM opportunities table">
      <table className="ops-table">
        <thead><tr><th>Opportunity</th><th>Stage</th><th>Value</th><th>Probability</th><th>Expected close</th><th>Next action</th></tr></thead>
        <tbody>
          {opportunities.filter(o => match(o.name)).map(o => <tr key={o.id} onClick={() => setSelected({ type: 'opportunity', id: o.id })}>
            <td><b>{o.name}</b></td><td>{o.stageName || '—'}</td><td>{money(o.amount)}</td>
            <td>{o.probability}%</td><td>{o.expectedClose ?? '—'}</td><td>{o.nextAction || '—'}</td>
          </tr>)}
        </tbody>
      </table>
      </div>
    </section>}

    {tab === 'activities' && <section className="ops-panel">
      <Eyebrow>EVERY TOUCHPOINT</Eyebrow>
      {ops.activities.map(a => <p key={a.id} className="ops-event">
        <b>{a.subject}</b>
        <small>{a.kind} · {day(a.occurredAt)}{a.personId ? ` · ${people.find(p => p.id === a.personId)?.fullName ?? ''}` : ''}</small>
        {a.detail && <span>{a.detail}</span>}
      </p>)}
      {!ops.activities.length && <p className="ops-note">Log a call, meeting or note from any person or opportunity and it appears here.</p>}
    </section>}

    {tab === 'tasks' && <section>
      <div className="ops-toolbar">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks…" aria-label="Search tasks" />
        <Btn kind="secondary" onClick={() => setCreating('task')}><Plus size={14} /> New task</Btn>
      </div>
      <div className="ops-table-scroll" tabIndex={0} aria-label="CRM tasks table">
      <table className="ops-table">
        <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th><th>Related</th><th /></tr></thead>
        <tbody>
          {ops.tasks.filter(t => match(t.title)).map(t => <tr key={t.id}>
            <td><b>{t.title}</b></td>
            <td><select value={t.status} aria-label={`${t.title} status`} onChange={e => void ops.updateTask(t.id, { status: e.target.value as CrmTask['status'] })}>
              {(['open', 'doing', 'done', 'cancelled'] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select></td>
            <td>{t.priority}</td><td>{day(t.dueAt)}</td>
            <td>{people.find(p => p.id === t.personId)?.fullName ?? opportunities.find(o => o.id === t.opportunityId)?.name ?? '—'}</td>
            <td><button className="ops-link" onClick={() => void ops.removeTask(t.id)}>Delete</button></td>
          </tr>)}
        </tbody>
      </table>
      </div>
    </section>}

    {tab === 'analytics' && <section className="ops-cols">
      <article className="ops-panel">
        <Eyebrow>PIPELINE BY STAGE</Eyebrow>
        {stages.map(stage => {
          const items = openOpps.filter(o => o.stageId === stage.id)
          const value = items.reduce((s, o) => s + o.amount, 0)
          const width = pipelineValue ? Math.max(2, Math.round((value / pipelineValue) * 100)) : 0
          return <div key={stage.id} className="ops-bar"><span>{stage.name}</span><i><b style={{ width: `${width}%` }} /></i><em>{money(value)}</em></div>
        })}
        {!openOpps.length && <p className="ops-note">Add an opportunity to see pipeline distribution.</p>}
      </article>
      <article className="ops-panel">
        <Eyebrow>WHERE THE WORK IS</Eyebrow>
        <p className="ops-event"><b>{ops.activities.length} touchpoints recorded</b><small>Calls, meetings, messages, intros and notes</small></p>
        <p className="ops-event"><b>{opportunities.filter(o => o.status === 'won').length} won · {opportunities.filter(o => o.status === 'lost').length} not now</b><small>Recorded outcomes only</small></p>
        <p className="ops-event"><b>{people.filter(p => p.memberId).length} people linked to the network</b><small>Relationship intelligence appears on those records</small></p>
        <p className="ops-note">Values shown are what you entered. Weighted pipeline is modelled from stage probability and labelled as such — nothing here is estimated for you.</p>
      </article>
    </section>}
  </>
}

/* ------------------------------------------------------------------ detail */

function CrmDetail({ selection, onClose, onOpen }: {
  selection: NonNullable<Selection>; onClose: () => void; onOpen: (s: Selection) => void
}) {
  const ops = useOps()
  const net = useNetwork()
  const nav = useNav()
  const [note, setNote] = useState('')
  const [activity, setActivity] = useState('')

  const person = selection.type === 'person' ? ops.people.find(p => p.id === selection.id) : undefined
  const company = selection.type === 'company' ? ops.companies.find(c => c.id === selection.id) : undefined
  const opportunity = selection.type === 'opportunity' ? ops.opportunities.find(o => o.id === selection.id) : undefined
  const record = person ?? company ?? opportunity
  if (!record) return <p className="ops-note">That record is no longer available.</p>

  const title = person?.fullName ?? company?.name ?? opportunity?.name ?? 'Record'
  const notes = ops.notes.filter(n => n.entityId === record.id)
  const activities = ops.activities.filter(a =>
    a.personId === record.id || a.companyId === record.id || a.opportunityId === record.id)
  const member = person?.memberId ? net.members.find(m => m.id === person.memberId) : undefined
  const stages = ops.stages.filter(s => s.pipelineId === (opportunity?.pipelineId ?? ops.pipelines[0]?.id ?? '')).sort((a, b) => a.position - b.position)
  const sheetsWith = ops.sheets.filter(s => s.mode === 'linked' && s.entityType === `crm_${selection.type === 'opportunity' ? 'opportunities' : selection.type === 'company' ? 'companies' : 'people'}`)

  return <article className="ops-detail">
    <button className="member-back" onClick={onClose}><ChevronLeft size={16} /> Back to CRM</button>

    <header className="ops-detail-head">
      <div>
        <Eyebrow>{selection.type === 'person' ? 'CRM PERSON' : selection.type === 'company' ? 'CRM COMPANY' : 'CRM OPPORTUNITY'}</Eyebrow>
        <h1>{title}</h1>
        {person && <p>{person.title || '—'}{person.companyName ? ` · ${person.companyName}` : ''}{person.location ? ` · ${person.location}` : ''}</p>}
        {company && <p>{company.industry || '—'}{company.location ? ` · ${company.location}` : ''}</p>}
        {opportunity && <p>{money(opportunity.amount)} · {opportunity.stageName || 'no stage'} · {opportunity.probability}%</p>}
      </div>
      <div className="ops-detail-actions">
        {person && <select value={person.lifecycle} aria-label="Lifecycle"
          onChange={e => void ops.updatePerson(person.id, { lifecycle: e.target.value as Lifecycle })}>
          {lifecycles.map(l => <option key={l} value={l}>{l}</option>)}
        </select>}
        {opportunity && <select value={opportunity.stageId ?? ''} aria-label="Stage"
          onChange={e => void ops.moveOpportunity(opportunity.id, e.target.value)}>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>}
        {opportunity && <Btn kind="secondary" onClick={() => nav.setPage('discover')}><Compass size={14} /> Find help in my network</Btn>}
        {member && <Btn kind="secondary" onClick={() => nav.openMember(member)}><Handshake size={14} /> Open network profile</Btn>}
        <Btn kind="quiet" onClick={() => nav.setPage('grid')}><Grid3x3 size={14} /> Open in Grid</Btn>
      </div>
    </header>
    {member && <WeatherPanel member={member} />}

    {member && <section className="ops-panel ops-intel">
      <Eyebrow>RELATIONSHIP INTELLIGENCE · LINKED NETWORK MEMBER</Eyebrow>
      <div className="ops-intel-grid">
        <p><b>Why them</b><span>{member.whyThem}</span></p>
        <p><b>Why you</b><span>{member.whyYou}</span></p>
        <p><b>Why now</b><span>{member.whyNow}</span></p>
        <p><b>Connection score</b><span>{member.scoreTotal} · {member.relationshipStatus}</span></p>
        <p><b>Warm path</b><span>{member.bestPath.join(' → ')}</span></p>
        <p><b>Next action</b><span>{member.nextAction}</span></p>
      </div>
      <small>Read from the network record — it is never copied into this CRM person.</small>
    </section>}

    <div className="ops-cols">
      <section className="ops-panel">
        <Eyebrow>EDIT RECORD</Eyebrow>
        {person && <div className="ops-form">
          <label>Name<input defaultValue={person.fullName} onBlur={e => void ops.updatePerson(person.id, { fullName: e.target.value })} /></label>
          <label>Title<input defaultValue={person.title} onBlur={e => void ops.updatePerson(person.id, { title: e.target.value })} /></label>
          <label>Company<input defaultValue={person.companyName} onBlur={e => void ops.updatePerson(person.id, { companyName: e.target.value })} /></label>
          <label>Email<input defaultValue={person.email} onBlur={e => void ops.updatePerson(person.id, { email: e.target.value })} /></label>
          <label>Phone<input defaultValue={person.phone} onBlur={e => void ops.updatePerson(person.id, { phone: e.target.value })} /></label>
          <label>Location<input defaultValue={person.location} onBlur={e => void ops.updatePerson(person.id, { location: e.target.value })} /></label>
          <Btn kind="quiet" onClick={() => { void ops.archivePerson(person.id); onClose() }}>Archive person</Btn>
        </div>}
        {company && <div className="ops-form">
          <label>Name<input defaultValue={company.name} onBlur={e => void ops.updateCompany(company.id, { name: e.target.value })} /></label>
          <label>Industry<input defaultValue={company.industry} onBlur={e => void ops.updateCompany(company.id, { industry: e.target.value })} /></label>
          <label>Location<input defaultValue={company.location} onBlur={e => void ops.updateCompany(company.id, { location: e.target.value })} /></label>
          <label>Website<input defaultValue={company.website} onBlur={e => void ops.updateCompany(company.id, { website: e.target.value })} /></label>
          <label>Employees<input defaultValue={company.employees} onBlur={e => void ops.updateCompany(company.id, { employees: e.target.value })} /></label>
          <Btn kind="quiet" onClick={() => { void ops.archiveCompany(company.id); onClose() }}>Archive company</Btn>
        </div>}
        {opportunity && <div className="ops-form">
          <label>Name<input defaultValue={opportunity.name} onBlur={e => void ops.updateOpportunity(opportunity.id, { name: e.target.value })} /></label>
          <label>Value (USD)<input type="number" defaultValue={opportunity.amount} onBlur={e => void ops.updateOpportunity(opportunity.id, { amount: Number(e.target.value) || 0 })} /></label>
          <label>Expected close<input type="date" defaultValue={opportunity.expectedClose ?? ''} onBlur={e => void ops.updateOpportunity(opportunity.id, { expectedClose: e.target.value || null })} /></label>
          <label>Next action<input defaultValue={opportunity.nextAction} onBlur={e => void ops.updateOpportunity(opportunity.id, { nextAction: e.target.value })} /></label>
          <label>Detail<textarea defaultValue={opportunity.detail} onBlur={e => void ops.updateOpportunity(opportunity.id, { detail: e.target.value })} /></label>
          <Btn kind="quiet" onClick={() => { void ops.archiveOpportunity(opportunity.id); onClose() }}>Archive opportunity</Btn>
        </div>}
      </section>

      <section className="ops-panel">
        <Eyebrow>TIMELINE</Eyebrow>
        <div className="ops-log-form">
          <input value={activity} onChange={e => setActivity(e.target.value)} placeholder="Log a call, meeting or message…" aria-label="Log activity" />
          <Btn kind="secondary" disabled={!activity.trim()} onClick={() => {
            void ops.logActivity({
              kind: 'note', subject: activity.trim(),
              ...(person ? { personId: person.id } : company ? { companyId: company.id } : { opportunityId: opportunity?.id ?? null }),
            })
            setActivity('')
          }}>Log</Btn>
        </div>
        {activities.map(a => <p key={a.id} className="ops-event"><b>{a.subject}</b><small>{a.kind} · {day(a.occurredAt)}</small></p>)}
        {!activities.length && <p className="ops-note">No touchpoints recorded yet.</p>}
      </section>
    </div>

    <div className="ops-cols">
      <section className="ops-panel">
        <Eyebrow>NOTES</Eyebrow>
        <div className="ops-log-form">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" aria-label="Add note" />
          <Btn kind="secondary" disabled={!note.trim()} onClick={() => { void ops.addNote(selection.type, record.id, note.trim()); setNote('') }}>Add</Btn>
        </div>
        {notes.map(n => <p key={n.id} className="ops-event"><b>{n.body}</b><small>{day(n.createdAt)} · <button className="ops-link" onClick={() => void ops.removeNote(n.id)}>remove</button></small></p>)}
        {!notes.length && <p className="ops-note">Notes stay private to your account.</p>}
      </section>

      <section className="ops-panel">
        <Eyebrow>RELATED</Eyebrow>
        {person && <>
          {ops.opportunities.filter(o => o.personId === person.id && !o.archived).map(o => <button key={o.id} className="ops-row" onClick={() => onOpen({ type: 'opportunity', id: o.id })}>
            <span><b>{o.name}</b><small>{money(o.amount)} · {o.stageName}</small></span><ArrowRight size={14} /></button>)}
          {person.companyId && <button className="ops-row" onClick={() => onOpen({ type: 'company', id: person.companyId! })}>
            <span><b>{person.companyName}</b><small>Company record</small></span><ArrowRight size={14} /></button>}
        </>}
        {company && ops.people.filter(p => p.companyId === company.id && !p.archived).map(p => <button key={p.id} className="ops-row" onClick={() => onOpen({ type: 'person', id: p.id })}>
          <span><b>{p.fullName}</b><small>{p.title || p.lifecycle}</small></span><ArrowRight size={14} /></button>)}
        {opportunity && <>
          {opportunity.personId && <button className="ops-row" onClick={() => onOpen({ type: 'person', id: opportunity.personId! })}>
            <span><b>{ops.people.find(p => p.id === opportunity.personId)?.fullName ?? 'Person'}</b><small>Linked person</small></span><ArrowRight size={14} /></button>}
          {opportunity.companyId && <button className="ops-row" onClick={() => onOpen({ type: 'company', id: opportunity.companyId! })}>
            <span><b>{ops.companies.find(c => c.id === opportunity.companyId)?.name ?? 'Company'}</b><small>Linked company</small></span><ArrowRight size={14} /></button>}
        </>}
        {sheetsWith.length > 0 && <p className="ops-note">
          This record also appears in {sheetsWith.length === 1 ? 'the Grid sheet' : 'Grid sheets'} {sheetsWith.map(s => s.name).join(', ')}.
        </p>}
        <div className="ops-related-tasks">
          {ops.tasks.filter(t => t.personId === record.id || t.companyId === record.id || t.opportunityId === record.id).map(t => <p key={t.id} className="ops-event">
            <b>{t.title}</b><small>{t.status} · due {day(t.dueAt)}</small></p>)}
        </div>
      </section>
    </div>
  </article>
}

/* ------------------------------------------------------------------ create */

function CreateForm({ kind, onClose }: { kind: 'person' | 'company' | 'opportunity' | 'task'; onClose: () => void }) {
  const ops = useOps()
  const [name, setName] = useState('')
  const [second, setSecond] = useState('')
  const [amount, setAmount] = useState('')
  const [lifecycle, setLifecycle] = useState<Lifecycle>('Lead')

  const submit = async () => {
    const value = name.trim()
    if (!value) return
    if (kind === 'person') await ops.createPerson({ fullName: value, companyName: second.trim(), lifecycle } as Partial<CrmPerson>)
    if (kind === 'company') await ops.createCompany({ name: value, industry: second.trim() } as Partial<CrmCompany>)
    if (kind === 'opportunity') await ops.createOpportunity({ name: value, nextAction: second.trim(), amount: Number(amount) || 0 } as Partial<CrmOpportunity>)
    if (kind === 'task') await ops.createTask({ title: value, detail: second.trim() } as Partial<CrmTask>)
    onClose()
  }

  return <section className="ops-create">
    <Eyebrow>NEW {kind.toUpperCase()}</Eyebrow>
    <div className="ops-create-row">
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        placeholder={kind === 'person' ? 'Full name' : kind === 'company' ? 'Company name' : kind === 'opportunity' ? 'Opportunity name' : 'Task title'} />
      <input value={second} onChange={e => setSecond(e.target.value)}
        placeholder={kind === 'person' ? 'Company (optional)' : kind === 'company' ? 'Industry (optional)' : kind === 'opportunity' ? 'Next action (optional)' : 'Detail (optional)'} />
      {kind === 'opportunity' && <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Value (USD)" />}
      {kind === 'person' && <select value={lifecycle} onChange={e => setLifecycle(e.target.value as Lifecycle)} aria-label="Lifecycle">
        {lifecycles.map(l => <option key={l} value={l}>{l}</option>)}
      </select>}
      <Btn onClick={() => void submit()}><CheckCircle2 size={14} /> Save</Btn>
      <Btn kind="quiet" onClick={onClose}>Cancel</Btn>
    </div>
    <small>Saved once, available in CRM, Grid and every linked view.</small>
  </section>
}
