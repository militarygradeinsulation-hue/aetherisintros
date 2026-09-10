import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { usePlatform } from '../platform'
import { useMoat } from '../moat-store'
import { useNav } from '../nav'
import { Eyebrow, Head } from '../ui'
import { EvidenceLink } from '../os-ui'
import { attributionSummary, tracePath } from '../domain/moat-engine'

export function AttributionPage() {
  const platform = usePlatform()
  const moat = useMoat()
  const nav = useNav()
  const traced = [...new Set(moat.attribution.map(e => e.outcomeId))]
  const [outcomeId, setOutcomeId] = useState(traced[0] ?? '')
  const path = tracePath(moat.attribution, outcomeId)
  const summary = attributionSummary(moat.attribution, outcomeId)
  const outcome = platform.outcomes.find(o => o.id === outcomeId)

  return <>
    <Head
      label="OUTCOME ATTRIBUTION"
      title="Where this actually came from."
      copy="Most networks claim credit. Aetheris traces it: which conversation, which introduction, which circle, which system and which piece of context each outcome genuinely came from — including the parts that only influenced it."
      proof={`${traced.length} outcomes traced · direct, influenced and contextual contribution shown separately`}
    />

    <nav className="lane-row" role="tablist" aria-label="Traced outcomes">
      {traced.map(id => <button key={id} role="tab" aria-selected={outcomeId === id} className={outcomeId === id ? 'on' : ''} onClick={() => setOutcomeId(id)}>
        {platform.outcomes.find(o => o.id === id)?.headline ?? id}
      </button>)}
    </nav>

    <section className="module attribution">
      <header><div><Eyebrow signal>ORIGIN</Eyebrow>
        <h3>{outcome?.headline ?? 'Outcome'}</h3>
        <p>It started with {summary.origin}, {summary.steps} traceable steps ago.</p></div>
        <div className="attribution-counts">
          <span><b>{summary.direct}</b> direct</span><span><b>{summary.influenced}</b> influenced</span><span><b>{summary.contextual}</b> contextual</span>
        </div>
      </header>
      <ol className="attribution-path">
        {path.map(edge => <li key={edge.id} className={edge.contribution}>
          <span className="step">{edge.step}</span>
          <div>
            <strong>{edge.fromLabel} <ArrowRight size={12} /> {edge.toLabel}</strong>
            <small>{edge.fromKind} to {edge.toKind} · {edge.contribution} · {edge.when}</small>
            <p>{edge.note}</p>
            <EvidenceLink ids={edge.evidenceIds} label="Evidence for this step" />
          </div>
        </li>)}
        {!path.length && <li className="quiet-empty">Not traced yet.</li>}
      </ol>
      <footer className="attribution-foot">
        <button className="text-action" onClick={() => nav.setPage('outcomes')}>Open outcomes <ArrowRight size={13} /></button>
        <button className="text-action" onClick={() => nav.setPage('timemachine')}>See what compounded over time <ArrowRight size={13} /></button>
      </footer>
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY THIS MATTERS</Eyebrow>
        <h2>Credit shapes behaviour.</h2>
        <p>When you can see that a closed outcome began with a system you gave away eighteen months ago, generosity stops looking like a cost. Attribution is how Aetheris proves that relationships compound.</p></div>
    </section>
  </>
}
