/**
 * CEO Operating System surfaces: Home tiles, contextual drawers and inline
 * panels. No new navigation — everything opens in place via openCeo().
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, BadgeCheck, Check, ClipboardCopy, Gavel, ListChecks, Plus, ShieldCheck, Trash2, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { useNav } from './nav'
import { useOps } from './crm/store'
import { useGraph } from './graph-store'
import { usePlatform } from './platform'
import { useNetwork } from './store'
import { usePublicBadge } from './badge'
import { Btn, Eyebrow } from './ui'
import { meetingBrief } from './opportunity-graph'
import type { Member } from './social'
import type { CrmTask } from './crm/types'
import { openCeo, useCeo } from './ceo-store'
import { BlindSpotPanel, CollisionsPanel, CompanyMatchPanel, CoveragePanel, GapBox, HelpPanel, MarkButtons, PatternsPanel, PromisePanel, ProvBadge, RedTeamPanel, ReplayPanel, SinglesPanel, StrategicPanel, TimeRoiPanel, Why } from './ceo-insights-ui'
import { forecastGap, whoGap } from './ceo-insights'
import { AdvisorPanel, BoardNetworkPanel, CapitalMapPanel, CustomerRiskPanel, DealMemoryPanel, DelegationPanel, DependenciesPanel, NegotiationPanel, OfficeHoursPanel, PrivateAskPanel, ScenarioPanel, TrustProfilePanel } from './ceo-leverage-ui'
import {
  ceoViewLabel, chiefOfStaff, companyPulse, dealHealth, dealHealthRule, detectKind, executiveBrief, forecastDelta, needingAttention,
  networkRoi, relationshipHealth, sinceDecided, whatChanged, whoCanChange,
  type BriefVariant, type CeoItem, type CeoRoute, type ChangeKind, type Decision, type DecisionStatus,
} from './ceo-engine'

const DAY = 86_400_000
const fmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '')
const isOpen = (t: CrmTask) => t.status !== 'done' && t.status !== 'cancelled'

function useGo() {
  const nav = useNav()
  const ceo = useCeo()
  const net = useNetwork()
  return (r: CeoRoute) => {
    if (r.view) { ceo.open(r); return }
    ceo.close()
    if (r.threadId) nav.goToThread(r.threadId)
    else if (r.memberId) { const m = net.members.find(x => x.id === r.memberId); if (m) nav.openMember(m) }
    else if (r.page) nav.setPage(r.page as never)
  }
}

function ItemList({ items, empty }: { items: CeoItem[]; empty: string }) {
  const go = useGo()
  if (!items.length) return <p className="ceo-empty">{empty}</p>
  return <ul className="ceo-items">{items.map(i => <li key={i.id} className={`tone-${i.tone}`}>
    <button type="button" onClick={() => go(i.route)}><small>{i.kind}</small><b>{i.title}</b>{i.detail && <span>{i.detail}</span>}<ArrowRight size={13} /></button>
    <Why evidence={[{ text: i.detail || i.title, source: /stale|quiet|no activity|days/i.test(`${i.title} ${i.detail}`) ? 'OBSERVED' : 'RECORDED' }]} />
  </li>)}</ul>
}

/* ───────────────────────── Home tiles ───────────────────────── */
export function WhatChangedTile() {
  const ceo = useCeo()
  const items = useMemo(() => whatChanged(ceo.inputs), [ceo.inputs])
  return <div className="og-tile ceo-tile">
    <Eyebrow signal>WHAT CHANGED</Eyebrow>
    <h3>{items.length ? `${items.length} real ${items.length === 1 ? 'change' : 'changes'} since you last looked.` : 'Nothing important changed. Go run your company.'}</h3>
    <ItemList items={items.slice(0, 5)} empty="Deltas come from your recorded deals, tasks, messages, meetings and relationships." />
    {items.length > 5 && <button className="tile-link" onClick={() => openCeo({ view: 'changed' })}>All {items.length} changes</button>}
  </div>
}

export function CompanyPulseTile() {
  const ceo = useCeo()
  const go = useGo()
  const pulse = useMemo(() => companyPulse(ceo.inputs), [ceo.inputs])
  return <div className="og-tile ceo-tile">
    <Eyebrow>COMPANY PULSE</Eyebrow>
    <h3>Counts, not a composite score.</h3>
    <div className="ceo-pulse">{pulse.map(p => <button type="button" key={p.label} onClick={() => go(p.route)}><strong>{p.value}</strong><b>{p.label}</b><small>{p.note}</small></button>)}</div>
  </div>
}

export function ChiefOfStaffTile() {
  const ceo = useCeo()
  const items = useMemo(() => chiefOfStaff(ceo.inputs), [ceo.inputs])
  return <div className="og-tile ceo-tile">
    <Eyebrow signal>CHIEF OF STAFF</Eyebrow>
    <h3>{items.length ? 'What you may be forgetting.' : 'Nothing is slipping.'}</h3>
    <ItemList items={items.slice(0, 5)} empty="No open promises, stale deals, unanswered messages, unprepared meetings, due decisions or pending approvals." />
    <div className="og-row-actions">
      {items.length > 5 && <button onClick={() => openCeo({ view: 'forgetting' })}>All {items.length}</button>}
      <button onClick={() => openCeo({ view: 'brief', arg: 'weekly' })}>Generate Executive Brief</button>
      <button onClick={() => openCeo({ view: 'who' })}>Who can change this?</button>
    </div>
  </div>
}

export function ApprovalsTile() {
  const ceo = useCeo()
  const pending = ceo.inputs.approvals.filter(a => a.status === 'pending')
  return <div className="og-tile ceo-tile">
    <Eyebrow>APPROVALS</Eyebrow>
    <h3>{pending.length ? `${pending.length} waiting for you.` : 'Nothing waiting for your approval.'}</h3>
    {pending.slice(0, 3).map(a => <p key={a.id}><b>{a.actionType.replace('_', ' ')}</b> · {a.summary}</p>)}
    <button className="tile-link" onClick={() => openCeo({ view: 'approvals' })}>Open queue</button>
  </div>
}

/* ───────────────────────── Who can change this? ───────────────────────── */
const kinds: ChangeKind[] = ['any', 'customer', 'capital', 'talent', 'partnership', 'acquisition', 'expertise', 'vendor']
export function WhoCanChangePanel({ initial = '' }: { initial?: string }) {
  const ceo = useCeo()
  const nav = useNav()
  const [problem, setProblem] = useState(initial)
  const [kind, setKind] = useState<ChangeKind>('any')
  const [asked, setAsked] = useState(initial)
  const results = useMemo(() => asked.trim() ? whoCanChange(asked, kind, ceo.inputs.g) : [], [asked, kind, ceo.inputs.g])
  const detected = asked ? detectKind(asked) : 'any'
  return <section className="ceo-who">
    <form onSubmit={e => { e.preventDefault(); setAsked(problem) }} className="ceo-who-form">
      <input value={problem} onChange={e => setProblem(e.target.value)} placeholder="Need a CFO · Need a customer at Ford · Need $2M capital · Need a logistics partner" aria-label="Business problem" />
      <Btn onClick={() => setAsked(problem)} disabled={!problem.trim()}>Find who</Btn>
    </form>
    <div className="state-filters">{kinds.map(k => <button type="button" key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{k === 'any' ? `Auto${detected !== 'any' ? ` (${detected})` : ''}` : k}</button>)}</div>
    {asked && !results.length && <p className="ceo-empty">No one in the records available to you lists matching offers, expertise, role or company. Post it as a Signal so the right people can see it.</p>}
    {asked && <GapBox gap={whoGap(asked, ceo.inputs.g, results.length)} />}
    <div className="og-reverse-list">{results.map(r => <article key={r.member.id} className={`ceo-match strength-${r.strength}`}>
      <header><small>{r.strength.toUpperCase()} MATCH · {r.evidence.length} evidence point{r.evidence.length === 1 ? '' : 's'}</small><b>{r.member.name}</b><span>{r.member.title}{r.member.company ? `, ${r.member.company}` : ''}</span></header>
      <dl className="og-reverse">
        <div><dt>WHY THEM</dt><dd>{r.whyThem}</dd></div>
        <div><dt>WHY YOU</dt><dd>{r.whyYou}</dd></div>
        <div><dt>WHY NOW</dt><dd>{r.whyNow}</dd></div>
        <div><dt>WARMEST PATH</dt><dd><div className="og-path">{r.path.map(p => <span key={p}>{p}</span>)}</div><small>{r.pathNote}</small></dd></div>
        <div><dt>NEXT MOVE</dt><dd>{r.next}</dd></div>
      </dl>
      <Why evidence={r.evidence.map(e => ({ text: e, source: ceo.inputs.g.verifiedIds.has(r.member.id) && /verif/i.test(e) ? 'VERIFIED' as const : /path|connect|mutual|message|meeting/i.test(e) ? 'OBSERVED' as const : 'DIRECT' as const }))} label="WHY? · EVIDENCE" />
      <MarkButtons subjectId={r.member.id} />
      <div className="og-row-actions"><button onClick={() => { ceo.close(); nav.openMember(r.member) }}>Executive Page</button><button onClick={() => { ceo.close(); nav.openIntro(r.member) }}>Request intro</button></div>
    </article>)}</div>
  </section>
}

/* ───────────────────────── Decision Room ───────────────────────── */
const blankDecision = { title: '', status: 'exploring' as DecisionStatus, context: '', options: '', chosenOption: '', rationale: '', assumptions: '', risks: '', expectedOutcome: '', reviewDate: '', actualOutcome: '', linkedPersonIds: [] as string[], linkedOpportunityIds: [] as string[], linkedCompanyIds: [] as string[] }
export function DecisionRoom({ initial }: { initial?: string }) {
  const ceo = useCeo()
  const ops = useOps()
  const toDraft = (d: Decision) => ({ ...d, options: d.options.join('\n'), reviewDate: d.reviewDate ?? '' })
  const start = initial && initial !== 'new' ? ceo.inputs.decisions.find(d => d.id === initial) : undefined
  const [draft, setDraft] = useState<typeof blankDecision & { id?: string; decidedAt?: string | null }>(start ? toDraft(start) : blankDecision)
  const [editing, setEditing] = useState(Boolean(initial))
  const set = (k: string, v: unknown) => setDraft(d => ({ ...d, [k]: v }))
  const current = draft.id ? ceo.inputs.decisions.find(d => d.id === draft.id) : undefined
  const since = current ? sinceDecided(current, ceo.inputs.g, ceo.inputs.events) : []
  const toggle = (k: 'linkedPersonIds' | 'linkedOpportunityIds' | 'linkedCompanyIds', id: string) => set(k, draft[k].includes(id) ? draft[k].filter(x => x !== id) : [...draft[k], id])
  const save = async () => {
    const saved = await ceo.saveDecision({ ...(draft.id ? { id: draft.id } : {}), title: draft.title.trim(), status: draft.status, context: draft.context, options: draft.options.split('\n').map(s => s.trim()).filter(Boolean),
      chosenOption: draft.chosenOption, rationale: draft.rationale, assumptions: draft.assumptions, risks: draft.risks, expectedOutcome: draft.expectedOutcome,
      reviewDate: draft.reviewDate || null, actualOutcome: draft.actualOutcome, linkedPersonIds: draft.linkedPersonIds, linkedOpportunityIds: draft.linkedOpportunityIds, linkedCompanyIds: draft.linkedCompanyIds })
    if (saved) setDraft(toDraft(saved))
  }
  if (!editing) return <section>
    <div className="og-row-actions"><button onClick={() => { setDraft(blankDecision); setEditing(true) }}><Plus size={12} /> New decision</button></div>
    {!ceo.inputs.decisions.length && <p className="ceo-empty">No decisions recorded. Capture the question, the options and why you chose — then Ask Intros reminds you to review it against what actually happened.</p>}
    <div className="og-mission-list">{ceo.inputs.decisions.map(d => <article key={d.id} className="og-mission">
      <div><small>{d.status.toUpperCase()}{d.reviewDate ? ` · review ${fmt(d.reviewDate)}` : ''}{d.reviewDate && new Date(d.reviewDate).getTime() <= Date.now() && d.status !== 'archived' ? ' · DUE' : ''}</small><b>{d.title}</b>{d.chosenOption && <p>Chosen: {d.chosenOption}</p>}</div>
      <div className="og-row-actions"><button onClick={() => { setDraft(toDraft(d)); setEditing(true) }}>Open</button><button onClick={() => openCeo({ view: 'redteam', arg: d.id })}>Challenge</button><button aria-label="Delete decision" onClick={() => void ceo.removeDecision(d.id)}><Trash2 size={12} /></button></div>
    </article>)}</div>
  </section>
  return <section className="ceo-decision">
    <input className="ceo-decision-q" value={draft.title} onChange={e => set('title', e.target.value)} placeholder="The question you are deciding…" aria-label="Decision question" />
    <div className="state-filters">{(['exploring', 'decided', 'reversed', 'archived'] as const).map(s => <button type="button" key={s} className={draft.status === s ? 'active' : ''} onClick={() => set('status', s)}>{s}</button>)}</div>
    <div className="ceo-decision-grid">
      <div className="og-form">
        <label className="wide">Evidence / context<textarea rows={3} value={draft.context} onChange={e => set('context', e.target.value)} /></label>
        <label className="wide">Options considered (one per line)<textarea rows={3} value={draft.options} onChange={e => set('options', e.target.value)} /></label>
        <label className="wide">Risks / unknowns<textarea rows={2} value={draft.risks} onChange={e => set('risks', e.target.value)} /></label>
        <label className="wide">Assumptions<textarea rows={2} value={draft.assumptions} onChange={e => set('assumptions', e.target.value)} /></label>
        <label>Decision<input value={draft.chosenOption} onChange={e => set('chosenOption', e.target.value)} /></label>
        <label>Review date<input type="date" value={draft.reviewDate} onChange={e => set('reviewDate', e.target.value)} /></label>
        <label className="wide">Rationale<textarea rows={2} value={draft.rationale} onChange={e => set('rationale', e.target.value)} /></label>
        <label className="wide">Expected outcome<textarea rows={2} value={draft.expectedOutcome} onChange={e => set('expectedOutcome', e.target.value)} /></label>
        <label className="wide">Actual outcome (later)<textarea rows={2} value={draft.actualOutcome} onChange={e => set('actualOutcome', e.target.value)} /></label>
      </div>
      <aside className="ceo-links">
        <Eyebrow>PEOPLE INVOLVED</Eyebrow>
        {ops.people.filter(p => !p.archived).slice(0, 40).map(p => <label key={p.id} className="og-check"><input type="checkbox" checked={draft.linkedPersonIds.includes(p.id)} onChange={() => toggle('linkedPersonIds', p.id)} />{p.fullName}</label>)}
        {!ops.people.length && <small>No CRM people yet.</small>}
        <Eyebrow>OPPORTUNITIES</Eyebrow>
        {ops.opportunities.filter(o => !o.archived).slice(0, 30).map(o => <label key={o.id} className="og-check"><input type="checkbox" checked={draft.linkedOpportunityIds.includes(o.id)} onChange={() => toggle('linkedOpportunityIds', o.id)} />{o.name}</label>)}
        <Eyebrow>COMPANIES</Eyebrow>
        {ops.companies.filter(c => !c.archived).slice(0, 30).map(c => <label key={c.id} className="og-check"><input type="checkbox" checked={draft.linkedCompanyIds.includes(c.id)} onChange={() => toggle('linkedCompanyIds', c.id)} />{c.name}</label>)}
        {current && <><Eyebrow signal>WHAT CHANGED SINCE WE DECIDED?</Eyebrow>{since.length ? <ul>{since.map(s => <li key={s}>{s}</li>)}</ul> : <small>Link people or opportunities to track what changed.</small>}</>}
      </aside>
    </div>
    {ceo.error && <p className="executive-form-note">{ceo.error}</p>}
    <div className="og-row-actions"><Btn disabled={!draft.title.trim()} onClick={() => void save()}><Gavel size={14} /> Save decision</Btn>{draft.id && <button onClick={() => openCeo({ view: 'redteam', arg: draft.id! })}>Challenge this</button>}<button onClick={() => setEditing(false)}>All decisions</button></div>
  </section>
}

/* ───────────────────────── Commitments ───────────────────────── */
export function CommitmentForm({ memberId, threadId, opportunityId, onDone }: { memberId?: string | undefined; threadId?: string | undefined; opportunityId?: string | undefined; onDone?: () => void }) {
  const ops = useOps()
  const net = useNetwork()
  const graph = useGraph()
  const member = memberId ? net.members.find(m => m.id === memberId) : undefined
  const [what, setWhat] = useState('')
  const [waitingOn, setWaitingOn] = useState<'me' | 'them'>('me')
  const [owedTo, setOwedTo] = useState(member?.name ?? '')
  const [due, setDue] = useState('')
  const [opp, setOpp] = useState(opportunityId ?? '')
  const [note, setNote] = useState('')
  const save = async () => {
    if (!ops.signedIn) { setNote('Sign in to save commitments to your private records.'); return }
    const person = member ? (ops.personForMember(member.id) ?? await ops.addMemberToCrm({ id: member.id, name: member.name, title: member.title, company: member.company, location: member.location })) : undefined
    const task = await ops.createTask({ title: what.trim(), kind: 'commitment', waitingOn, owedTo: waitingOn === 'me' ? owedTo : 'Me', assignee: waitingOn === 'me' ? 'Me' : owedTo,
      dueAt: due ? new Date(`${due}T17:00:00`).toISOString() : null, personId: person?.id ?? null, companyId: person?.companyId ?? null, opportunityId: opp || null, threadId: threadId ?? null, priority: 'high' })
    if (!task) { setNote(ops.lastError() || 'Could not save.'); return }
    void graph.logEvent('crm_task', task.id, 'commitment', `Commitment: ${task.title}`, { threadId, memberId })
    setWhat(''); setDue(''); setNote('Saved to your commitments.'); onDone?.()
  }
  return <div className="og-form">
    <label className="wide">What was promised<input value={what} onChange={e => setWhat(e.target.value)} placeholder="Send the pricing model…" /></label>
    <label>Who owns it<select value={waitingOn} onChange={e => setWaitingOn(e.target.value as 'me' | 'them')}><option value="me">I do (waiting on me)</option><option value="them">They do (waiting on them)</option></select></label>
    <label>{waitingOn === 'me' ? 'Owed to' : 'Who owes it'}<input value={owedTo} onChange={e => setOwedTo(e.target.value)} /></label>
    <label>Due date<input type="date" value={due} onChange={e => setDue(e.target.value)} /></label>
    <label>Linked opportunity<select value={opp} onChange={e => setOpp(e.target.value)}><option value="">None</option>{ops.opportunities.filter(o => !o.archived).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
    <div className="wide og-row-actions"><Btn disabled={!what.trim()} onClick={() => void save()}><ListChecks size={14} /> Create commitment</Btn>{note && <small>{note}</small>}</div>
  </div>
}

export function CommitmentsView() {
  const ops = useOps()
  const go = useGo()
  const all = ops.tasks.filter(t => t.kind === 'commitment')
  const today = new Date(); today.setHours(23, 59, 59, 999)
  const open = all.filter(isOpen)
  const groups: [string, CrmTask[]][] = [
    ['Overdue', open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now())],
    ['Due today', open.filter(t => t.dueAt && new Date(t.dueAt).getTime() >= Date.now() && new Date(t.dueAt).getTime() <= today.getTime())],
    ['Waiting on me', open.filter(t => t.waitingOn !== 'them' && (!t.dueAt || new Date(t.dueAt).getTime() > today.getTime()))],
    ['Waiting on them', open.filter(t => t.waitingOn === 'them' && (!t.dueAt || new Date(t.dueAt).getTime() > today.getTime()))],
    ['Completed', all.filter(t => t.status === 'done').slice(0, 10)],
  ]
  const [adding, setAdding] = useState(false)
  return <section>
    <div className="og-row-actions"><button onClick={() => setAdding(v => !v)}><Plus size={12} /> Create commitment</button></div>
    {adding && <CommitmentForm onDone={() => setAdding(false)} />}
    {!all.length && <p className="ceo-empty">No commitments yet. Create one from a conversation, a meeting or an Executive Page — it lives on your canonical CRM tasks, so nothing is duplicated.</p>}
    {groups.filter(([, list]) => list.length).map(([label, list]) => <div key={label} className="ceo-group"><Eyebrow signal={label === 'Overdue'}>{label.toUpperCase()} · {list.length}</Eyebrow>
      <ul className="ceo-items">{list.map(t => <li key={t.id} className={label === 'Overdue' ? 'tone-risk' : 'tone-info'}><div>
        <small>{t.waitingOn === 'them' ? `${t.owedTo || t.assignee || 'They'} owe${t.owedTo ? 's' : ''}` : `Owed to ${t.owedTo || '—'}`}{t.dueAt ? ` · ${fmt(t.dueAt)}` : ''}</small><b>{t.title}</b>
        <div className="og-row-actions">{isOpen(t) && <button onClick={() => void ops.updateTask(t.id, { status: 'done' })}><Check size={12} /> Done</button>}
          {t.threadId && <button onClick={() => go({ threadId: t.threadId! })}>Source conversation</button>}
          {t.calendarEventId && <button onClick={() => go({ page: 'calendar' })}>Source meeting</button>}</div>
      </div></li>)}</ul></div>)}
  </section>
}

/* ───────────────────────── Relationship health ───────────────────────── */
export function HealthBadge({ member }: { member: Member }) {
  const ceo = useCeo()
  const h = useMemo(() => relationshipHealth(member, ceo.inputs.g), [member, ceo.inputs.g])
  return <details className={`ceo-health state-${h.state.replace(' ', '-').toLowerCase()}`}>
    <summary><Eyebrow>RELATIONSHIP HEALTH</Eyebrow><b>{h.state}</b></summary>
    <ul>{h.reasons.map(r => <li key={r}><ProvBadge source={/no recorded|not recorded/i.test(r) ? 'UNKNOWN' : 'OBSERVED'} />{r}</li>)}</ul>
    <small>Derived from recorded activity only — never sentiment.</small>
  </details>
}
function HealthList() {
  const ceo = useCeo()
  const go = useGo()
  const list = needingAttention(ceo.inputs.g)
  if (!list.length) return <p className="ceo-empty">No connected relationship is cooling or at risk in the recorded data.</p>
  return <ul className="ceo-items">{list.map(({ member, health }) => <li key={member.id} className={health.state === 'AT RISK' ? 'tone-risk' : 'tone-info'}>
    <button type="button" onClick={() => go({ memberId: member.id })}><small>{health.state}</small><b>{member.name}</b><span>{health.reasons.slice(1, 3).join(' · ')}</span><ArrowRight size={13} /></button></li>)}</ul>
}

/* ───────────────────────── Prepare me ───────────────────────── */
export function PrepareBrief({ member }: { member: Member }) {
  const ceo = useCeo()
  const ops = useOps()
  const g = ceo.inputs.g
  const badge = usePublicBadge(member.id)
  const b = useMemo(() => meetingBrief(member, g), [member, g])
  const h = useMemo(() => relationshipHealth(member, g), [member, g])
  const crm = ops.personForMember(member.id)
  const opps = crm ? ops.opportunities.filter(o => o.personId === crm.id && !o.archived && o.status === 'open') : []
  const commitments = crm ? ops.tasks.filter(t => t.personId === crm.id && isOpen(t)) : []
  const mission = g.missions.find(m => m.status === 'active')
  const unknowns = [
    !badge?.role && 'Role/company not verified by Ask Intros',
    !crm && 'Not in your CRM — no private history',
    !opps.length && 'No linked opportunity',
    !member.whyNow && 'No time-bound reason recorded',
    'No external due diligence has been performed by Ask Intros',
  ].filter(Boolean) as string[]
  const desired = opps[0]?.nextAction || (mission ? `Progress on “${mission.title}”${mission.successDefinition ? ` — ${mission.successDefinition}` : ''}` : 'Not recorded — decide one outcome before the meeting.')
  const text = [`Brief: ${b.who}`, badge?.role ? `Verified: ${badge.role}${badge.business ? ` · ${badge.business}` : ''}` : 'Verification: not verified', `Health: ${h.state}`, `Last interaction: ${b.last}`, `Open commitments: ${commitments.map(c => c.title).join('; ') || 'none'}`, `Opportunities: ${opps.map(o => `${o.name} (${o.stageName})`).join('; ') || 'none'}`, `Path: ${b.path}`, `Why them: ${member.whyThem}`, `Why you: ${member.whyYou}`, `Why now: ${member.whyNow}`, `Opener: ${b.opener}`, `Questions:\n${b.questions.map(q => `- ${q}`).join('\n')}`, `Unknowns:\n${unknowns.map(u => `- ${u}`).join('\n')}`, `Desired outcome: ${desired}`].join('\n')
  return <section className="og-brief ceo-prepare">
    <dl>
      <div><dt>WHO</dt><dd>{b.who}</dd></div>
      <div><dt>VERIFIED</dt><dd>{badge?.role ? `${badge.role}${badge.business ? ` · ${badge.business}` : ''}` : 'Not verified'}</dd></div>
      <div><dt>RELATIONSHIP</dt><dd>{h.state} · {h.reasons.slice(1, 3).join(' · ')}</dd></div>
      <div><dt>LAST INTERACTION</dt><dd>{b.last}</dd></div>
      <div><dt>WHAT WAS PROMISED</dt><dd>{[...commitments.map(c => c.title), ...b.promises.filter(p => !commitments.some(c => c.title === p))].join(' · ') || 'Nothing recorded'}</dd></div>
      <div><dt>ACTIVE OPPORTUNITIES</dt><dd>{opps.map(o => `${o.name} · ${o.stageName}`).join(' · ') || 'None linked'}</dd></div>
      <div><dt>MUTUAL PATH</dt><dd>{b.path}</dd></div>
      <div><dt>WHY THEM / WHY YOU / WHY NOW</dt><dd>{member.whyThem || '—'} / {member.whyYou || '—'} / {member.whyNow || '—'}</dd></div>
      <div><dt>SIGNALS & CONTEXT</dt><dd>{b.relevant.join(' · ') || 'No authorized Signals recorded'}</dd></div>
      <div><dt>SUGGESTED OPENER</dt><dd>{b.opener}</dd></div>
      <div><dt>KEY QUESTIONS</dt><dd><ol>{b.questions.map(q => <li key={q}>{q}</li>)}</ol></dd></div>
      <div><dt>RISKS / UNKNOWNS</dt><dd><ul>{unknowns.map(u => <li key={u}>{u}</li>)}</ul></dd></div>
      <div><dt>DESIRED OUTCOME</dt><dd>{desired}</dd></div>
    </dl>
    <div className="og-row-actions"><button onClick={() => void navigator.clipboard?.writeText(text)}><ClipboardCopy size={12} /> Copy brief</button><button onClick={() => openCeo({ view: 'close', memberId: member.id })}>Close the meeting</button><button onClick={() => openCeo({ view: 'commit', memberId: member.id })}>Create commitment</button></div>
  </section>
}

/* ───────────────────────── Close the meeting ───────────────────────── */
export function CloseMeeting({ member, threadId }: { member: Member; threadId?: string | undefined }) {
  const ops = useOps()
  const ceo = useCeo()
  const graph = useGraph()
  const crm = ops.personForMember(member.id)
  const opps = crm ? ops.opportunities.filter(o => o.personId === crm.id && !o.archived) : []
  const [f, setF] = useState({ decisions: '', mine: '', theirs: '', nextMeeting: '', oppId: opps[0]?.id ?? '', stageId: '', nextAction: '', confirm: false, relationship: '', notes: '', followUp: '' })
  const [done, setDone] = useState<string[]>([])
  const set = (k: keyof typeof f, v: string | boolean) => setF(x => ({ ...x, [k]: v }))
  const save = async () => {
    if (!ops.signedIn) { setDone(['Sign in to save meeting outcomes to your private records.']); return }
    const log: string[] = []
    const person = crm ?? await ops.addMemberToCrm({ id: member.id, name: member.name, title: member.title, company: member.company, location: member.location })
    const pid = person?.id ?? null
    await ops.logActivity({ kind: 'meeting', subject: `Meeting closed with ${member.name}`, detail: [f.notes, f.decisions && `Decisions: ${f.decisions}`, f.relationship && `Relationship (manual): ${f.relationship}`].filter(Boolean).join('\n'), personId: pid, companyId: person?.companyId ?? null, opportunityId: f.oppId || null, threadId: threadId ?? null, occurredAt: new Date().toISOString() })
    log.push('Meeting activity logged in CRM')
    if (f.notes.trim() && pid) { await ops.addNote('crm_person', pid, f.notes.trim()); log.push('Note attached to timeline') }
    const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
    for (const c of lines(f.mine)) await ops.createTask({ title: c, kind: 'commitment', waitingOn: 'me', owedTo: member.name, assignee: 'Me', personId: pid, opportunityId: f.oppId || null, threadId: threadId ?? null, priority: 'high' })
    for (const c of lines(f.theirs)) await ops.createTask({ title: c, kind: 'commitment', waitingOn: 'them', owedTo: 'Me', assignee: member.name, personId: pid, opportunityId: f.oppId || null, threadId: threadId ?? null, priority: 'medium' })
    if (lines(f.mine).length + lines(f.theirs).length) log.push(`${lines(f.mine).length + lines(f.theirs).length} commitments created`)
    for (const d of lines(f.decisions)) await ceo.saveDecision({ title: d, status: 'decided', linkedPersonIds: pid ? [pid] : [], linkedOpportunityIds: f.oppId ? [f.oppId] : [] })
    if (lines(f.decisions).length) log.push(`${lines(f.decisions).length} decisions recorded`)
    if (f.nextMeeting && graph.userId) {
      const start = new Date(`${f.nextMeeting}T10:00:00`)
      await supabase.from('calendar_events').insert({ user_id: graph.userId, title: `Meeting with ${member.name}`, notes: 'Scheduled from meeting outcome', location: '', kind: 'meeting', member_id: member.id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString(), all_day: false })
      log.push('Next meeting added to calendar')
    }
    if (f.oppId && (f.stageId || f.nextAction.trim())) {
      const opp = ops.opportunities.find(o => o.id === f.oppId)
      if (f.confirm) {
        if (f.stageId) await ops.moveOpportunity(f.oppId, f.stageId)
        if (f.nextAction.trim()) await ops.updateOpportunity(f.oppId, { nextAction: f.nextAction.trim() })
        log.push('Opportunity updated (confirmed)')
      } else {
        await ceo.queueApproval({ actionType: 'update_opportunity', summary: `Update ${opp?.name ?? 'opportunity'}${f.stageId ? ` → ${ops.stages.find(s => s.id === f.stageId)?.name}` : ''}${f.nextAction ? ` · next: ${f.nextAction}` : ''}`, payload: { opportunityId: f.oppId, stageId: f.stageId || null, nextAction: f.nextAction.trim() || null }, source: 'meeting-outcome' })
        log.push('Opportunity change queued for your approval')
      }
    }
    if (f.followUp.trim()) { await ceo.queueApproval({ actionType: 'send_message', summary: `Follow-up to ${member.name}: ${f.followUp.slice(0, 120)}`, payload: { memberId: member.id, threadId: threadId ?? null, text: f.followUp }, source: 'meeting-outcome' }); log.push('Follow-up message queued for approval — nothing was sent') }
    void graph.logEvent('member', member.id, 'meeting_closed', `Meeting closed with ${member.name}`)
    setDone(log)
  }
  if (done.length) return <section><Eyebrow signal>SAVED</Eyebrow><ul>{done.map(d => <li key={d}>{d}</li>)}</ul></section>
  return <div className="og-form">
    <label className="wide">Decisions made (one per line)<textarea rows={2} value={f.decisions} onChange={e => set('decisions', e.target.value)} /></label>
    <label>I promised (one per line)<textarea rows={2} value={f.mine} onChange={e => set('mine', e.target.value)} /></label>
    <label>They promised (one per line)<textarea rows={2} value={f.theirs} onChange={e => set('theirs', e.target.value)} /></label>
    <label>Next meeting<input type="date" value={f.nextMeeting} onChange={e => set('nextMeeting', e.target.value)} /></label>
    <label>Relationship change (manual)<select value={f.relationship} onChange={e => set('relationship', e.target.value)}><option value="">No change</option><option>Stronger</option><option>Unchanged</option><option>Needs care</option></select></label>
    {opps.length > 0 && <>
      <label>Opportunity<select value={f.oppId} onChange={e => set('oppId', e.target.value)}><option value="">None</option>{opps.map(o => <option key={o.id} value={o.id}>{o.name} · {o.stageName}</option>)}</select></label>
      <label>New stage<select value={f.stageId} onChange={e => set('stageId', e.target.value)}><option value="">Unchanged</option>{ops.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="wide">New next action<input value={f.nextAction} onChange={e => set('nextAction', e.target.value)} /></label>
      <label className="og-check wide"><input type="checkbox" checked={f.confirm} onChange={e => set('confirm', e.target.checked)} /> Apply the opportunity change now (otherwise it waits in your approval queue)</label>
    </>}
    <label className="wide">Notes<textarea rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} /></label>
    <label className="wide">Follow-up message draft (queued for approval, never auto-sent)<textarea rows={2} value={f.followUp} onChange={e => set('followUp', e.target.value)} /></label>
    <div className="wide"><Btn onClick={() => void save()}><Check size={14} /> Close the meeting</Btn></div>
  </div>
}

/* ───────────────────────── Forecast ───────────────────────── */
export function ForecastConfidencePanel() {
  const ceo = useCeo()
  const ops = useOps()
  const rows = useMemo(() => ops.opportunities.filter(o => !o.archived && o.status === 'open').map(o => dealHealth(o, ceo.inputs)), [ops.opportunities, ceo.inputs])
  const delta = useMemo(() => forecastDelta(ceo.inputs), [ceo.inputs])
  return <section className="ceo-forecast">
    <Eyebrow signal>WHAT CHANGED IN FORECAST?</Eyebrow>
    {ceo.inputs.snapshot ? (delta.length ? <ul>{delta.map(d => <li key={d}>{d}</li>)}</ul> : <p className="ceo-empty">No stage, value, probability, status or close-date changes since your last visit.</p>) : <p className="ceo-empty">The first snapshot is saved on this visit; deltas appear from your next visit.</p>}
    <Eyebrow>DEAL HEALTH</Eyebrow>
    <p className="og-note"><ProvBadge source="INFERRED" /> {dealHealthRule}</p>
    <GapBox gap={forecastGap(ceo.inputs.g)} />
    {!rows.length && <p className="ceo-empty">No open opportunities recorded in Work.</p>}
    <ul className="ceo-items">{rows.map(r => <li key={r.opp.id} className={r.label === 'At risk' ? 'tone-risk' : r.label === 'Watch' ? 'tone-signal' : 'tone-info'}><div>
      <small>{r.label.toUpperCase()} · {r.opp.probability}% · weighted {Math.round(r.weighted).toLocaleString()} {r.opp.currency}</small><b>{r.opp.name}</b>
      <ul className="ceo-factors">{r.factors.map(f => <li key={f.label} className={`fx-${f.effect}`}>{f.effect === 'up' ? '▲' : f.effect === 'down' ? '▼' : '·'} {f.label}</li>)}</ul>
    </div></li>)}</ul>
  </section>
}

/* ───────────────────────── Network ROI ───────────────────────── */
export function NetworkRoiPanel() {
  const ceo = useCeo()
  const platform = usePlatform()
  const roi = useMemo(() => networkRoi(ceo.inputs.g, platform.outcomes), [ceo.inputs.g, platform.outcomes])
  return <section className="og-tile ceo-tile">
    <Eyebrow>NETWORK ROI</Eyebrow>
    <h3>What introductions actually produced.</h3>
    <div className="ceo-pulse">{roi.map(r => <div key={r.label}><strong>{r.value}</strong><b>{r.label}</b><small>{r.note}</small></div>)}</div>
    <p className="og-note">Value is only attributed when a won opportunity with an amount is linked to an introduced person. Nothing is estimated.</p>
  </section>
}

/* ───────────────────────── Executive brief ───────────────────────── */
export function BriefPanel({ initial = 'weekly' }: { initial?: BriefVariant }) {
  const ceo = useCeo()
  const platform = usePlatform()
  const net = useNetwork()
  const [variant, setVariant] = useState<BriefVariant>(initial)
  const text = useMemo(() => executiveBrief(variant, ceo.inputs, platform.outcomes, net.profile.company), [variant, ceo.inputs, platform.outcomes, net.profile.company])
  const [copied, setCopied] = useState(false)
  return <section className="ceo-brief">
    <div className="state-filters">{(['weekly', 'board', 'investor'] as const).map(v => <button type="button" key={v} className={variant === v ? 'active' : ''} onClick={() => setVariant(v)}>{v === 'weekly' ? 'Weekly Executive' : v === 'board' ? 'Board' : 'Investor'}</button>)}</div>
    <textarea readOnly rows={18} value={text} aria-label="Executive brief" />
    <div className="og-row-actions"><button onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true) }}><ClipboardCopy size={12} /> {copied ? 'Copied' : 'Copy brief'}</button></div>
    <p className="og-note">Assembled from recorded data only. Works without AI.</p>
  </section>
}

/* ───────────────────────── Approval queue ───────────────────────── */
export function ApprovalQueuePanel() {
  const ceo = useCeo()
  const ops = useOps()
  const nav = useNav()
  const net = useNetwork()
  const run = async (id: string) => {
    const a = ceo.inputs.approvals.find(x => x.id === id)
    if (!a) return
    const p = a.payload as Record<string, string | null>
    if (a.actionType === 'update_opportunity' && p['opportunityId']) {
      if (p['stageId']) await ops.moveOpportunity(p['opportunityId'], p['stageId'])
      if (p['nextAction']) await ops.updateOpportunity(p['opportunityId'], { nextAction: p['nextAction'] })
      await ceo.setApproval(id, 'executed'); return
    }
    await ceo.setApproval(id, 'executed')
    ceo.close()
    const m = p['memberId'] ? net.members.find(x => x.id === p['memberId']) : undefined
    if (a.actionType === 'send_message') { if (p['text']) void navigator.clipboard?.writeText(p['text']); if (p['threadId']) nav.goToThread(p['threadId']); else if (m) nav.messageMember(m.id) }
    else if (a.actionType === 'request_intro' && m) nav.openIntro(m)
    else if (a.actionType === 'schedule_meeting') nav.setPage('calendar')
  }
  const list = ceo.inputs.approvals
  return <section>
    <p className="og-note">Nothing here runs by itself. Approving authorises the action; “Run” opens the existing flow (messages are copied into the composer flow for you to send).</p>
    {!list.length && <p className="ceo-empty">Nothing waiting for your approval.</p>}
    <ul className="ceo-items">{list.slice(0, 30).map(a => <li key={a.id} className={a.status === 'pending' ? 'tone-signal' : 'tone-info'}><div>
      <small>{a.actionType.replace('_', ' ').toUpperCase()} · {a.status} · {a.source} · {fmt(a.createdAt)}</small><b>{a.summary}</b>
      <div className="og-row-actions">
        {a.status === 'pending' && <><button onClick={() => void ceo.setApproval(a.id, 'approved')}><Check size={12} /> Approve</button><button onClick={() => void ceo.setApproval(a.id, 'rejected')}><X size={12} /> Reject</button></>}
        {a.status === 'approved' && <button onClick={() => void run(a.id)}>Run <ArrowRight size={12} /></button>}
      </div></div></li>)}</ul>
  </section>
}

/* ───────────────────────── Trust Passport summary ───────────────────────── */
export function TrustPassportSummary({ memberId, own = false }: { memberId: string; own?: boolean }) {
  const badge = usePublicBadge(memberId)
  const [domain, setDomain] = useState<string | null>(null)
  useEffect(() => {
    if (!own) return
    void (async () => {
      const { data } = await (supabase as any).rpc('my_verification')
      const row = Array.isArray(data) ? data[0] : data
      if (row?.status !== 'verified' || !row?.business_domain) return
      const checks = await supabase.from('verification_checks').select('check_type,result')
      const ok = (checks.data ?? []).some(c => /domain/i.test(c.check_type) && /pass|verified|match/i.test(c.result))
      if (ok) setDomain(row.business_domain)
    })()
  }, [own])
  const rows = [
    badge?.role && { label: 'Identity Verified', note: 'Reviewed by Ask Intros' },
    badge?.business && { label: 'Business Verified', note: badge.business },
    badge?.role && { label: 'Executive Role Verified', note: badge.role },
    domain && { label: 'Company Domain Verified', note: domain },
  ].filter(Boolean) as { label: string; note: string }[]
  return <div className="ceo-passport">
    <Eyebrow>TRUST PASSPORT</Eyebrow>
    {rows.length ? <ul>{rows.map(r => <li key={r.label}><BadgeCheck size={14} /><b>{r.label}</b><small>{r.note}</small></li>)}</ul> : <p className="ceo-empty"><ShieldCheck size={14} /> No completed verification on record. Proof documents are never shown to other members.</p>}
  </div>
}

/* ───────────────────────── Host + contextual buttons ───────────────────────── */
export function CeoActions({ member, threadId }: { member?: Member | undefined; threadId?: string | undefined }) {
  return <div className="og-row-actions ceo-actions">
    {member && <button onClick={() => openCeo({ view: 'prepare', memberId: member.id })}>Prepare me</button>}
    <button onClick={() => openCeo({ view: 'commit', ...(member && { memberId: member.id }), ...(threadId && { threadId }) })}>Create commitment</button>
    {member && <button onClick={() => openCeo({ view: 'close', memberId: member.id, ...(threadId && { threadId }) })}>Close the meeting</button>}
    <button onClick={() => openCeo({ view: 'commitments' })}>Commitments</button>
  </div>
}

export function WorkCeoBar() {
  return <div className="og-row-actions ceo-actions ceo-workbar">
    <button onClick={() => openCeo({ view: 'decisions' })}><Gavel size={12} /> Decision Room</button>
    <button onClick={() => openCeo({ view: 'commitments' })}><ListChecks size={12} /> Commitments</button>
    <button onClick={() => openCeo({ view: 'forecast' })}>Forecast confidence</button>
    <button onClick={() => openCeo({ view: 'customerRisk' })}>Customer Risk Radar</button>
    <button onClick={() => openCeo({ view: 'negotiation' })}>Negotiation Room</button>
    <button onClick={() => openCeo({ view: 'scenario' })}>Scenario Room</button>
    <button onClick={() => openCeo({ view: 'who' })}>Who can change this?</button>
    <button onClick={() => openCeo({ view: 'brief', arg: 'weekly' })}>Generate Executive Brief</button>
  </div>
}

function MemberPicker({ onPick }: { onPick: (m: Member) => void }) {
  const net = useNetwork()
  const ceo = useCeo()
  const upcoming = ceo.inputs.meetings.filter(m => m.memberId && new Date(m.startsAt).getTime() > Date.now() - DAY)
  const pool = [...upcoming.map(m => net.members.find(x => x.id === m.memberId)).filter(Boolean) as Member[], ...net.members.filter(m => net.connections.includes(m.id))]
  const uniq = pool.filter((m, i) => pool.findIndex(x => x.id === m.id) === i).slice(0, 12)
  if (!uniq.length) return <p className="ceo-empty">No linked meetings or connections yet. Open someone’s Executive Page and choose “Prepare me”.</p>
  return <div className="og-row-actions">{uniq.map(m => <button key={m.id} onClick={() => onPick(m)}>{m.name}</button>)}</div>
}

export function CeoHost() {
  const ceo = useCeo()
  const net = useNetwork()
  const go = useGo()
  const r = ceo.route
  const [picked, setPicked] = useState<Member | null>(null)
  useEffect(() => { setPicked(null) }, [r])
  useEffect(() => { if (r && !r.view) go(r) }, [r])
  if (!r?.view) return null
  const byArg = r.arg ? net.members.find(m => m.name.toLowerCase().includes(r.arg!.toLowerCase()) || m.name.toLowerCase().split(' ')[0] === r.arg!.toLowerCase().split(' ')[0]) : undefined
  const member = picked ?? (r.memberId ? net.members.find(m => m.id === r.memberId) : byArg)
  let body: ReactNode
  switch (r.view) {
    case 'missing': body = <BlindSpotPanel />; break
    case 'redteam': body = <RedTeamPanel decisionId={r.arg && ceo.inputs.decisions.some(d => d.id === r.arg) ? r.arg : undefined} />; break
    case 'help': body = <HelpPanel />; break
    case 'coverage': body = <CoveragePanel arg={r.arg ?? ''} />; break
    case 'strategic': body = <StrategicPanel />; break
    case 'bench': body = <StrategicPanel kind="bench" />; break
    case 'time': body = <TimeRoiPanel />; break
    case 'promises': body = <PromisePanel />; break
    case 'collisions': body = <CollisionsPanel />; break
    case 'companies': body = <CompanyMatchPanel />; break
    case 'replay': body = <ReplayPanel arg={r.arg ?? ''} memberId={r.memberId} />; break
    case 'patterns': body = <PatternsPanel />; break
    case 'singles': body = <SinglesPanel />; break
    case 'customerRisk': body = <CustomerRiskPanel />; break
    case 'capitalMap': body = <CapitalMapPanel />; break
    case 'negotiation': body = <NegotiationPanel initial={r.arg ?? ''} />; break
    case 'scenario': body = <ScenarioPanel initial={r.arg ?? ''} />; break
    case 'delegation': body = <DelegationPanel />; break
    case 'boardNetwork': body = <BoardNetworkPanel initial={r.arg} />; break
    case 'advisor': body = <AdvisorPanel initial={r.arg} />; break
    case 'trustProfile': body = <TrustProfilePanel initial={r.arg} />; break
    case 'dealMemory': body = <DealMemoryPanel initial={r.arg ?? ''} memberId={r.memberId} />; break
    case 'dependencies': body = <DependenciesPanel />; break
    case 'officeHours': body = <OfficeHoursPanel />; break
    case 'privateAsk': body = <PrivateAskPanel />; break
    case 'changed': { const items = whatChanged(ceo.inputs); body = <ItemList items={items} empty="Nothing important changed. Go run your company." />; break }
    case 'forgetting': body = <ItemList items={chiefOfStaff(ceo.inputs)} empty="Nothing is slipping: no open promises, stale deals, unanswered messages, due decisions or pending approvals." />; break
    case 'who': body = <WhoCanChangePanel initial={r.arg ?? ''} />; break
    case 'decisions': body = <DecisionRoom {...(r.arg ? { initial: r.arg } : {})} />; break
    case 'commitments': body = <CommitmentsView />; break
    case 'commit': body = <CommitmentForm memberId={r.memberId} threadId={r.threadId} opportunityId={r.arg} />; break
    case 'health': body = <HealthList />; break
    case 'forecast': body = <ForecastConfidencePanel />; break
    case 'brief': body = <BriefPanel initial={(r.arg as BriefVariant) || 'weekly'} />; break
    case 'approvals': body = <ApprovalQueuePanel />; break
    case 'roi': body = <NetworkRoiPanel />; break
    case 'prepare': body = member ? <PrepareBrief member={member} /> : <MemberPicker onPick={setPicked} />; break
    case 'close': body = member ? <CloseMeeting member={member} threadId={r.threadId} /> : <MemberPicker onPick={setPicked} />; break
  }
  return <div className="modal-wrap" onMouseDown={ceo.close}>
    <section className="modal og-drawer ceo-drawer" onMouseDown={e => e.stopPropagation()} aria-label={ceoViewLabel[r.view]}>
      <header><div><Eyebrow signal>CEO OS</Eyebrow><h2>{ceoViewLabel[r.view]}{member && (r.view === 'prepare' || r.view === 'close' || r.view === 'commit') ? ` — ${member.name}` : ''}</h2></div>
        <button className="icon-btn" onClick={ceo.close} aria-label="Close"><X size={16} /></button></header>
      {body}
    </section>
  </div>
}

/** Upcoming linked meetings with Prepare me / Close the meeting, above the calendar. */
export function CalendarMeetingBar() {
  const ceo = useCeo()
  const net = useNetwork()
  const list = ceo.inputs.meetings.filter(m => new Date(m.endsAt).getTime() > Date.now() - DAY).slice(0, 6)
  if (!list.length) return null
  return <section className="og-tile ceo-tile ceo-calbar">
    <Eyebrow>MEETINGS AHEAD</Eyebrow>
    <ul className="ceo-items">{list.map(m => { const member = m.memberId ? net.members.find(x => x.id === m.memberId) : undefined; const past = new Date(m.startsAt).getTime() < Date.now()
      return <li key={m.id} className="tone-info"><div><small>{new Date(m.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{member ? ` · ${member.name}` : ' · no linked person'}</small><b>{m.title}</b>
        {member && <div className="og-row-actions"><button onClick={() => openCeo({ view: 'prepare', memberId: member.id })}>Prepare me</button>{past && <button onClick={() => openCeo({ view: 'close', memberId: member.id })}>Close the meeting</button>}<button onClick={() => openCeo({ view: 'commit', memberId: member.id })}>Create commitment</button></div>}</div></li> })}</ul>
  </section>
}
