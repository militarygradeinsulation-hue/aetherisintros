import { useMemo, useState } from 'react'
import { ArrowRight, Pause, Play, Search } from 'lucide-react'
import type { Member } from './social'

/** Floating connection field + network signals, computed only from the member's real network. */
export interface NetworkBubblesProps {
  people: Member[]
  select: (person: Member) => void
}

type Signal = { id: string; kind: 'Blind spot' | 'Unused opportunity' | 'Cooling tie' | 'Cross-cluster bridge'; title: string; detail: string; person: Member }

function initials(name: string) { return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() }

function signalsFor(people: Member[]): Signal[] {
  const out: Signal[] = []
  const byIndustry = new Map<string, Member[]>()
  people.forEach(p => byIndustry.set(p.industry, [...(byIndustry.get(p.industry) ?? []), p]))
  const highFitWeak = [...people].filter(p => p.scoreTotal >= 75 && p.score.relationshipStrength < 50).sort((a, b) => b.scoreTotal - a.scoreTotal)[0]
  if (highFitWeak) out.push({ id: 'blind', kind: 'Blind spot', title: `${highFitWeak.name} fits well but you barely know them`, detail: `Strong match, light relationship. ${highFitWeak.whyNow || highFitWeak.nextAction || ''}`.trim(), person: highFitWeak })
  const offerMatch = people.find(p => p.offers.length && p.score.relationshipStrength >= 60)
  if (offerMatch) out.push({ id: 'unused', kind: 'Unused opportunity', title: `${offerMatch.name} can help with ${offerMatch.offers[0]}`, detail: 'A strong tie with an offer you have not asked for yet.', person: offerMatch })
  const cooling = [...people].filter(p => p.score.relationshipStrength >= 55).sort((a, b) => a.score.relationshipStrength - b.score.relationshipStrength)[0]
  if (cooling && cooling !== offerMatch) out.push({ id: 'cool', kind: 'Cooling tie', title: `Reconnect with ${cooling.name}`, detail: cooling.nextAction || 'A meaningful relationship worth a timely touchpoint.', person: cooling })
  const clusters = [...byIndustry.entries()].filter(([, list]) => list.length).sort((a, b) => b[1].length - a[1].length)
  if (clusters.length > 1) {
    const bridge = [...people].filter(p => p.bestPath.length > 2).sort((a, b) => b.scoreTotal - a.scoreTotal)[0]
    if (bridge) out.push({ id: 'bridge', kind: 'Cross-cluster bridge', title: `${bridge.name} links ${clusters[0]?.[0] ?? 'your core'} and ${bridge.industry}`, detail: `Warm path: ${bridge.bestPath.join(' → ')}`, person: bridge })
  }
  return out
}

export function NetworkBubbles({ people, select }: NetworkBubblesProps) {
  const [q, setQ] = useState('')
  const [industry, setIndustry] = useState('all')
  const [minFit, setMinFit] = useState(0)
  const [paused, setPaused] = useState(false)
  const [spotId, setSpotId] = useState<string | undefined>()
  const industries = useMemo(() => [...new Set(people.map(p => p.industry))].sort(), [people])
  const shown = people.filter(p => (industry === 'all' || p.industry === industry) && p.scoreTotal >= minFit && (!q.trim() || `${p.name} ${p.company} ${p.title}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 24)
  const spot = shown.find(p => p.id === spotId) ?? shown[0]
  const signals = useMemo(() => signalsFor(people), [people])

  return <section className="nb">
    <header className="nb-head">
      <div><span className="nb-eyebrow"><i />LIVE CONNECTION FIELD</span><h2>Floating connection <em>bubbles.</em></h2><p>Your real network, sized by match and lit by relationship strength. Select a bubble to see why they matter now.</p></div>
      <dl><div><dt>Living nodes</dt><dd>{shown.length}</dd></div><div><dt>Top match</dt><dd>{shown.length ? Math.max(...shown.map(p => p.scoreTotal)) : '—'}</dd></div></dl>
    </header>
    <div className="nb-bar">
      <label className="nb-search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or company" aria-label="Search the field" /></label>
      <select value={industry} onChange={e => setIndustry(e.target.value)} aria-label="Industry"><option value="all">All industries</option>{industries.map(i => <option key={i}>{i}</option>)}</select>
      <select value={minFit} onChange={e => setMinFit(Number(e.target.value))} aria-label="Minimum match"><option value={0}>Any match</option><option value={60}>60+</option><option value={75}>75+</option><option value={85}>85+</option></select>
      <button type="button" onClick={() => setPaused(v => !v)} aria-label={paused ? 'Resume motion' : 'Pause motion'}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
    </div>
    <div className="nb-grid">
      <div className={`nb-field${paused ? ' paused' : ''}`}>
        {shown.length ? shown.map((p, i) => {
          const size = 44 + Math.round((p.scoreTotal / 100) * 46)
          const x = 8 + ((i * 37) % 84), y = 10 + ((i * 53) % 78)
          return <button type="button" key={p.id} className={`nb-bubble${spot?.id === p.id ? ' on' : ''}`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, animationDelay: `${-(i % 7)}s`, opacity: .55 + p.score.relationshipStrength / 220 }} onClick={() => setSpotId(p.id)} aria-label={`${p.name}, match ${p.scoreTotal}`}><span>{initials(p.name)}</span></button>
        }) : <p className="nb-empty">No one matches these filters yet.</p>}
      </div>
      <aside className="nb-spot">
        {spot ? <><span className="nb-eyebrow">SPOTLIGHT</span><h3>{spot.name}</h3><p className="nb-role">{spot.title} · {spot.company}</p><div className="nb-score"><b>{spot.scoreTotal}</b><small>match</small><b>{spot.score.relationshipStrength}</b><small>strength</small></div><p>{spot.whyNow || spot.focus}</p><button type="button" className="nb-cta" onClick={() => select(spot)}>Open profile <ArrowRight size={14} /></button></> : <p className="nb-empty">Your field forms as people join your network.</p>}
      </aside>
    </div>
    <div className="nb-signals">
      <span className="nb-eyebrow"><i />WHAT INTROS SEES IN YOUR NETWORK</span>
      {signals.length ? <ul>{signals.map(s => <li key={s.id}><button type="button" onClick={() => select(s.person)}><small>{s.kind}</small><b>{s.title}</b><span>{s.detail}</span></button></li>)}</ul> : <p className="nb-empty">Signals appear once your network has a few relationships.</p>}
    </div>
  </section>
}
