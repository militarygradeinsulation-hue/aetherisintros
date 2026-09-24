/**
 * CEO intelligence surfaces. Every panel opens inside the existing CEO drawer
 * (openCeo) or sits inline on existing hubs — no new navigation.
 */
import { useMemo, useState } from 'react'
import { ArrowRight, Bookmark, Crosshair, HandHeart, Radar, ShieldAlert, Star } from 'lucide-react'

import { useNav } from './nav'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'
import { openCeo, useCeo } from './ceo-store'
import type { CeoRoute, Mark } from './ceo-engine'
import {
  blindSpots, collisions, companyCoverage, companyMatches, influenceRoles, patterns, PATTERN_MIN, promiseRisk, provenanceNote, redTeam, replay,
  singleThreadAccounts, strategicRows, timeCategories, timeRoi, whoCanIHelp, type Evidence, type Gap, type Provenance,
} from './ceo-insights'

const fmt = (v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function useGo() {
  const nav = useNav()
  const ceo = useCeo()
  const net = useNetwork()
  return (r: CeoRoute) => {
    if (r.view) { ceo.open(r); return }
    ceo.close()
    if (r.memberId) { const m = net.members.find(x => x.id === r.memberId); if (m) nav.openMember(m) }
    else if (r.page) nav.setPage(r.page as never)
  }
}

/* ───────────── C) Truth layer ───────────── */
export function ProvBadge({ source }: { source: Provenance }) {
  return <span className={`prov prov-${source.toLowerCase()}`} title={provenanceNote[source]}>{source}</span>
}
/** Compact WHY? drawer: evidence lines with provenance, plus an optional confidence gap. */
export function Why({ evidence, gap, label = 'WHY?' }: { evidence: Evidence[]; gap?: Gap | undefined; label?: string }) {
  if (!evidence.length && !gap) return null
  return <details className="why">
    <summary>{label}</summary>
    {evidence.length > 0 && <ul>{evidence.map((e, i) => <li key={i}><ProvBadge source={e.source} />{e.text}</li>)}</ul>}
    {gap && <GapBox gap={gap} />}
  </details>
}
/* ───────────── D) Confidence gaps ───────────── */
export function GapBox({ gap }: { gap: Gap }) {
  const go = useGo()
  if (!gap.unknown.length) return null
  return <div className="gapbox">
    <Eyebrow>CONFIDENCE GAP</Eyebrow>
    <div className="gapbox-cols">
      <div><small>KNOWN</small><ul>{gap.known.map(k => <li key={k}>{k}</li>)}</ul></div>
      <div><small>UNKNOWN</small><ul>{gap.unknown.map(k => <li key={k}>{k}</li>)}</ul></div>
    </div>
    <p><b>Would improve confidence:</b> {gap.improve}</p>
    {gap.action && <button className="tile-link" onClick={() => go(gap.action!.route)}>{gap.action.label} <ArrowRight size={12} /></button>}
  </div>
}

/* ───────────── A) Blind Spot Radar ───────────── */
export function BlindSpotPanel() {
  const ceo = useCeo()
  const go = useGo()
  const list = useMemo(() => blindSpots(ceo.inputs), [ceo.inputs])
  if (!list.length) return <p className="ceo-empty">No blind spots found in your recorded data. This only checks what is recorded — deals, meetings, decisions, commitments, strategic relationships and your mission.</p>
  return <ul className="ceo-findings">{list.map(f => <li key={f.id} className={`sev-${f.severity}`}>
    <div className="ceo-finding-head"><small>{f.kind}</small><ProvBadge source={f.source} /></div>
    <b>{f.title}</b>
    {f.missing.length > 0 && <span className="ceo-missing">Missing: {f.missing.join(' · ')}</span>}
    <Why evidence={f.why} />
    <button className="tile-link" onClick={() => go(f.route)}>{f.fix} <ArrowRight size={12} /></button>
  </li>)}</ul>
}
export function MissingTile() {
  const ceo = useCeo()
  const list = useMemo(() => blindSpots(ceo.inputs), [ceo.inputs])
  return <div className="og-tile ceo-tile">
    <Eyebrow signal>WHAT AM I MISSING?</Eyebrow>
    <h3>{list.length ? `${list.length} gap${list.length === 1 ? '' : 's'} in your recorded picture.` : 'No blind spots in your recorded data.'}</h3>
    <ul className="ceo-mini">{list.slice(0, 3).map(f => <li key={f.id}><ProvBadge source={f.source} />{f.title}</li>)}</ul>
    <button className="tile-link" onClick={() => openCeo({ view: 'missing' })}>Open Blind Spot Radar <ArrowRight size={12} /></button>
  </div>
}

/* ───────────── B/O) Red Team + Future Me ───────────── */
function Section({ title, items, empty = 'Not recorded.' }: { title: string; items: string[]; empty?: string }) {
  return <div className="rt-sec"><Eyebrow>{title}</Eyebrow>{items.length ? <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="ceo-empty">{empty}</p>}</div>
}
export function RedTeamPanel({ decisionId }: { decisionId?: string | undefined }) {
  const ceo = useCeo()
  const nav = useNav()
  const net = useNetwork()
  const [id, setId] = useState(decisionId ?? ceo.inputs.decisions.find(d => d.status !== 'archived')?.id ?? '')
  const d = ceo.inputs.decisions.find(x => x.id === id)
  if (!ceo.inputs.decisions.length) return <div><p className="ceo-empty">Red Team challenges a recorded decision. None exist yet.</p><Btn onClick={() => openCeo({ view: 'decisions', arg: 'new' })}>Record a decision</Btn></div>
  const rt = d ? redTeam(d, ceo.inputs) : null
  return <section className="redteam">
    <label className="og-form">Decision to challenge<select value={id} onChange={e => setId(e.target.value)}>{ceo.inputs.decisions.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    {d && rt && <>
      <p className="ceo-note">Built only from what is recorded on this decision and its linked records. Where evidence is absent it says so.</p>
      <div className="rt-grid">
        <Section title="WHAT MUST BE TRUE" items={rt.mustBeTrue} empty="Unknown — no assumptions or expected outcome recorded." />
        <div className="rt-sec"><Eyebrow>WHAT THE DATA SUPPORTS</Eyebrow>{rt.supports.length ? <ul>{rt.supports.map((e, i) => <li key={i}><ProvBadge source={e.source} />{e.text}</li>)}</ul> : <p className="ceo-empty">Not recorded.</p>}</div>
        <Section title="WHAT IS ONLY AN ASSUMPTION" items={rt.assumptions} empty="No assumptions written down." />
        <Section title="MISSING EVIDENCE" items={rt.missing} empty="Nothing obvious missing." />
        <Section title="RELATIONSHIP / PEOPLE RISKS" items={rt.people} empty="None found in linked records." />
        <Section title="TIMING RISKS" items={rt.timing} empty="None found in linked records." />
        <Section title="COUNTERARGUMENTS" items={rt.counter} empty="No alternatives, risks or contradicting records are recorded — which is itself a risk." />
        <div className="rt-sec"><Eyebrow>WHO COULD TEST THIS ASSUMPTION</Eyebrow>{rt.testers.length ? <ul>{rt.testers.map(x => <li key={x.name}><button className="tile-link" onClick={() => { const m = net.members.find(y => y.id === x.memberId); if (m) { ceo.close(); nav.openMember(m) } }}>{x.name}</button> <ProvBadge source="DIRECT" />{x.why}</li>)}</ul> : <p className="ceo-empty">No member states matching expertise.</p>}</div>
        <Section title="NEXT EVIDENCE TO COLLECT" items={rt.next} />
      </div>
      <GapBox gap={rt.gap} />
      <FutureMe decisionId={d.id} />
    </>}
  </section>
}
export function FutureMe({ decisionId }: { decisionId: string }) {
  const ceo = useCeo()
  const d = ceo.inputs.decisions.find(x => x.id === decisionId)
  const [prediction, setPrediction] = useState(d?.prediction ?? '')
  const [confidence, setConfidence] = useState(d?.confidence != null ? String(d.confidence) : '')
  const [review, setReview] = useState(d?.assumptionReview ?? '')
  const [actual, setActual] = useState(d?.actualOutcome ?? '')
  const [same, setSame] = useState(d?.sameAgain ?? '')
  const [saved, setSaved] = useState(false)
  if (!d) return null
  const due = d.reviewDate && new Date(d.reviewDate).getTime() <= Date.now()
  return <div className="futureme">
    <Eyebrow signal>FUTURE ME {due ? '· REVIEW DUE' : d.reviewDate ? `· CHECK BACK ${fmt(d.reviewDate)}` : ''}</Eyebrow>
    <div className="og-form">
      <label className="wide">What did you believe? (prediction)<textarea rows={2} value={prediction} onChange={e => setPrediction(e.target.value)} /></label>
      <label>Your confidence (0–100)<input type="number" min={0} max={100} value={confidence} onChange={e => setConfidence(e.target.value)} /></label>
      <label className="wide">What happened?<textarea rows={2} value={actual} onChange={e => setActual(e.target.value)} /></label>
      <label className="wide">Which assumption was right / wrong?<textarea rows={2} value={review} onChange={e => setReview(e.target.value)} /></label>
      <label>Would you make the same decision again?<select value={same} onChange={e => setSame(e.target.value as typeof same)}><option value="">Not answered</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Unsure</option></select></label>
    </div>
    <div className="og-row-actions"><Btn onClick={async () => {
      const c = confidence.trim() === '' ? null : Math.max(0, Math.min(100, Math.round(Number(confidence))))
      const r = await ceo.saveDecision({ id: d.id, title: d.title, prediction, confidence: Number.isFinite(c as number) ? c : null, assumptionReview: review, actualOutcome: actual, sameAgain: same as '' | 'yes' | 'no' | 'unsure' })
      setSaved(Boolean(r))
    }}>Save judgment record</Btn>{saved && <small>Saved.</small>}</div>
  </div>
}

/* ───────────── E) Who can I help? ───────────── */
export function HelpPanel({ limit }: { limit?: number }) {
  const ceo = useCeo()
  const nav = useNav()
  const list = useMemo(() => whoCanIHelp(ceo.inputs.g), [ceo.inputs.g])
  if (!ceo.inputs.g.me.offers.length && !ceo.inputs.g.me.expertise.length) return <p className="ceo-empty">Add what you can help with (offers / expertise) on Me so Ask Intros can match you to members’ stated needs.</p>
  if (!list.length) return <p className="ceo-empty">No member need or network Ask matches your stated offers yet.</p>
  return <div className="og-reverse-list">{list.slice(0, limit ?? 12).map((h, i) => <article key={`${h.member.id}-${i}`} className="ceo-match">
    <div className="ceo-finding-head"><small>WHO</small><ProvBadge source="DIRECT" /></div>
    <b>{h.member.name}</b><small>{h.member.title}{h.member.company ? ` · ${h.member.company}` : ''} · {h.context}</small>
    <p><b>What they need:</b> {h.need}</p>
    <p><b>Why you may help:</b> {h.why.join(' ')}</p>
    <Why evidence={h.evidence} label="EVIDENCE" />
    <p className="ceo-note">{h.action}</p>
    <div className="og-row-actions"><button onClick={() => { ceo.close(); nav.openMember(h.member) }}>Executive Page</button>{h.ask && <button onClick={() => { ceo.close(); nav.setPage('needs' as never) }}>Open the Ask</button>}</div>
  </article>)}</div>
}
export function HelpTile() {
  const ceo = useCeo()
  const list = useMemo(() => whoCanIHelp(ceo.inputs.g), [ceo.inputs.g])
  return <div className="og-tile ceo-tile">
    <Eyebrow>WHO CAN I HELP?</Eyebrow>
    <h3>{list.length ? `${list.length} stated need${list.length === 1 ? '' : 's'} match what you offer.` : 'Give value first. No matching needs yet.'}</h3>
    <ul className="ceo-mini">{list.slice(0, 3).map((h, i) => <li key={i}><b>{h.member.name}</b> — {h.need}</li>)}</ul>
    <button className="tile-link" onClick={() => openCeo({ view: 'help' })}>See who <ArrowRight size={12} /></button>
  </div>
}

/* ───────────── F/G) Coverage + Influence ───────────── */
export function CoveragePanel({ arg = '' }: { arg?: string }) {
  const ceo = useCeo()
  const [key, setKey] = useState(arg)
  const cos = ceo.inputs.companies.filter(c => !c.archived)
  const cov = key ? companyCoverage(key, ceo.inputs) : null
  const tag = async (subjectId: string, label: string, companyId: string | null) => {
    const ex = ceo.inputs.marks.find(m => m.kind === 'influence' && m.subjectId === subjectId)
    if (label === 'Unknown') { if (ex) await ceo.removeMark(ex.id); return }
    await ceo.saveMark({ kind: 'influence', subjectId, label, companyId })
  }
  return <section className="coverage">
    <label className="og-form">Company<select value={cov?.company.id ?? key} onChange={e => setKey(e.target.value)}><option value="">Choose a company…</option>{cos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {!cos.length && <p className="ceo-empty">No CRM companies yet. Coverage uses your canonical CRM people and companies.</p>}
    {cov && <>
      <h3>{cov.company.name}</h3>
      {cov.singleThread && <p className="ceo-risk"><ShieldAlert size={13} /> Single-thread risk: {cov.rows.length ? 'only one known person' : 'no known people'} on an account with an active opportunity.</p>}
      <div className="coverage-table" role="table">
        <div role="row" className="coverage-head"><span>Person</span><span>Function <ProvBadge source="INFERRED" /></span><span>Influence (manual)</span><span>Connected</span><span>Last touch</span><span>Health</span><span>Open items</span></div>
        {cov.rows.map(r => <div role="row" key={r.person.id}>
          <span><b>{r.person.fullName}</b><small>{r.person.title || 'No title'}</small></span>
          <span>{r.functional}</span>
          <span><select aria-label={`Influence role for ${r.person.fullName}`} value={r.influence} onChange={e => void tag(r.person.id, e.target.value, cov.company.id)}>{influenceRoles.map(x => <option key={x}>{x}</option>)}</select></span>
          <span>{r.connected ? 'Direct' : r.member ? 'Member, not connected' : 'CRM only'}</span>
          <span>{r.last === null ? 'Not recorded' : `${r.last}d ago`}</span>
          <span>{r.health}</span>
          <span>{r.openCommitments} tasks · {r.opps.length} opps</span>
        </div>)}
        {!cov.rows.length && <p className="ceo-empty">No known people at this company.</p>}
      </div>
      {cov.opps.length > 0 && <p className="ceo-note">Opportunities: {cov.opps.map(o => `${o.name} (${o.status})`).join(' · ')}</p>}
      <p className="ceo-note">Functional roles are read from job titles; “Unclassified” when the title says nothing. Influence roles are never inferred — only what you tag, stored privately.</p>
      <GapBox gap={cov.gap} />
    </>}
  </section>
}
export function SinglesPanel() {
  const ceo = useCeo()
  const list = useMemo(() => singleThreadAccounts(ceo.inputs), [ceo.inputs])
  if (!list.length) return <p className="ceo-empty">No account with an open opportunity relies on one or zero known relationships.</p>
  return <ul className="ceo-findings">{list.map(c => <li key={c.company.id ?? c.company.name} className="sev-3">
    <div className="ceo-finding-head"><small>SINGLE-THREAD RISK</small><ProvBadge source="INFERRED" /></div>
    <b>{c.company.name}</b><span>{c.rows.length ? `Only ${c.rows[0]!.person.fullName}` : 'No one'} known · {c.opps.filter(o => o.status === 'open').length} open opportunities</span>
    <button className="tile-link" onClick={() => openCeo({ view: 'coverage', arg: c.company.id ?? c.company.name })}>Open coverage <ArrowRight size={12} /></button>
  </li>)}</ul>
}

/* ───────────── H/M) Strategic + Bench ───────────── */
const benchCats = ['Potential hire', 'Advisor', 'Board', 'Partner', 'Acquisition operator', 'Expert', 'Other']
export function MarkButtons({ subjectId, companyId = null }: { subjectId: string; companyId?: string | null }) {
  const ceo = useCeo()
  const has = (k: Mark['kind']) => ceo.inputs.marks.some(m => m.kind === k && m.subjectId === subjectId)
  return <div className="og-row-actions">
    <button className={has('strategic') ? 'active' : ''} onClick={() => has('strategic') ? openCeo({ view: 'strategic' }) : void ceo.saveMark({ kind: 'strategic', subjectId, companyId, cadenceDays: 30 }).then(() => openCeo({ view: 'strategic' }))}><Star size={12} /> {has('strategic') ? 'Strategic ✓' : 'Add to Strategic Relationships'}</button>
    <button className={has('bench') ? 'active' : ''} onClick={() => has('bench') ? openCeo({ view: 'bench' }) : void ceo.saveMark({ kind: 'bench', subjectId, companyId, label: 'Other' }).then(() => openCeo({ view: 'bench' }))}><Bookmark size={12} /> {has('bench') ? 'On bench ✓' : 'Add to Bench'}</button>
    <button onClick={() => openCeo({ view: 'replay', memberId: subjectId })}>Replay relationship</button>
  </div>
}
function MarkEditor({ mark, bench }: { mark: Mark; bench: boolean }) {
  const ceo = useCeo()
  const [m, setM] = useState(mark)
  const set = (k: keyof Mark, v: unknown) => setM(x => ({ ...x, [k]: v }))
  return <div className="og-form">
    {bench && <label>Category<select value={m.label} onChange={e => set('label', e.target.value)}>{benchCats.map(c => <option key={c}>{c}</option>)}</select></label>}
    {!bench && <label>Cadence (days)<input type="number" min={1} max={365} value={m.cadenceDays ?? 30} onChange={e => set('cadenceDays', Number(e.target.value) || 30)} /></label>}
    <label>Next touch<input type="date" value={m.nextTouch ?? ''} onChange={e => set('nextTouch', e.target.value || null)} /></label>
    <label className="wide">{bench ? 'Why they are on the bench' : 'Desired relationship outcome'}<textarea rows={2} value={m.outcome} onChange={e => set('outcome', e.target.value)} /></label>
    {!bench && <><label className="wide">Value I can give<textarea rows={2} value={m.valueGive} onChange={e => set('valueGive', e.target.value)} /></label>
      <label className="wide">Value / context I need<textarea rows={2} value={m.valueNeed} onChange={e => set('valueNeed', e.target.value)} /></label></>}
    <label className="wide">Next action<input value={m.nextAction} onChange={e => set('nextAction', e.target.value)} /></label>
    <label>Linked mission<select value={m.missionId ?? ''} onChange={e => set('missionId', e.target.value || null)}><option value="">None</option>{ceo.inputs.g.missions.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    {bench && <label className="wide">Notes<textarea rows={2} value={m.notes} onChange={e => set('notes', e.target.value)} /></label>}
    <div className="og-row-actions wide"><Btn onClick={() => void ceo.saveMark({ ...m })}>Save</Btn><button onClick={() => void ceo.removeMark(m.id)}>Remove</button></div>
  </div>
}
export function StrategicPanel({ kind = 'strategic' }: { kind?: 'strategic' | 'bench' }) {
  const ceo = useCeo()
  const nav = useNav()
  const net = useNetwork()
  const rows = useMemo(() => strategicRows(ceo.inputs, kind), [ceo.inputs, kind])
  const [open, setOpen] = useState<string | null>(null)
  const bench = kind === 'bench'
  if (!rows.length) return <p className="ceo-empty">{bench ? 'Your bench is empty. Use “Add to Bench” on an Executive Page or in Who Can Change This for people you may want later — hires, advisors, board, partners.' : 'No strategic relationships yet. Keep this list short: open an Executive Page and choose “Add to Strategic Relationships”.'}</p>
  return <ul className="ceo-findings">{rows.map(r => <li key={r.mark.id} className={!bench && (r.dueIn ?? 1) <= 0 ? 'sev-2' : ''}>
    <div className="ceo-finding-head"><small>{bench ? r.mark.label || 'Bench' : (r.dueIn ?? 1) <= 0 ? 'DUE FOR ATTENTION' : `next touch in ${r.dueIn}d`}</small><ProvBadge source="RECORDED" /></div>
    <b>{r.name}</b>
    <span>Last interaction: {r.last === null ? 'not recorded' : `${r.last} days ago`} · Health {r.health} · {r.commitments} open commitments{r.opps.length ? ` · ${r.opps.join(', ')}` : ''}{r.mission ? ` · Mission: ${r.mission}` : ''}</span>
    {r.mark.outcome && <span>{bench ? 'Why: ' : 'Outcome: '}{r.mark.outcome}</span>}
    {r.mark.nextAction && <span>Next: {r.mark.nextAction}</span>}
    <div className="og-row-actions">
      <button onClick={() => setOpen(open === r.mark.id ? null : r.mark.id)}>{open === r.mark.id ? 'Close' : 'Edit plan'}</button>
      {r.memberId && <button onClick={() => { const m = net.members.find(x => x.id === r.memberId); if (m) { ceo.close(); nav.openMember(m) } }}>Executive Page</button>}
      {r.memberId && <button onClick={() => openCeo({ view: 'prepare', memberId: r.memberId })}>Prepare me</button>}
    </div>
    {open === r.mark.id && <MarkEditor mark={r.mark} bench={bench} />}
  </li>)}</ul>
}
export function StrategicTile() {
  const ceo = useCeo()
  const rows = useMemo(() => strategicRows(ceo.inputs), [ceo.inputs])
  const due = rows.filter(r => (r.dueIn ?? 1) <= 0)
  return <div className="og-tile ceo-tile">
    <Eyebrow>STRATEGIC RELATIONSHIPS</Eyebrow>
    <h3>{rows.length ? `${due.length} of ${rows.length} due for attention.` : 'Choose the few people you must stay close to.'}</h3>
    <ul className="ceo-mini">{(due.length ? due : rows).slice(0, 3).map(r => <li key={r.mark.id}><b>{r.name}</b> — {r.last === null ? 'no recorded touch' : `${r.last}d since last touch`}</li>)}</ul>
    <button className="tile-link" onClick={() => openCeo({ view: 'strategic' })}>Open plan <ArrowRight size={12} /></button>
  </div>
}

/* ───────────── I) CEO Time ROI ───────────── */
export function TimeRoiPanel() {
  const ceo = useCeo()
  const [days, setDays] = useState(30)
  const r = useMemo(() => timeRoi(ceo.inputs, days), [ceo.inputs, days])
  const max = Math.max(1, ...r.byCategory.map(c => c.hours))
  return <section className="timeroi">
    <div className="state-filters">{[7, 30, 90].map(d => <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>Last {d} days</button>)}</div>
    {!r.total ? <p className="ceo-empty">No calendar meetings recorded in the last {days} days. Time ROI uses your private calendar only.</p> : <>
      <div className="ceo-pulse">
        <div><small>MEETINGS</small><b>{r.total}</b><span>{r.hours} hours</span></div>
        <div><small>PRODUCED A DECISION</small><b>{r.withDecision}</b><span>linked in Decision Room</span></div>
        <div><small>PRODUCED A COMMITMENT</small><b>{r.withCommitment}</b><span>linked commitment</span></div>
        <div><small>LINKED TO DEAL MOVEMENT</small><b>{r.withOppMove}</b><span>activity or change within a day</span></div>
      </div>
      <Eyebrow>HOURS BY CATEGORY</Eyebrow>
      <ul className="timeroi-bars">{r.byCategory.map(c => <li key={c.category}><span>{c.category}{c.inferred ? <ProvBadge source="INFERRED" /> : <ProvBadge source="RECORDED" />}</span><i style={{ width: `${(c.hours / max) * 100}%` }} /><b>{c.hours}h · {c.count}</b></li>)}</ul>
      <p className="ceo-note">Categories come from the event type when it matches ({timeCategories.join(', ')}); otherwise they are inferred from the title and marked INFERRED. No ROI is claimed without a linked outcome.</p>
      {r.noOutcome.length > 0 && <><Eyebrow>NO RECORDED OUTCOME OR ACTION ({r.noOutcome.length})</Eyebrow><ul className="ceo-mini">{r.noOutcome.slice(0, 8).map(m => <li key={m.id}>{fmt(m.when)} · {m.title} <small>({m.category})</small></li>)}</ul></>}
      {r.delegation.length > 0 && <><Eyebrow>REVIEW FOR DELEGATION</Eyebrow><ul className="ceo-mini">{r.delegation.map(d => <li key={d.title}>“{d.title}” — {d.count} internal meetings with no decision, commitment or notes.</li>)}</ul></>}
    </>}
  </section>
}

/* ───────────── J) Promise risk ───────────── */
export function PromisePanel() {
  const ceo = useCeo()
  const list = useMemo(() => promiseRisk(ceo.inputs), [ceo.inputs])
  if (!list.length) return <p className="ceo-empty">No trust at risk: no person or company has multiple late or stacked promises from you.</p>
  return <ul className="ceo-findings">{list.map(r => <li key={r.key} className="sev-3">
    <div className="ceo-finding-head"><small>TRUST AT RISK</small><ProvBadge source="RECORDED" /></div>
    <b>{r.title.replace('TRUST AT RISK — ', '')}</b>
    <ul>{r.evidence.map((e, i) => <li key={i}>{e.text}</li>)}</ul>
    <ul className="ceo-mini">{r.tasks.map(x => <li key={x.id}>{x.title}{x.dueAt ? ` · due ${fmt(x.dueAt)}` : ' · no due date'}</li>)}</ul>
    <button className="tile-link" onClick={() => openCeo({ view: 'commitments' })}>Review commitments <ArrowRight size={12} /></button>
  </li>)}</ul>
}

/* ───────────── K/L) Collisions + company match ───────────── */
export function CollisionsPanel() {
  const ceo = useCeo()
  const list = useMemo(() => collisions(ceo.inputs.g), [ceo.inputs.g])
  const [queued, setQueued] = useState<string[]>([])
  if (!list.length) return <p className="ceo-empty">No stated need currently matches another member’s stated offer.</p>
  return <div className="og-reverse-list">{list.map(c => { const k = `${c.a.id}-${c.b.id}`; return <article key={k} className="ceo-match">
    <div className="ceo-finding-head"><small>OPPORTUNITY COLLISION</small><ProvBadge source="DIRECT" /></div>
    <b>{c.a.name} × {c.b.name}</b>
    <p><b>Why:</b> {c.why.join(' ')}</p>
    <p><b>{c.a.name} gains:</b> {c.gainA}<br /><b>{c.b.name} gains:</b> {c.gainB}</p>
    <p><b>Trust / path:</b> {c.path}<br /><b>Why now:</b> {c.whyNow}</p>
    <p className="ceo-note">Suggested context: “{c.context}”</p>
    <button disabled={queued.includes(k)} onClick={() => void ceo.queueApproval({ actionType: 'request_intro', summary: `Introduce ${c.a.name} to ${c.b.name}`, payload: { a: c.a.id, b: c.b.id, context: c.context }, source: 'collision' }).then(() => setQueued(q => [...q, k]))}>{queued.includes(k) ? 'Queued for your approval' : 'Queue intro for approval'}</button>
  </article> })}</div>
}
export function CompanyMatchPanel() {
  const ceo = useCeo()
  const list = useMemo(() => companyMatches(ceo.inputs.g), [ceo.inputs.g])
  if (!list.length) return <p className="ceo-empty">No company-to-company match has enough stated evidence (two or more shared terms between one company’s needs and another’s offers).</p>
  return <ul className="ceo-findings">{list.map((m, i) => <li key={i}>
    <div className="ceo-finding-head"><small>COMPANY MATCH</small><ProvBadge source="INFERRED" /></div>
    <b>{m.a} → {m.b}</b>
    <span><b>Need:</b> {m.need} · <b>Capability:</b> {m.capability}</span>
    <span><b>Path:</b> {m.path}{m.initiators.length ? ` Could initiate: ${m.initiators.join(', ')}.` : ''}</span>
    <Why evidence={m.evidence} gap={{ known: ['Member-stated need and offer'], unknown: [m.gap], improve: 'Confirm the need with the company directly.' }} />
  </li>)}</ul>
}

/* ───────────── P) Replay ───────────── */
export function ReplayPanel({ arg = '', memberId }: { arg?: string; memberId?: string | undefined }) {
  const ceo = useCeo()
  const [q, setQ] = useState(arg)
  const r = useMemo(() => replay(q, ceo.inputs, q ? undefined : memberId), [q, ceo.inputs, memberId])
  return <section>
    <label className="og-form">Person, company, opportunity or decision<input value={q} onChange={e => setQ(e.target.value)} placeholder="Type a name…" /></label>
    {!r ? <p className="ceo-empty">{q || memberId ? 'No recorded person, company, opportunity or decision matches.' : 'Type a name to replay its recorded history.'}</p>
      : !r.steps.length ? <p className="ceo-empty">{r.subject}: nothing with a timestamp is recorded yet.</p>
      : <><h3>{r.subject}</h3><ol className="replay">{r.steps.map((s, i) => <li key={i}><small>{fmt(s.at)} · {s.kind}</small><ProvBadge source={s.source} /><span>{s.text}</span></li>)}<li className="now"><small>NOW</small><span>Current status is the last entry above.</span></li></ol></>}
  </section>
}

/* ───────────── Q) Patterns ───────────── */
export function PatternsPanel() {
  const ceo = useCeo()
  const list = useMemo(() => patterns(ceo.inputs), [ceo.inputs])
  if (!list.length) return <p className="ceo-empty">No won or lost opportunities recorded yet. Patterns appear once outcomes exist.</p>
  return <section>
    <p className="ceo-note">Patterns need at least {PATTERN_MIN} records; smaller samples are labelled. These are associations — never proof of cause.</p>
    <ul className="ceo-findings">{list.map(p => <li key={p.label}><div className="ceo-finding-head"><small>{p.label}</small>{p.small ? <span className="prov prov-unknown">SMALL SAMPLE</span> : <ProvBadge source="OBSERVED" />}</div><b>{p.value}</b><span>n = {p.sample} · {p.note}</span></li>)}</ul>
  </section>
}

/* ───────────── Entry bars ───────────── */
export function InsightBar({ where }: { where: 'work' | 'network' }) {
  return <div className="og-row-actions ceo-actions">
    <button onClick={() => openCeo({ view: 'missing' })}><Radar size={12} /> What am I missing?</button>
    {where === 'work' ? <>
      <button onClick={() => openCeo({ view: 'redteam' })}><Crosshair size={12} /> Challenge this</button>
      <button onClick={() => openCeo({ view: 'coverage' })}>Coverage</button>
      <button onClick={() => openCeo({ view: 'singles' })}>Single-thread risk</button>
      <button onClick={() => openCeo({ view: 'time' })}>CEO time ROI</button>
      <button onClick={() => openCeo({ view: 'promises' })}>Trust at risk</button>
      <button onClick={() => openCeo({ view: 'patterns' })}>Patterns</button>
      <button onClick={() => openCeo({ view: 'replay' })}>Replay</button>
    </> : <>
      <button onClick={() => openCeo({ view: 'help' })}><HandHeart size={12} /> Who can I help?</button>
      <button onClick={() => openCeo({ view: 'strategic' })}>Strategic relationships</button>
      <button onClick={() => openCeo({ view: 'bench' })}>Bench</button>
      <button onClick={() => openCeo({ view: 'collisions' })}>Opportunity collisions</button>
      <button onClick={() => openCeo({ view: 'companies' })}>Company match</button>
      <button onClick={() => openCeo({ view: 'coverage' })}>Coverage</button>
    </>}
  </div>
}

/* ───────────── S) CEO Digital Office ───────────── */
export function DigitalOffice() {
  const ceo = useCeo()
  const i = ceo.inputs
  const spots = useMemo(() => blindSpots(i), [i])
  const help = useMemo(() => whoCanIHelp(i.g).length, [i.g])
  const strat = useMemo(() => strategicRows(i), [i])
  const reviews = i.decisions.filter(d => d.status !== 'archived' && d.reviewDate && new Date(d.reviewDate).getTime() <= Date.now()).length
  const pending = i.approvals.filter(a => a.status === 'pending' || a.status === 'approved').length
  const col = (label: string, items: [string, CeoRoute, string?][]) => <div className="office-col">
    <Eyebrow signal={label === 'TODAY'}>{label}</Eyebrow>
    {items.map(([t, r, n]) => <button key={t} onClick={() => openCeo(r)}><span>{t}</span>{n !== undefined && <b>{n}</b>}<ArrowRight size={12} /></button>)}
  </div>
  return <section className="digital-office" aria-label="CEO digital office">
    {col('TODAY', [['What changed', { view: 'changed' }], ['What needs me', { view: 'forgetting' }], ['What am I missing', { view: 'missing' }, String(spots.length)]])}
    {col('RELATIONSHIPS', [['Who matters', { view: 'health' }], ['Who can I help', { view: 'help' }, String(help)], ['Strategic relationships', { view: 'strategic' }, `${strat.filter(r => (r.dueIn ?? 1) <= 0).length}/${strat.length}`]])}
    {col('DECISIONS', [['Decisions needing review', { view: 'decisions' }, String(reviews)], ['Pending approvals', { view: 'approvals' }, String(pending)], ['Challenge this', { view: 'redteam' }]])}
    {col('ACT', [['Make introductions', { view: 'collisions' }], ['Prepare for meetings', { view: 'prepare' }], ['Follow up', { view: 'promises' }], ['Review commitments', { view: 'commitments' }], ['Generate executive brief', { view: 'brief', arg: 'weekly' }]])}
  </section>
}
