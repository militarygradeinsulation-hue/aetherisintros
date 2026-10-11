import { useState } from 'react'
import { Plus, Send, X } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral } from '../ui'
import type { OutcomeType, ValueState } from '../domain/models'

const outcomeTypes: OutcomeType[] = ['meeting', 'opportunity', 'pilot', 'sale', 'partnership', 'investment', 'hire', 'referral', 'system adoption']

export function OutcomesPage() {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const [recording, setRecording] = useState(false)
  const [filter, setFilter] = useState<'all' | OutcomeType>('all')
  const list = platform.outcomes.filter(o => filter === 'all' || o.type === filter)
  const counts = (t: OutcomeType) => platform.outcomes.filter(o => o.type === t).length
  const known = platform.outcomes.filter(o => o.directValue.state === 'known').length
  const modeled = platform.outcomes.filter(o => o.directValue.state === 'modeled').length

  return <>
    <Head
      label="OUTCOMES / WHAT ACTUALLY HAPPENED"
      title="Relationships are judged by what moved, not by activity."
      copy="Every outcome records the evidence behind it and whether the value is known, modelled or simply not quantified. Nothing is inflated."
      proof={`${platform.outcomes.length} recorded · ${known} with known value · ${modeled} modelled`}
      action={<Btn onClick={() => setRecording(true)}><Plus size={14} /> Record outcome</Btn>}
    />

    <div className="state-filters">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All ({platform.outcomes.length})</button>
      {outcomeTypes.filter(t => counts(t) > 0).map(t =>
        <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t} ({counts(t)})</button>)}
    </div>

    <section className="outcome-list">
      {list.map(o => {
        const member = o.memberId ? net.members.find(m => m.id === o.memberId) : undefined
        const system = o.systemId ? platform.systems.find(s => s.id === o.systemId) : undefined
        return <article key={o.id} className="outcome-row">
          <header>
            <div>
              <Eyebrow signal>{o.type.toUpperCase()}</Eyebrow>
              <h3>{o.headline}</h3>
              <small>{o.createdAt}{o.companyName ? ` · ${o.companyName}` : ''}</small>
            </div>
            <Numeral value={o.confidence} of=" confidence" />
          </header>
          <dl className="value-pair">
            <div><dt>DIRECT VALUE</dt><dd><span className={`value-state ${o.directValue.state}`}>{o.directValue.state}</span>{o.directValue.note}</dd></div>
            <div><dt>INFLUENCED VALUE</dt><dd><span className={`value-state ${o.influencedValue.state}`}>{o.influencedValue.state}</span>{o.influencedValue.note}</dd></div>
          </dl>
          <p className="outcome-evidence"><b>Evidence.</b> {o.evidence}</p>
          <footer>
            {member && <button className="mod-link with-face" onClick={() => nav.openMember(member)}><Face person={member} portrait /> {member.name}</button>}
            {system && <button className="mod-link" onClick={() => nav.openSystem(system.id)}>{system.name}</button>}
          </footer>
        </article>
      })}
      {list.length === 0 && <p className="empty-state">No outcomes of this type yet.</p>}
    </section>

    <section className="teach-block">
      <div><Eyebrow>HOW VALUE IS STATED</Eyebrow>
        <h2>Known, modelled, or unquantified. Never invented.</h2>
        <p>A known value has a signed number behind it. A modelled value shows its assumptions. Unquantified means the outcome mattered but the money is not measurable — and that is recorded honestly.</p>
      </div>
      <ul className="teach-points">
        <li><b>Known</b><span>Confirmed by both sides.</span></li>
        <li><b>Modelled</b><span>Stated with the assumption visible.</span></li>
        <li><b>Unquantified</b><span>Real, but not measured.</span></li>
      </ul>
    </section>

    {recording && <RecordOutcome onClose={() => setRecording(false)} />}
  </>
}

function RecordOutcome({ onClose }: { onClose: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const [form, setForm] = useState({
    type: 'meeting' as OutcomeType, headline: '', memberId: '', systemId: '', company: '',
    directState: 'unquantified' as ValueState, directNote: '',
    influencedState: 'unquantified' as ValueState, influencedNote: '', evidence: '', confidence: '80',
  })
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal need-modal outcome-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Eyebrow>RECORD OUTCOME</Eyebrow><h2>What actually happened?</h2>
        <p>Record the evidence. If the value is not known, say so.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="need-form">
        <label><span>01 / Type</span>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as OutcomeType })}>
            {outcomeTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label><span>02 / Headline</span><textarea rows={2} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Pilot agreed at a 140-person fabricator" /></label>
        <label><span>03 / Person involved</span>
          <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}>
            <option value="">None</option>
            {net.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
        <label><span>04 / System involved</span>
          <select value={form.systemId} onChange={e => setForm({ ...form, systemId: e.target.value })}>
            <option value="">None</option>
            {platform.systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label><span>05 / Company</span><textarea rows={1} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Optional" /></label>
        <label><span>06 / Direct value</span>
          <div className="outcome-field">
          <select value={form.directState} onChange={e => setForm({ ...form, directState: e.target.value as ValueState })}>
            <option value="known">known</option><option value="modeled">modelled</option><option value="unquantified">unquantified</option>
          </select>
          <textarea rows={2} value={form.directNote} onChange={e => setForm({ ...form, directNote: e.target.value })} placeholder="Number and source" aria-describedby="outcome-direct-hint" />
          <small id="outcome-direct-hint" className="outcome-hint">State the number and where it came from, or why it is not measurable.</small></div></label>
        <label><span>07 / Influenced value</span>
          <div className="outcome-field">
          <select value={form.influencedState} onChange={e => setForm({ ...form, influencedState: e.target.value as ValueState })}>
            <option value="known">known</option><option value="modeled">modelled</option><option value="unquantified">unquantified</option>
          </select>
          <textarea rows={2} value={form.influencedNote} onChange={e => setForm({ ...form, influencedNote: e.target.value })} placeholder="Second-order effect" aria-describedby="outcome-influenced-hint" />
          <small id="outcome-influenced-hint" className="outcome-hint">Second-order effect, if any.</small></div></label>
        <label><span>08 / Evidence</span><textarea rows={2} value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} placeholder="What proves this happened?" /></label>
      </div>
      <footer><Btn kind="quiet" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!form.headline.trim()} onClick={() => {
          platform.recordOutcome({
            type: form.type, headline: form.headline.trim(),
            ...(form.memberId ? { memberId: form.memberId } : {}),
            ...(form.systemId ? { systemId: form.systemId } : {}),
            ...(form.company.trim() ? { companyName: form.company.trim() } : {}),
            directValue: { state: form.directState, note: form.directNote.trim() || 'Not stated.' },
            influencedValue: { state: form.influencedState, note: form.influencedNote.trim() || 'Not stated.' },
            evidence: form.evidence.trim() || 'Recorded by you.',
            confidence: Number(form.confidence) || 80,
          })
          onClose()
        }}><Send size={15} /> Record outcome</Btn></footer>
    </div>
  </div>
}
