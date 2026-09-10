import { useState } from 'react'
import { Eyebrow, Head } from '../ui'
import { useOS } from '../os-store'
import { EvidenceRow } from '../os-ui'
import type { EvidenceCategory } from '../domain/os-models'

const categories: Array<'All' | EvidenceCategory> = ['All', 'Known', 'Observed', 'Derived', 'Uncertain']

export function EvidenceLedgerPage() {
  const os = useOS()
  const [cat, setCat] = useState<'All' | EvidenceCategory>('All')
  const items = [...os.evidence]
    .filter(e => cat === 'All' || e.category === cat)
    .sort((a, b) => b.date.localeCompare(a.date))

  const count = (c: EvidenceCategory) => os.evidence.filter(e => e.category === c).length

  return <>
    <Head
      label="EVIDENCE LEDGER"
      title="Every recommendation can be opened."
      copy="Intros will not tell you something it cannot show you. Each item names its source, its date, its confidence and whether it can leave your private view."
      proof={`${count('Known')} known · ${count('Observed')} observed · ${count('Derived')} derived · ${count('Uncertain')} uncertain`}
    />
    <nav className="lane-row" role="tablist" aria-label="Evidence categories">
      {categories.map(c => <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}
    </nav>
    <ul className="evidence-list ledger">{items.map(e => <EvidenceRow key={e.id} item={e} />)}</ul>
    <section className="teach-block">
      <div><Eyebrow>THE HONESTY RULE</Eyebrow>
        <h2>Uncertainty is recorded, not hidden.</h2>
        <p>Anything Intros does not know is filed as Uncertain and stays visible. Private raw sources are never quoted across a permission boundary — you see that a source exists and how much it is worth.</p>
      </div>
      <ul className="teach-points">
        <li><b>Known</b><span>Stated directly by a person or a document.</span></li>
        <li><b>Observed</b><span>Seen in activity, intents or conversation.</span></li>
        <li><b>Derived</b><span>Inferred by Intros, with its confidence shown.</span></li>
        <li><b>Uncertain</b><span>Unverified. Treated as a question, not a fact.</span></li>
      </ul>
    </section>
  </>
}
