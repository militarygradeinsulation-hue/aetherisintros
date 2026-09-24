import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Check, LockKeyhole, Plus } from 'lucide-react'
import { usePublicBadge } from './badge'
import { useOps } from './crm/store'
import { capitalMap, customerRisk, dealMemory, delegationCandidates, expertMatches, keyDependencies, negotiationEvidence, scenarioProjection } from './ceo-leverage'
import type { NegotiationRoom, ScenarioRoom } from './ceo-engine'
import { openCeo, useCeo } from './ceo-store'
import { GapBox, ProvBadge, Why } from './ceo-insights-ui'
import { useNav } from './nav'
import { IntentExchangePanel } from './opportunity-ui'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

const split = (v: string) => v.split(/\n|;/).map(x => x.trim()).filter(Boolean)
const localDate = (v: string) => new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function CustomerRiskPanel() {
  const ceo = useCeo()
  const rows = useMemo(() => customerRisk(ceo.inputs), [ceo.inputs])
  if (!rows.length) return <p className="ceo-empty">No evidence-based customer risk found. Add Customer lifecycle records, contacts, activities, commitments, opportunities and meetings to expand coverage.</p>
  return <ul className="ceo-findings">{rows.map(r => <li key={r.id} className={r.level === 'AT RISK' ? 'sev-3' : 'sev-2'}>
    <div className="ceo-finding-head"><small>{r.level}</small><ProvBadge source="INFERRED" /></div><b>{r.company}</b>
    <Why evidence={r.reasons} gap={{ known: [`${r.reasons.length} recorded risk signal(s)`], unknown: r.missing, improve: r.next, action: { label: 'Open coverage', route: { view: 'coverage', arg: r.companyId ?? r.company } } }} />
    <button className="tile-link" onClick={() => openCeo({ view: 'coverage', arg: r.companyId ?? r.company })}>{r.next} <ArrowRight size={12} /></button>
  </li>)}</ul>
}

export function RiskTile() {
  const ceo = useCeo()
  const rows = useMemo(() => customerRisk(ceo.inputs), [ceo.inputs])
  const high = rows.filter(r => r.level === 'AT RISK').length
  return <div className="og-tile ceo-tile"><Eyebrow signal>RISK RADAR</Eyebrow><h3>{rows.length ? `${high} at risk · ${rows.length - high} watch.` : 'No customer risk found in recorded evidence.'}</h3><ul className="ceo-mini">{rows.slice(0, 3).map(r => <li key={r.id}><b>{r.company}</b> — {r.reasons[0]?.text}</li>)}</ul><button className="tile-link" onClick={() => openCeo({ view: 'customerRisk' })}>Open Customer Risk Radar <ArrowRight size={12} /></button></div>
}

export function CapitalMapPanel() {
  const ceo = useCeo(); const nav = useNav()
  const rows = useMemo(() => capitalMap(ceo.inputs), [ceo.inputs])
  if (!rows.length) return <p className="ceo-empty">No authorized person has explicit capital evidence in their profile or CRM lifecycle. Ask Intros will not invent investors or infer a capital type.</p>
  return <div className="og-reverse-list">{rows.map(r => <article key={r.member.id} className="ceo-match"><div className="ceo-finding-head"><small>{r.capitalType}</small><ProvBadge source="DIRECT" /></div><b>{r.member.name}</b><small>{r.member.title} · {r.member.company}</small><p><b>Why relevant:</b> {r.evidence[0]?.text}</p><p><b>Warm path:</b> {r.path}<br /><b>Relationship:</b> {r.relationship}<br /><b>Next:</b> {r.next}</p><Why evidence={r.evidence} gap={r.gap} /><button onClick={() => { ceo.close(); nav.openMember(r.member) }}>Executive Page</button></article>)}</div>
}

function ExpertPanel({ kind, initial = '' }: { kind: 'advisor' | 'board'; initial?: string }) {
  const ceo = useCeo(); const nav = useNav(); const [problem, setProblem] = useState(initial); const [query, setQuery] = useState(initial)
  const rows = useMemo(() => expertMatches(query, kind, ceo.inputs), [query, kind, ceo.inputs])
  return <section><form className="ceo-who-form" onSubmit={e => { e.preventDefault(); setQuery(problem) }}><input value={problem} onChange={e => setProblem(e.target.value)} placeholder={kind === 'board' ? 'Board issue, market or capability…' : 'Problem you need advice on…'} /><Btn onClick={() => setQuery(problem)}>Match</Btn></form>
    {!rows.length && <p className="ceo-empty">No authorized member states matching {kind === 'board' ? 'board/advisory experience' : 'advisor expertise'}. No expert has been invented.</p>}
    <div className="og-reverse-list">{rows.map(r => <article key={r.member.id} className="ceo-match"><b>{r.member.name}</b><small>{r.member.title} · {r.member.company}</small><p><b>Path:</b> {r.path}</p><Why evidence={r.evidence} gap={{ known: r.evidence.map(e => e.text), unknown: r.gap, improve: 'Confirm relevance, availability and scope directly.' }} /><button onClick={() => { ceo.close(); nav.openMember(r.member) }}>Executive Page</button></article>)}</div></section>
}
export const BoardNetworkPanel = ({ initial }: { initial?: string }) => <ExpertPanel kind="board" initial={initial} />
export const AdvisorPanel = ({ initial }: { initial?: string }) => <ExpertPanel kind="advisor" initial={initial} />

export function DelegationPanel() {
  const ceo = useCeo(); const rows = useMemo(() => delegationCandidates(ceo.inputs), [ceo.inputs]); const [queued, setQueued] = useState<string[]>([])
  if (!rows.length) return <p className="ceo-empty">Nothing meets the review rule: repeated internal meetings without recorded outcomes, or open operational follow-up assigned to the CEO.</p>
  return <ul className="ceo-findings">{rows.map(r => <li key={r.id}><div className="ceo-finding-head"><small>REVIEW FOR DELEGATION</small><ProvBadge source={r.source} /></div><b>{r.title}</b><span>{r.why}</span><button disabled={queued.includes(r.id)} onClick={() => void ceo.queueApproval({ actionType: 'other', summary: `Review for delegation: ${r.title}`, payload: { candidateId: r.id }, source: 'delegation-intelligence' }).then(() => setQueued(q => [...q, r.id]))}>{queued.includes(r.id) ? 'Queued for review' : 'Queue for approval'}</button></li>)}</ul>
}

export function DependenciesPanel() {
  const ceo = useCeo(); const rows = useMemo(() => keyDependencies(ceo.inputs), [ceo.inputs])
  if (!rows.length) return <p className="ceo-empty">No open account is concentrated in one recorded relationship.</p>
  return <ul className="ceo-findings">{rows.map(r => <li key={r.company} className={r.level === 'HIGH' ? 'sev-3' : 'sev-2'}><div className="ceo-finding-head"><small>{r.level} DEPENDENCY</small><ProvBadge source="INFERRED" /></div><b>{r.company}</b><span>{r.people.length ? `Active relationship: ${r.people.join(', ')}` : 'No active known relationship'}</span><Why evidence={r.evidence} gap={{ known: r.evidence.map(e => e.text), unknown: r.missing, improve: 'Add a second active relationship and identify who holds decision authority.' }} /></li>)}</ul>
}

const blankNegotiation = { title: '', status: 'preparing' as NegotiationRoom['status'], linkedPersonId: '', linkedCompanyId: '', linkedOpportunityId: '', objective: '', desiredOutcome: '', mustHaves: '', niceToHaves: '', walkAway: '', counterpartPriorities: '', leverageEvidence: '', unknowns: '', batna: '', concessions: '', meetingPrep: '', outcome: '' }
export function NegotiationPanel({ initial = '' }: { initial?: string }) {
  const ceo = useCeo(); const ops = useOps(); const found = ceo.negotiations.find(r => r.title.toLowerCase().includes(initial.toLowerCase()))
  const [draft, setDraft] = useState({ ...blankNegotiation, ...(found ? { ...found, linkedPersonId: found.linkedPersonId ?? '', linkedCompanyId: found.linkedCompanyId ?? '', linkedOpportunityId: found.linkedOpportunityId ?? '', concessions: found.concessions.join('\n') } : { title: initial }) })
  const set = (k: keyof typeof draft, v: string) => setDraft(d => ({ ...d, [k]: v })); const ev = negotiationEvidence({ ...draft, concessions: split(draft.concessions) }, ceo.inputs)
  return <section className="ceo-decision"><input className="ceo-decision-q" value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Negotiation / deal / counterpart" />
    <div className="ceo-decision-grid"><div className="og-form"><label>Opportunity<select value={draft.linkedOpportunityId} onChange={e => set('linkedOpportunityId', e.target.value)}><option value="">None</option>{ops.opportunities.filter(o => !o.archived).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>Counterpart<select value={draft.linkedPersonId} onChange={e => set('linkedPersonId', e.target.value)}><option value="">None</option>{ops.people.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
      {[['objective','Objective'],['desiredOutcome','Desired outcome'],['mustHaves','Must-have'],['niceToHaves','Nice-to-have'],['walkAway','Walk-away'],['counterpartPriorities','Known counterpart priorities (recorded only)'],['leverageEvidence','Leverage / evidence we have'],['unknowns','Unknowns'],['batna','Alternatives / BATNA (entered or recorded only)'],['concessions','Concessions log (one per line)'],['meetingPrep','Meeting prep'],['outcome','Post-negotiation outcome']] .map(([k,l]) => <label key={k} className="wide">{l}<textarea rows={2} value={draft[k as keyof typeof draft]} onChange={e => set(k as keyof typeof draft, e.target.value)} /></label>)}</div>
      <aside className="ceo-links"><Eyebrow>RECORDED INPUTS</Eyebrow>{ev.recorded.length ? <ul>{ev.recorded.map((x,i) => <li key={i}><ProvBadge source={x.source} />{x.text}</li>)}</ul> : <p className="ceo-empty">Link an opportunity or person to bring in recorded evidence.</p>}<GapBox gap={{ known: [`${ev.recorded.length} recorded evidence items`], unknown: ev.unknowns, improve: 'Record unknowns as questions; never promote them to facts.' }} /></aside></div>
    <Btn disabled={!draft.title.trim()} onClick={() => void ceo.saveNegotiation({ ...(found ? { id: found.id } : {}), ...draft, linkedPersonId: draft.linkedPersonId || null, linkedCompanyId: draft.linkedCompanyId || null, linkedOpportunityId: draft.linkedOpportunityId || null, concessions: split(draft.concessions) })}><LockKeyhole size={14} /> Save privately</Btn></section>
}

export function ScenarioPanel({ initial = '' }: { initial?: string }) {
  const ceo = useCeo(); const ops = useOps(); const [type, setType] = useState<ScenarioRoom['scenarioType']>(/slip/i.test(initial) ? 'deal_slip' : 'custom'); const [oppId, setOppId] = useState(''); const [title, setTitle] = useState(initial || 'New scenario'); const [days, setDays] = useState(/90/.test(initial) ? '90' : '30'); const [probability, setProbability] = useState(''); const [revenue, setRevenue] = useState(''); const [headcount, setHeadcount] = useState(''); const [annualCost, setAnnualCost] = useState(''); const [notes, setNotes] = useState('')
  const opp = ops.opportunities.find(o => o.id === oppId); const assumptions = { days: Number(days) || 0, probability: Number(probability) || 0, revenue: Number(revenue) || 0, headcount: Number(headcount) || 0, annualCost: Number(annualCost) || 0 }; const projection = scenarioProjection(type, opp, assumptions)
  return <section><p className="ceo-note">Recorded inputs and your assumptions stay visibly separate. No financial value is invented.</p><div className="og-form"><label className="wide">Scenario title<input value={title} onChange={e => setTitle(e.target.value)} /></label><label>Scenario<select value={type} onChange={e => setType(e.target.value as ScenarioRoom['scenarioType'])}>{['deal_slip','customer_churn','opportunity_win','opportunity_loss','headcount','probability','revenue','custom'].map(x => <option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></label><label>Opportunity<select value={oppId} onChange={e => setOppId(e.target.value)}><option value="">No linked opportunity</option>{ops.opportunities.filter(o => !o.archived).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>Slip days (assumption)<input type="number" value={days} onChange={e => setDays(e.target.value)} /></label><label>Probability % (assumption)<input type="number" value={probability} onChange={e => setProbability(e.target.value)} /></label><label>Revenue impact (assumption)<input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} /></label><label>Headcount (assumption)<input type="number" value={headcount} onChange={e => setHeadcount(e.target.value)} /></label><label>Annual cost / person (assumption)<input type="number" value={annualCost} onChange={e => setAnnualCost(e.target.value)} /></label><label className="wide">Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} /></label></div>
    <div className="scenario-compare"><div><Eyebrow>RECORDED BASELINE</Eyebrow><pre>{JSON.stringify(projection.baseline, null, 2)}</pre></div><div><Eyebrow signal>SCENARIO · USER ASSUMPTIONS</Eyebrow><pre>{JSON.stringify(projection.result, null, 2)}</pre></div></div><Btn onClick={() => void ceo.saveScenario({ title, linkedOpportunityId: oppId || null, scenarioType: type, recordedInputs: opp ? { amount: opp.amount, probability: opp.probability, expectedClose: opp.expectedClose ?? '' } : {}, assumptions, baseline: projection.baseline, scenarioResult: projection.result, notes })}><LockKeyhole size={14} /> Save scenario</Btn></section>
}

export function DealMemoryPanel({ initial = '', memberId }: { initial?: string; memberId?: string }) {
  const ceo = useCeo(); const [q,setQ] = useState(initial); const memory = useMemo(() => dealMemory(q, ceo.inputs, q ? undefined : memberId), [q, memberId, ceo.inputs])
  return <section><label className="og-form">Deal, company or person<input value={q} onChange={e => setQ(e.target.value)} placeholder="Type a name…" /></label>{!memory ? <p className="ceo-empty">No matching canonical record.</p> : <><Eyebrow signal>WHY ARE WE HERE?</Eyebrow><h3>{memory.subject}</h3><p>{memory.why}</p><Eyebrow>UNRESOLVED LOOPS</Eyebrow>{memory.unresolved.length ? <ul>{memory.unresolved.map(x => <li key={x}>{x}</li>)}</ul> : <p className="ceo-empty">No unresolved task or next action recorded.</p>}<Eyebrow>CHRONOLOGY</Eyebrow><ol className="replay">{memory.steps.map((s,i) => <li key={i}><small>{new Date(s.at).toLocaleDateString()} · {s.kind}</small><ProvBadge source={s.source} /><span>{s.text}</span></li>)}</ol></>}</section>
}

export function TrustProfilePanel({ initial = '' }: { initial?: string }) {
  const ceo = useCeo(); const net = useNetwork(); const [id,setId] = useState(() => net.members.find(m => m.name.toLowerCase().includes(initial.toLowerCase()))?.id ?? net.members[0]?.id ?? ''); const m = net.members.find(x => x.id === id); const badge = usePublicBadge(id); const person = m ? ceo.inputs.g.crm.personForMember(m.id) : undefined; const thread = m ? ceo.inputs.g.threads.find(t => t.memberId === m.id) : undefined; const feedback = ceo.inputs.g.feedback.filter(f => f.memberId === id && f.shareable); const won = person ? ceo.inputs.g.crm.opportunities.filter(o => o.personId === person.id && o.status === 'won').length : 0
  return <section><label className="og-form">Executive<select value={id} onChange={e => setId(e.target.value)}>{net.members.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{m && <><h3>{m.name}</h3><p className="ceo-note">Factual profile only. Ask Intros does not calculate a reputation score.</p><ul className="ceo-findings"><li><b>Verified identity / business / role</b><span>{badge?.role ? `${badge.role}${badge.business ? ` · ${badge.business}` : ''}` : 'No completed public verification recorded.'}</span></li><li><b>Explicit expertise</b><span>{m.expertise.join(' · ') || 'Not stated'}</span></li><li><b>Completed introductions</b><span>{['introduced','conversing','closed'].includes(m.introState) ? 'A completed introduction state is recorded.' : 'No completed introduction recorded.'}</span></li><li><b>Explicit feedback and outcomes</b><span>{feedback.length} shareable feedback record(s) · {won} won linked opportunity outcome(s)</span></li><li><b>Objective responsiveness</b><span>{thread ? `${thread.messages.filter(x => x.from === 'them').length} recorded replies in ${thread.messages.length} messages` : 'No conversation recorded.'}</span></li></ul></>}</section>
}

export function OfficeHoursPanel() {
  const ceo = useCeo(); const start = new Date(Date.now()+DAY); start.setHours(14,0,0,0); const [label,setLabel]=useState('CEO office hours'); const [from,setFrom]=useState(start.toISOString().slice(0,16)); const [minutes,setMinutes]=useState('30'); const [purpose,setPurpose]=useState(''); const [relevance,setRelevance]=useState('')
  const save=()=>{ const a=new Date(from); const b=new Date(a.getTime()+Number(minutes)*60000); void ceo.saveOfficeHour({label,startsAt:a.toISOString(),endsAt:b.toISOString(),durationMinutes:Number(minutes),capacity:1,purpose,relevance}) }
  return <section><p className="ceo-note">Only verified members can discover an enabled window. Every request requires your explicit approval; nothing auto-books.</p><div className="og-form"><label>Label<input value={label} onChange={e=>setLabel(e.target.value)}/></label><label>Starts<input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Minutes<input type="number" min={10} max={180} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label className="wide">Purpose<textarea value={purpose} onChange={e=>setPurpose(e.target.value)}/></label><label className="wide">Relevant requests<textarea value={relevance} onChange={e=>setRelevance(e.target.value)}/></label></div><Btn disabled={!label.trim()||!from} onClick={save}><Plus size={14}/> Offer a window</Btn><Eyebrow>YOUR WINDOWS</Eyebrow>{!ceo.officeHours.length&&<p className="ceo-empty">No office-hours windows offered.</p>}<ul className="ceo-findings">{ceo.officeHours.map(w=><li key={w.id}><b>{w.label}</b><span>{localDate(w.startsAt)} · {w.durationMinutes} minutes · approval required</span></li>)}</ul><Eyebrow>REQUESTS</Eyebrow>{!ceo.officeRequests.length&&<p className="ceo-empty">No requests waiting.</p>}{ceo.officeRequests.map(r=><div key={r.id} className="og-mission"><span>{r.reason} · {r.status}</span>{r.status==='pending'&&<div className="og-row-actions"><button onClick={()=>void ceo.setOfficeRequest(r.id,'approved')}><Check size={12}/> Approve</button><button onClick={()=>void ceo.setOfficeRequest(r.id,'declined')}>Decline</button></div>}</div>)}</section>
}

export function LeverageTile() {
  const ceo=useCeo(); const capital=useMemo(()=>capitalMap(ceo.inputs).length,[ceo.inputs]); const advisors=useMemo(()=>expertMatches('', 'advisor', ceo.inputs).length,[ceo.inputs]); const delegation=useMemo(()=>delegationCandidates(ceo.inputs).length,[ceo.inputs])
  return <div className="og-tile ceo-tile"><Eyebrow>LEVERAGE</Eyebrow><h3>{capital+advisors+delegation ? 'Recorded paths worth using.' : 'No evidence-backed leverage found yet.'}</h3><ul className="ceo-mini"><li><b>{capital}</b> capital relationships with explicit evidence</li><li><b>{advisors}</b> stated advisors/experts</li><li><b>{delegation}</b> items to review for delegation</li></ul><div className="og-row-actions"><button onClick={()=>openCeo({view:'capitalMap'})}>Capital</button><button onClick={()=>openCeo({view:'advisor'})}>Advisors</button><button onClick={()=>openCeo({view:'delegation'})}>Delegate</button></div></div>
}

export function PrivateAskPanel(){return <section><Eyebrow><LockKeyhole size={12}/> PRIVATE ASK MODE</Eyebrow><p className="ceo-note">This extends the existing Intent Exchange. Choose PRIVATE so the Ask remains owner-only and feeds only your deterministic matching; no parallel marketplace is created.</p><IntentExchangePanel/></section>}

const DAY=86_400_000