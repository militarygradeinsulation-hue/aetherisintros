/**
 * Outcome surfaces: due check-ins on Intros, the per-introduction outcome timeline inside
 * the context capsule, and the admin proof panel. One tap for the common answers; the
 * detail form only opens when the member reports an actual outcome.
 */
import { useCallback, useEffect, useState } from 'react'
import { Check, Flag, Trash2 } from 'lucide-react'

import {
  OUTCOME_CATEGORIES, VALUE_BANDS, attributionLabel, categoryLabel, checkinPrompt, furthestStage, loadDueCheckins,
  loadIntroOutcomes, loadMyVisibleOutcomes, loadNetworkProof, rate, recordOutcome, retractOutcome, stageLabel,
  summariseOutcomes, valueBandLabel,
  type Attribution, type DueCheckin, type NetworkProof, type OutcomeCategory, type OutcomeEvent, type OutcomeStage,
  type OutcomeSummary, type ValueBand,
} from './outcomes'
import { useGraph } from './graph-store'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

const QUICK: OutcomeStage[] = ['met', 'next_step', 'too_early', 'no_outcome']

function OutcomeForm({ introRequestId, onSaved, quick = QUICK }: { introRequestId: string; onSaved: () => void; quick?: OutcomeStage[] }) {
  const [detail, setDetail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ category: 'customer' as OutcomeCategory, valueBand: 'undisclosed' as ValueBand, attribution: 'direct' as Attribution, note: '', shareable: false })

  const save = async (stage: OutcomeStage) => {
    setBusy(true)
    const res = await recordOutcome({
      introRequestId, stage, outcomeCategory: stage === 'outcome' ? f.category : null, valueBand: f.valueBand,
      attribution: f.attribution, privateNote: f.note, shareable: f.shareable,
    })
    setBusy(false)
    if (res.error) { setMsg(res.error); return }
    setDetail(false)
    onSaved()
  }

  return <div className="oc-form">
    <div className="og-yn">
      {quick.map(s => <button key={s} disabled={busy} onClick={() => void save(s)}>{stageLabel[s]}</button>)}
      <button disabled={busy} className={detail ? 'active' : ''} onClick={() => setDetail(d => !d)}><Flag size={12} /> {stageLabel.outcome}</button>
    </div>
    {detail && <div className="og-form">
      <label>What kind<select value={f.category} onChange={e => setF(v => ({ ...v, category: e.target.value as OutcomeCategory }))}>
        {OUTCOME_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}</select></label>
      <label>How much did the introduction matter<select value={f.attribution} onChange={e => setF(v => ({ ...v, attribution: e.target.value as Attribution }))}>
        {(Object.keys(attributionLabel) as Attribution[]).map(a => <option key={a} value={a}>{attributionLabel[a]}</option>)}</select></label>
      <label>Approximate value (optional)<select value={f.valueBand} onChange={e => setF(v => ({ ...v, valueBand: e.target.value as ValueBand }))}>
        {VALUE_BANDS.map(b => <option key={b} value={b}>{valueBandLabel[b]}</option>)}</select></label>
      <label className="wide">Private note (only you can read this)<textarea rows={2} maxLength={1000} value={f.note} onChange={e => setF(v => ({ ...v, note: e.target.value }))} /></label>
      <label className="og-check wide"><input type="checkbox" checked={f.shareable} onChange={e => setF(v => ({ ...v, shareable: e.target.checked }))} /> Let the other participant see this outcome (never the note)</label>
      <Btn kind="secondary" disabled={busy} onClick={() => void save('outcome')}><Check size={14} /> Record outcome</Btn>
    </div>}
    {msg && <p className="og-note">{msg}</p>}
  </div>
}

/** Due follow-ups on accepted introductions (7 / 30 / 90 days). Renders nothing when none are due. */
export function OutcomeCheckins() {
  const net = useNetwork()
  const { signedIn } = useGraph()
  const [due, setDue] = useState<DueCheckin[]>([])
  const [summary, setSummary] = useState<OutcomeSummary | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!signedIn) return
    const [d, mine] = await Promise.all([loadDueCheckins(), loadMyVisibleOutcomes()])
    setDue(d.data)
    setError(d.error || mine.error)
    setSummary(mine.data.length ? summariseOutcomes(mine.data) : null)
  }, [signedIn])
  useEffect(() => { void load() }, [load])

  const nameOf = (id: string | null) => net.members.find(m => m.id === id)?.name ?? 'your introduction'
  if (!signedIn || (!due.length && !summary && !error)) return null

  return <section className="executive-section oc-checkins">
    <Eyebrow signal>INTRODUCTION OUTCOMES</Eyebrow>
    <h2>{due.length ? `${due.length} introduction${due.length === 1 ? '' : 's'} to follow up.` : 'What your introductions produced.'}</h2>
    <p className="og-note">Ten seconds each. This is how the network learns which introductions actually change results. Private unless you choose to share.</p>
    {summary && <dl className="oc-funnel">
      <div><dt>Introductions tracked</dt><dd>{summary.introductions}</dd></div>
      <div><dt>Led to a meeting</dt><dd>{summary.met}</dd></div>
      <div><dt>Agreed a next step</dt><dd>{summary.nextStep}</dd></div>
      <div><dt>Produced an outcome</dt><dd>{summary.outcomes}</dd></div>
    </dl>}
    {due.map(c => <article key={`${c.introRequestId}-${c.checkpoint}`} className="oc-card">
      <p><b>{checkinPrompt(c, nameOf(c.counterpartId))}</b></p>
      <small className="og-note">Accepted {c.daysSince} days ago{c.lastStage ? ` · last update: ${stageLabel[c.lastStage]}` : ''}</small>
      <OutcomeForm introRequestId={c.introRequestId} onSaved={() => void load()} />
    </article>)}
    {error && <p className="og-note">{error}</p>}
  </section>
}

/** Timeline of what an accepted introduction led to, plus a way to add the next update. */
export function IntroOutcomeTimeline({ introRequestId, myId }: { introRequestId: string; myId: string | null }) {
  const [events, setEvents] = useState<OutcomeEvent[]>([])
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const r = await loadIntroOutcomes(introRequestId)
    setEvents(r.data); setError(r.error)
  }, [introRequestId])
  useEffect(() => { void load() }, [load])
  const top = furthestStage(events)
  const closed = events.some(e => e.authorId === myId && (e.stage === 'outcome' || e.stage === 'no_outcome'))

  return <details className="og-feedback oc-timeline" open={!events.length}>
    <summary>What this introduction led to{top ? ` · ${stageLabel[top]}` : ''}</summary>
    {events.length > 0 && <ol>{events.map(e => <li key={e.id}>
      <span>{new Date(e.createdAt).toLocaleDateString()}</span>
      <b>{stageLabel[e.stage]}{e.outcomeCategory ? ` — ${categoryLabel[e.outcomeCategory]}` : ''}</b>
      <small>{e.authorId === myId ? `You${e.shareable ? ' · shared' : ' · private'}` : 'Shared by the other participant'}
        {e.stage === 'outcome' ? ` · ${attributionLabel[e.attribution]}${e.valueBand !== 'undisclosed' ? ` · ${valueBandLabel[e.valueBand]}` : ''}` : ''}</small>
      {e.authorId === myId && <button aria-label="Retract this update" onClick={() => void retractOutcome(e.id).then(r => { if (r.error) setError(r.error); else void load() })}><Trash2 size={12} /></button>}
    </li>)}</ol>}
    {!closed && <OutcomeForm introRequestId={introRequestId} onSaved={() => void load()} />}
    {error && <p className="og-note">{error}</p>}
  </details>
}

const pct = (v: number | null) => (v === null ? '—' : `${v}%`)

/** Admin-only: counts-only proof that the network changes outcomes. */
export function NetworkProofPanel() {
  const [days, setDays] = useState(90)
  const [proof, setProof] = useState<NetworkProof | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stale = false
    void loadNetworkProof(days).then(r => { if (!stale) { setProof(r.data); setError(r.error) } })
    return () => { stale = true }
  }, [days])

  return <section className="admin-panel oc-proof">
    <h2>Network proof</h2>
    <p className="empty-note">Counts only — no identities or content. These are the numbers that show whether the network changes outcomes.</p>
    <div className="admin-modes">{[30, 90, 365].map(d => <button key={d} type="button" className={days === d ? 'chip on' : 'chip'} onClick={() => setDays(d)}>{d} days</button>)}</div>
    {error && <p className="empty-note">{error}</p>}
    {proof && <>
      <dl className="oc-funnel">
        <div><dt>Members</dt><dd>{proof.members}</dd></div>
        <div><dt>Asked this week</dt><dd>{proof.weekly_askers}</dd></div>
        <div><dt>Asks posted</dt><dd>{proof.asks}</dd></div>
        <div><dt>Intros requested</dt><dd>{proof.intros_requested}</dd></div>
        <div><dt>Accepted</dt><dd>{proof.intros_accepted} <small>{pct(rate(proof.intros_accepted, proof.intros_requested))}</small></dd></div>
        <div><dt>Led to a meeting</dt><dd>{proof.intros_met} <small>{pct(rate(proof.intros_met, proof.intros_accepted))}</small></dd></div>
        <div><dt>Next step</dt><dd>{proof.intros_next_step} <small>{pct(rate(proof.intros_next_step, proof.intros_met))}</small></dd></div>
        <div><dt>Outcome</dt><dd>{proof.intros_outcome} <small>{pct(rate(proof.intros_outcome, proof.intros_accepted))}</small></dd></div>
      </dl>
      <ul className="admin-list">
        {Object.entries(proof.outcomes_by_category).map(([k, n]) => <li key={k}><span>{categoryLabel[k as OutcomeCategory] ?? k}</span><small>{n}</small></li>)}
        {proof.median_days_to_outcome !== null && <li><span>Median time from acceptance to outcome</span><small>{Math.max(1, Math.round(proof.median_days_to_outcome))} days</small></li>}
      </ul>
      {!proof.intros_outcome && <p className="empty-note">No outcomes recorded in this window yet. Check-ins ask participants at 7, 30 and 90 days.</p>}
    </>}
  </section>
}
