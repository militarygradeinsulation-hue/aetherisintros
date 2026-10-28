import { CrmOpportunityReadiness } from '../components/CrmOpportunityReadiness'
/**
 * AETHERIS CRM — the operating layer over one account-scoped data graph.
 *
 * Every list here is a view over the same canonical records Grid projects and
 * Intros links to. A person entered once is the same person everywhere; nothing
 * is copied between modules.
 */
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Building2, CheckCircle2, ChevronLeft, ClipboardList, Compass, Grid3x3,
  Handshake, LayoutGrid, Plus, ScanLine, Target, UserRound, FileUp,
} from 'lucide-react'

import { Btn, Eyebrow, Head } from '../ui'
import { useNav } from '../nav'
import { useNetwork } from '../store'
import { useOps } from '../crm/store'
import { lifecycles } from '../crm/types'
import { WeatherPanel } from '../opportunity-ui'
import { DoMore } from '../capabilities/DoMore'
import { CompanyIntelligence } from '../capabilities/CompanyIntelligence'
import { ProfessionalInfo } from '../capabilities/ProfessionalInfo'
import { setActiveSubject } from '../capabilities/store'
import { LedgerProvider } from '../ledger/store'
import { normalizeLinkedInUrl } from '../linkedin-import'
import { CONTACT_KEYS, splitList } from '../linkedin-scan'
import { LinkedInScanPanel } from '../linkedin-scan-ui'
import FullCrm from '../ledger/FullCrm'
import SheetImport from '../ledger/SheetImport'
import { hasPendingSheet } from '../drop-anywhere'
import { daysLeftInTrash, isTrashExpired } from '../crm/trash'
import { CrmOverviewBento } from '@/components/ui/crm-overview-bento'
import { OpenDealRoomButton } from '../deals-ui'
import { ProspectEngine } from '../prospect/ProspectEngine'
import { useAccess } from '../access'
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

export default function CrmPage({ section }: { section?: 'crm' | 'pipeline' | undefined }) {
  const ops = useOps()
  const { access } = useAccess()
  const [prospecting, setProspecting] = useState(false)
  const [importing, setImporting] = useState(hasPendingSheet)
  useEffect(() => { const open = () => setImporting(true); window.addEventListener('aetheris:crm-import', open); return () => window.removeEventListener('aetheris:crm-import', open) }, [])
  const net = useNetwork()
  const nav = useNav()
  const [tab, setTab] = useState<Tab>(() => (section === 'pipeline' ? 'opportunities' : section === 'crm' ? 'overview' : typeof window === 'undefined' ? 'overview' : (localStorage.getItem('aetheris.crm.tab') as Tab) || 'overview'))
  const [selected, setSelected] = useState<Selection>(null)
  const [openForEdit, setOpenForEdit] = useState(false)
  const [query, setQuery] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [filterLife, setFilterLife] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [onlyUploaded, setOnlyUploaded] = useState(false)
  const [filterHas, setFilterHas] = useState<'' | 'email' | 'phone' | 'no-email' | 'no-phone'>('')
  const [draftRow, setDraftRow] = useState({ fullName: '', email: '', phone: '', title: '', companyName: '' })
  const [addingRow, setAddingRow] = useState(false)
  const [creating, setCreating] = useState<'person' | 'company' | 'opportunity' | 'task' | null>(null)
  const [view, setView] = useState<'basic' | 'full'>(() =>
    typeof window === 'undefined' ? 'basic' : (localStorage.getItem('aetheris.crm.view') as 'basic' | 'full') || 'basic')

  const setWorkspace = (next: 'basic' | 'full') => {
    setView(next)
    setSelected(null)
    try { localStorage.setItem('aetheris.crm.view', next) } catch { /* ignore */ }
  }

  const go = (next: Tab) => { setTab(next); setSelected(null); setOpenForEdit(false); try { localStorage.setItem('aetheris.crm.tab', next) } catch { /* ignore */ } }
  const openPerson = (id: string, edit = false) => { setSelected({ type: 'person', id }); setOpenForEdit(edit) }


  const people = ops.people.filter(p => !p.archived && !p.deletedAt)
  const trashed = ops.people.filter(p => p.deletedAt && !isTrashExpired(p.deletedAt))
  // Anything past 30 days in Trash is removed for good.
  useEffect(() => {
    for (const p of ops.people) if (p.deletedAt && isTrashExpired(p.deletedAt)) void ops.deletePersonForever(p.id)
  }, [ops.people]) // eslint-disable-line react-hooks/exhaustive-deps
  const companyOptions = [...new Set(people.map(p => p.companyName).filter(Boolean))].sort()
  const uploadedCount = people.filter(p => p.source.startsWith('Import · ')).length
  const passesFilters = (p: CrmPerson) =>
    (!filterLife || p.lifecycle === filterLife) && (!filterCompany || p.companyName === filterCompany) &&
    (filterHas === '' || (filterHas === 'email' ? !!p.email : filterHas === 'phone' ? !!p.phone : filterHas === 'no-email' ? !p.email : !p.phone))
  const addRow = async () => {
    if (!draftRow.fullName.trim() || addingRow) return
    setAddingRow(true)
    const created = await ops.createPerson({ ...draftRow, fullName: draftRow.fullName.trim(), source: 'Added in People' })
    setAddingRow(false)
    if (created) setDraftRow({ fullName: '', email: '', phone: '', title: '', companyName: '' })
  }
  const trashPerson = (p: CrmPerson) => {
    if (window.confirm(`Move ${p.fullName} to Trash? You can restore them for 30 days.`)) void ops.trashPerson(p.id)
  }
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
  if (prospecting) return <ProspectEngine onBack={() => setProspecting(false)} onNewPerson={() => {setProspecting(false);setCreating('person')}} />
  if (importing) return <SheetImport onBack={() => setImporting(false)} initialTarget="people" />

  /* ------------------------------------------------ full workspace */

  if (section !== 'pipeline' && view === 'full') {
    return <LedgerProvider><FullCrm onBack={() => setWorkspace('basic')} /></LedgerProvider>
  }

  /* --------------------------------------------------------------- detail */

  if (selected) {
    return <CrmDetail selection={selected} startEditing={openForEdit} onClose={() => { setSelected(null); setOpenForEdit(false) }} onOpen={next => { setOpenForEdit(false); setSelected(next) }} />
  }

  const empty = !people.length && !companies.length && !opportunities.length

  const switcher = <div className="crm-switch" role="group" aria-label="CRM view">
    <button type="button" className="active" aria-pressed>Basic CRM</button>
    <button type="button" aria-pressed={false} onClick={() => setWorkspace('full')}>
      <LayoutGrid size={13} /> Full CRM &amp; operations
    </button>
  </div>

  return <>
    <Head label={section === 'pipeline' ? "ASK INTROS PIPELINE" : "ASK INTROS CRM"} title={section === 'pipeline' ? "Your opportunity pipeline." : "One record per person. Everywhere."}
      copy={section === 'pipeline' ? "Track opportunity stages, values, expected closes and next actions using your CRM records." : "Enter a person, company, opportunity or number once and the whole account uses it — CRM lists, Grid sheets, your pipeline and the relationship intelligence beside them."}
      proof="Private to your account. Nothing here is visible to the network."
      action={<Btn onClick={() => setCreating(section === 'pipeline' ? 'opportunity' : 'person')}><Plus size={14} /> {section === 'pipeline' ? 'New opportunity' : 'New person'}</Btn>} />

    {section !== 'pipeline' && switcher}
    {section !== 'pipeline' && access.isAdmin && <div className="ops-toolbar"><Btn kind="secondary" onClick={() => setProspecting(true)}><Target size={14} /> Prospect Intelligence</Btn></div>}

    {section !== 'pipeline' && <nav className="ops-tabs" role="tablist" aria-label="CRM sections">
      {tabs.filter(t => !section || t.id !== 'opportunities').map(t => <button key={t.id} role="tab" aria-selected={t.id === tab}
        className={t.id === tab ? 'active' : ''} onClick={() => go(t.id)}>{t.label}</button>)}
    </nav>}


    {creating && <CreateForm kind={creating} onClose={() => setCreating(null)} />}

    {empty && tab !== 'overview' && <p className="ops-note">Nothing here yet. Add a record to get started.</p>}

    {tab === 'overview' && <section className="ops-overview">
      <CrmOverviewBento
        opportunities={opportunities}
        stages={stages}
        peopleCount={people.length}
        linkedMemberCount={people.filter(p => Boolean(p.memberId)).length}
        openTaskCount={openTasks.length}
      />
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
        <Btn kind="secondary" onClick={() => setImporting(true)}><FileUp size={14} /> Import people</Btn>
        <button type="button" className={`btn ${onlyUploaded ? "primary" : "quiet"}`} aria-pressed={onlyUploaded}
          onClick={() => setOnlyUploaded(value => !value)}>
          <FileUp size={14} /> Uploaded only ({uploadedCount})
        </button>
        <Btn kind={showTrash ? 'primary' : 'quiet'} onClick={() => setShowTrash(v => !v)}>Trash ({trashed.length})</Btn>
      </div>
      {!showTrash && onlyUploaded && <p className="ops-note" role="status">Showing only contacts added through the CRM spreadsheet importer. Open any row to view it or choose Edit to jump straight to its fields.</p>}
      {!showTrash && <div className="ops-toolbar" aria-label="Filter people">
        <select value={filterLife} onChange={e => setFilterLife(e.target.value)} aria-label="Filter by lifecycle">
          <option value="">All lifecycles</option>{lifecycles.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} aria-label="Filter by company">
          <option value="">All companies</option>{companyOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterHas} onChange={e => setFilterHas(e.target.value as typeof filterHas)} aria-label="Filter by contact details">
          <option value="">Any details</option><option value="email">Has email</option><option value="phone">Has phone</option>
          <option value="no-email">Missing email</option><option value="no-phone">Missing phone</option>
        </select>
        {(filterLife || filterCompany || filterHas) && <Btn kind="quiet" onClick={() => { setFilterLife(''); setFilterCompany(''); setFilterHas('') }}>Clear filters</Btn>}
      </div>}
      {showTrash ? <div className="ops-table-scroll" tabIndex={0} aria-label="Trash">
        <p className="ops-note">Deleted people stay here for 30 days, then they're removed for good.</p>
        <table className="ops-table">
          <thead><tr><th>Person</th><th>Company</th><th>Days left</th><th></th></tr></thead>
          <tbody>
            {trashed.length === 0 && <tr><td colSpan={4}>Trash is empty.</td></tr>}
            {trashed.map(p => <tr key={p.id}>
              <td><b>{p.fullName}</b></td><td>{p.companyName || '—'}</td><td>{daysLeftInTrash(p.deletedAt ?? '')}</td>
              <td><button className="ops-link" onClick={() => void ops.restorePerson(p.id)}>Restore</button>{' '}
                <button className="ops-link" onClick={() => { if (window.confirm(`Delete ${p.fullName} forever? This can't be undone.`)) void ops.deletePersonForever(p.id) }}>Delete forever</button></td>
            </tr>)}
          </tbody>
        </table>
      </div> : <div className="ops-table-scroll" tabIndex={0} aria-label="CRM people table">
      <table className="ops-table">
        <thead><tr><th>Person</th><th>Lifecycle</th><th>Company</th><th>Title</th><th>Email</th><th>Phone</th><th>Network</th><th>Last activity</th><th></th></tr></thead>
        <tbody>
          <tr className="ops-add-row">
            <td><input value={draftRow.fullName} onChange={e => setDraftRow(d => ({ ...d, fullName: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void addRow() }} placeholder="+ Add a person — full name" aria-label="New person full name" /></td>
            <td>Lead</td>
            <td><input value={draftRow.companyName} onChange={e => setDraftRow(d => ({ ...d, companyName: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void addRow() }} placeholder="Company" aria-label="New person company" /></td>
            <td><input value={draftRow.title} onChange={e => setDraftRow(d => ({ ...d, title: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void addRow() }} placeholder="Title" aria-label="New person title" /></td>
            <td><input value={draftRow.email} onChange={e => setDraftRow(d => ({ ...d, email: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void addRow() }} placeholder="Email" aria-label="New person email" /></td>
            <td><input value={draftRow.phone} onChange={e => setDraftRow(d => ({ ...d, phone: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void addRow() }} placeholder="Phone" aria-label="New person phone" /></td>
            <td colSpan={2}></td>
            <td><Btn kind="primary" disabled={!draftRow.fullName.trim() || addingRow} onClick={() => void addRow()}><Plus size={14} /> {addingRow ? 'Adding…' : 'Add row'}</Btn></td>
          </tr>
          {people.filter(passesFilters).filter(p => !onlyUploaded || p.source.startsWith('Import · ')).filter(p => match(`${p.fullName} ${p.title} ${p.companyName} ${p.email} ${p.phone}`)).map(p => {
            const member = memberFor(p)
            return <tr key={p.id} onClick={() => openPerson(p.id)}>
              <td><b>{p.fullName}</b></td>
              <td><span className="ops-chip">{p.lifecycle}</span></td>
              <td>{p.companyName || '—'}</td><td>{p.title || '—'}</td><td>{p.email || '—'}</td><td>{p.phone || '—'}</td>
              <td>{member ? <em className="ops-signal">{member.scoreTotal} · {member.relationshipStatus}</em> : '—'}</td>
              <td>{day(p.lastActivityAt)}</td>
              <td onClick={e => e.stopPropagation()}>
                <button type="button" className="ops-link" aria-label={`View ${p.fullName}`} onClick={() => openPerson(p.id)}>View</button>{' '}
                <button type="button" className="ops-link" aria-label={`Edit ${p.fullName}`} onClick={() => openPerson(p.id, true)}>Edit</button>{' '}
                <button type="button" className="ops-link" aria-label={`Move ${p.fullName} to Trash`} onClick={() => trashPerson(p)}>Trash</button>
              </td>
            </tr>
          })}
        </tbody>
      </table>
      </div>}
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

function CrmDetail({ selection, onClose, onOpen, startEditing = false }: {
  selection: NonNullable<Selection>; onClose: () => void; onOpen: (s: Selection) => void; startEditing?: boolean
}) {
  const ops = useOps()
  const net = useNetwork()
  const nav = useNav()
  const [note, setNote] = useState('')
  const editSection = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!startEditing || selection.type !== 'person') return
    const frame = window.requestAnimationFrame(() => {
      editSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      editSection.current?.querySelector('input')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selection.id, selection.type, startEditing])
  const [activity, setActivity] = useState('')

  const person = selection.type === 'person' ? ops.people.find(p => p.id === selection.id) : undefined
  const company = selection.type === 'company' ? ops.companies.find(c => c.id === selection.id) : undefined
  const opportunity = selection.type === 'opportunity' ? ops.opportunities.find(o => o.id === selection.id) : undefined
  const record = person ?? company ?? opportunity
  const recordName = person?.fullName ?? company?.name ?? opportunity?.name ?? ''
  useEffect(() => {
    if (record) setActiveSubject({ type: selection.type, id: record.id }, recordName)
    return () => setActiveSubject(null)
  }, [record?.id, recordName])
  if (!record) return <p className="ops-note">That record is no longer available.</p>

  const title = person?.fullName ?? company?.name ?? opportunity?.name ?? 'Record'
  const notes = ops.notes.filter(n => n.entityId === record.id)
  const activities = ops.activities.filter(a =>
    a.personId === record.id || a.companyId === record.id || a.opportunityId === record.id)
  const member = person?.memberId ? net.members.find(m => m.id === person.memberId) : undefined
  // The opportunity's linked person, when they are a network member, is offered as the counterpart.
  const oppPerson = opportunity?.personId ? ops.people.find(p => p.id === opportunity.personId) : undefined
  const dealCounterpart = oppPerson?.memberId ? { memberId: oppPerson.memberId, name: oppPerson.fullName } : null
  const stages = ops.stages.filter(s => s.pipelineId === (opportunity?.pipelineId ?? ops.pipelines[0]?.id ?? '')).sort((a, b) => a.position - b.position)
  const sheetsWith = ops.sheets.filter(s => s.mode === 'linked' && s.entityType === `crm_${selection.type === 'opportunity' ? 'opportunities' : selection.type === 'company' ? 'companies' : 'people'}`)

  return <article className="ops-detail">
    <button className="member-back" onClick={onClose}><ChevronLeft size={16} /> Back to CRM</button>

    {opportunity && <CrmOpportunityReadiness key={`${opportunity.id}:${opportunity.updatedAt}`} opportunityId={opportunity.id} />}
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
        {opportunity && <OpenDealRoomButton draft={{
          sourceKind: 'opportunity', sourceId: opportunity.id, title: opportunity.name,
          need: [opportunity.detail, opportunity.nextAction && `Next action: ${opportunity.nextAction}`].filter(Boolean).join('\n'),
          counterpartId: dealCounterpart?.memberId ?? null, ...(dealCounterpart ? { counterpartName: dealCounterpart.name } : {}),
        }} />}
        {member && <Btn kind="secondary" onClick={() => nav.openMember(member)}><Handshake size={14} /> Open network profile</Btn>}
        <Btn kind="quiet" onClick={() => nav.setPage('grid')}><Grid3x3 size={14} /> Open in Grid</Btn>
        <DoMore subject={{ type: selection.type, id: record.id }} label={title} />
      </div>
    </header>
    {company && <CompanyIntelligence companyId={company.id} />}
    {person && <ProfessionalInfo person={person} />}
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
      <section ref={editSection} className="ops-panel">
        <Eyebrow>EDIT RECORD</Eyebrow>
        {person && <p className="ops-note">Edit any field below. Changes save when you leave that field. Use Back to CRM to return to your contact list.</p>}
        {person && <div className="ops-form">
          <label>Name<input defaultValue={person.fullName} onBlur={e => void ops.updatePerson(person.id, { fullName: e.target.value })} /></label>
          <label>Title<input defaultValue={person.title} onBlur={e => void ops.updatePerson(person.id, { title: e.target.value })} /></label>
          <label>Company<input defaultValue={person.companyName} onBlur={e => void ops.updatePerson(person.id, { companyName: e.target.value })} /></label>
          <label>Email<input defaultValue={person.email} onBlur={e => void ops.updatePerson(person.id, { email: e.target.value })} /></label>
          <label>Phone<input defaultValue={person.phone} onBlur={e => void ops.updatePerson(person.id, { phone: e.target.value })} /></label>
          <label>Location<input defaultValue={person.location} onBlur={e => void ops.updatePerson(person.id, { location: e.target.value })} /></label>
          <Btn kind="quiet" onClick={() => { void ops.archivePerson(person.id); onClose() }}>Archive person</Btn>
          <Btn kind="quiet" onClick={() => { if (window.confirm(`Move ${person.fullName} to Trash? You can restore them for 30 days.`)) { void ops.trashPerson(person.id); onClose() } }}>Delete (to Trash)</Btn>
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
  // Person details a LinkedIn scan can fill (all editable before saving).
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [scanning, setScanning] = useState(false)
  const [saveError, setSaveError] = useState('')

  const submit = async () => {
    const value = name.trim()
    if (!value) return
    setSaveError('')
    if (kind === 'person') {
      const link = linkedinUrl.trim() ? normalizeLinkedInUrl(linkedinUrl) : ''
      if (link === null) { setSaveError('That LinkedIn link is not a profile link. It looks like linkedin.com/in/name.'); return }
      const created = await ops.createPerson({
        fullName: value, companyName: second.trim(), lifecycle, title: title.trim(), location: location.trim(),
        linkedinUrl: link, notes: notes.trim(), tags: splitList(tags), ...(link && { source: 'LinkedIn profile (pasted)' }),
      } as Partial<CrmPerson>)
      if (!created) { setSaveError(ops.lastError() || 'This contact was not saved.'); return }
    }
    if (kind === 'company') await ops.createCompany({ name: value, industry: second.trim() } as Partial<CrmCompany>)
    if (kind === 'opportunity') await ops.createOpportunity({ name: value, nextAction: second.trim(), amount: Number(amount) || 0 } as Partial<CrmOpportunity>)
    if (kind === 'task') await ops.createTask({ title: value, detail: second.trim() } as Partial<CrmTask>)
    onClose()
  }

  return <section className="ops-create">
    <Eyebrow>NEW {kind.toUpperCase()}</Eyebrow>
    {kind === 'person' && !scanning && <Btn kind="secondary" className="ops-create-scan" onClick={() => setScanning(true)}><ScanLine size={14} /> Scan LinkedIn profile</Btn>}
    {kind === 'person' && scanning && <LinkedInScanPanel
      keys={CONTACT_KEYS}
      labels={{ about: 'Notes (About)', expertise: 'Tags (Expertise)' }}
      current={{ name, company: second, title, location, linkedin_url: linkedinUrl, about: notes, expertise: tags }}
      heading="Fill this contact from LinkedIn"
      intro="Paste the person’s LinkedIn profile or add its PDF. Contacts are private to your account."
      applyLabel="Fill the form"
      onClose={() => setScanning(false)}
      onApply={async patch => {
        if (patch.name !== undefined) setName(patch.name)
        if (patch.company !== undefined) setSecond(patch.company)
        if (patch.title !== undefined) setTitle(patch.title)
        if (patch.location !== undefined) setLocation(patch.location)
        if (patch.linkedin_url !== undefined) setLinkedinUrl(patch.linkedin_url)
        if (patch.about !== undefined) setNotes(patch.about)
        if (patch.expertise !== undefined) setTags(splitList(patch.expertise).join(', '))
        return { status: 'filled', message: 'Filled in the form below. Not saved yet: check it, then click Save to add this contact.' }
      }} />}
    <div className="ops-create-row">
      <input autoFocus value={name} onChange={e => setName(e.target.value)} aria-label={kind === 'person' ? 'Full name' : undefined}
        placeholder={kind === 'person' ? 'Full name' : kind === 'company' ? 'Company name' : kind === 'opportunity' ? 'Opportunity name' : 'Task title'} />
      <input value={second} onChange={e => setSecond(e.target.value)} aria-label={kind === 'person' ? 'Company' : undefined}
        placeholder={kind === 'person' ? 'Company (optional)' : kind === 'company' ? 'Industry (optional)' : kind === 'opportunity' ? 'Next action (optional)' : 'Detail (optional)'} />
      {kind === 'opportunity' && <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Value (USD)" />}
      {kind === 'person' && <select value={lifecycle} onChange={e => setLifecycle(e.target.value as Lifecycle)} aria-label="Lifecycle">
        {lifecycles.map(l => <option key={l} value={l}>{l}</option>)}
      </select>}
      <Btn onClick={() => void submit()}><CheckCircle2 size={14} /> Save</Btn>
      <Btn kind="quiet" onClick={onClose}>Cancel</Btn>
    </div>
    {kind === 'person' && <div className="ops-create-row">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" aria-label="Title" />
      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" aria-label="Location" />
      <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn link (optional)" aria-label="LinkedIn link" inputMode="url" />
      {(tags || scanning) && <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags, comma-separated" aria-label="Tags" />}
      {(notes || scanning) && <textarea className="ops-create-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (private)" aria-label="Notes" />}
    </div>}
    {saveError && <p className="li-scan-error" role="alert">{saveError}</p>}
    <small>Saved once, available in CRM, Grid and every linked view.</small>
  </section>
}
