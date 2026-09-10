import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Meter } from '../ui'
import { BandTag } from '../os-ui'
import { strategyProgress } from '../domain/os-engine'
import type { NetworkStrategy } from '../domain/os-models'

export function StrategyPage() {
  const os = useOS()
  const [creating, setCreating] = useState(false)
  return <>
    <Head
      label="PERSONAL NETWORK STRATEGY"
      title="Relationship goals, not connection counts."
      copy="Ten private-equity operating partners by December. Five manufacturing chief executives in Indiana. Intros maps your current network against the network you actually need and shows the missing categories, the credible paths and the next five moves."
      proof={`${os.strategies.length} active strategies · progress measured in relationships and outcomes`}
      action={<Btn onClick={() => setCreating(true)}><Plus size={14} /> New strategy</Btn>}
    />
    <section className="strategy-list">
      {os.strategies.map(s => <StrategyCard key={s.id} strategy={s} />)}
      {!os.strategies.length && <p className="quiet-empty">No strategy yet. Start with the relationships you would regret not having by the end of the year.</p>}
    </section>
    {creating && <CreateStrategy onClose={() => setCreating(false)} />}
  </>
}

export function StrategyCard({ strategy, compact = false }: { strategy: NetworkStrategy; compact?: boolean }) {
  const os = useOS()
  const net = useNetwork()
  const platform = usePlatform()
  const nav = useNav()
  const [step, setStep] = useState('')
  const progress = strategyProgress(strategy, net.members)

  return <article className={`strategy-card ${compact ? 'compact' : ''}`}>
    <header>
      <div><Eyebrow>{strategy.relationshipType || 'RELATIONSHIP GOAL'}</Eyebrow><h3>{strategy.goal}</h3>
        <small>{[strategy.industry, strategy.geography, strategy.horizon].filter(Boolean).join(' · ')}</small></div>
      <Meter label={`${progress.held.length}/${strategy.targetCount}`} value={progress.percent} />
    </header>

    {!compact && <div className="strategy-grid">
      <section>
        <Eyebrow>RELATIONSHIPS HELD</Eyebrow>
        <ul className="strategy-people">
          {progress.held.map(p => <li key={p.id}><button onClick={() => nav.openMember(p)}><Face person={p} /><span>{p.name}</span></button></li>)}
          {!progress.held.length && <li className="quiet-empty">None counted yet.</li>}
        </ul>
      </section>
      <section>
        <Eyebrow>CLOSEST CANDIDATES</Eyebrow>
        <ul className="strategy-people">
          {progress.candidates.map(p => <li key={p.id}>
            <button onClick={() => nav.openMember(p)}><Face person={p} /><span><b>{p.name}</b><em>{p.company}</em></span></button>
            <Btn kind="quiet" onClick={() => os.updateStrategy(strategy.id, { progressPersonIds: [...strategy.progressPersonIds, p.id] })}>Count</Btn>
          </li>)}
        </ul>
      </section>
      <section>
        <Eyebrow signal>GAPS</Eyebrow>
        <ul className="strategy-gaps">{[...strategy.gaps, `${progress.missing} relationships still missing.`].map(g => <li key={g}>{g}</li>)}</ul>
      </section>
      <section>
        <Eyebrow>STRONGEST PATHS</Eyebrow>
        <ul className="strategy-paths">{strategy.strongestPaths.map(p => <li key={p.label}>
          <b>{p.label}</b><BandTag value={p.strength} label="Strength" /><em>{p.note}</em>
        </li>)}
        {!strategy.strongestPaths.length && <li className="quiet-empty">No path modelled yet — run a simulation.</li>}</ul>
      </section>
      <section>
        <Eyebrow>SYSTEMS THAT CREATE VALUE FIRST</Eyebrow>
        <ul className="strategy-tags">
          {strategy.systemIds.map(id => {
            const s = platform.systems.find(x => x.id === id)
            return s && <li key={id}><button onClick={() => nav.openSystem(id)}>{s.name}</button></li>
          })}
          {!strategy.systemIds.length && <li className="quiet-empty">Nothing to give yet. Give before you ask.</li>}
        </ul>
        <Eyebrow>PREFERRED CIRCLES</Eyebrow>
        <ul className="strategy-tags">
          {strategy.preferredCircleIds.map(id => {
            const c = platform.circles.find(x => x.id === id)
            return c && <li key={id}><button onClick={() => nav.openCircle(id)}>{c.name}</button></li>
          })}
        </ul>
      </section>
      <section className="wide">
        <Eyebrow>NEXT FIVE MOVES</Eyebrow>
        <ol className="strategy-moves">
          {strategy.nextMoves.slice(0, 8).map(m => <li key={m.id} className={m.done ? 'done' : ''}>
            <button onClick={() => os.toggleStrategyStep(strategy.id, m.id)}>{m.done ? '✓' : '○'}</button>
            <span>{m.text}</span>
            <Btn kind="quiet" onClick={() => {
              const room = os.createRoom({ name: m.text, thesis: strategy.goal, nextAction: m.text })
              nav.openRoom(room.id)
            }}>Open room</Btn>
          </li>)}
        </ol>
        <form onSubmit={e => { e.preventDefault(); if (!step.trim()) return; os.addStrategyStep(strategy.id, { text: step }); setStep('') }}>
          <input value={step} onChange={e => setStep(e.target.value)} placeholder="Add a move…" />
          <Btn kind="secondary">Add</Btn>
        </form>
      </section>
    </div>}
    {strategy.constraints.length > 0 && <footer className="strategy-constraints">{strategy.constraints.join(' · ')}</footer>}
  </article>
}

function CreateStrategy({ onClose }: { onClose: () => void }) {
  const os = useOS()
  const [goal, setGoal] = useState('')
  const [type, setType] = useState('')
  const [industry, setIndustry] = useState('')
  const [geography, setGeography] = useState('')
  const [count, setCount] = useState(5)
  const [horizon, setHorizon] = useState('')
  return <div className="modal-veil" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <header className="modal-head"><div><Eyebrow>NEW STRATEGY</Eyebrow><h3>Which relationships would change your year?</h3></div></header>
      <label>Goal<input value={goal} onChange={e => setGoal(e.target.value)} placeholder="10 PE operating-partner relationships by 31 December" /></label>
      <label>Relationship type<input value={type} onChange={e => setType(e.target.value)} placeholder="Operating partner" /></label>
      <div className="modal-row">
        <label>Industry<input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Private equity" /></label>
        <label>Geography<input value={geography} onChange={e => setGeography(e.target.value)} placeholder="Midwest" /></label>
      </div>
      <div className="modal-row">
        <label>Target count<input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))} /></label>
        <label>Horizon<input value={horizon} onChange={e => setHorizon(e.target.value)} placeholder="By 31 December" /></label>
      </div>
      <div className="modal-actions">
        <Btn kind="quiet" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!goal.trim()} onClick={() => {
          os.createStrategy({
            goal, relationshipType: type, industry, geography, targetCount: count, horizon,
            constraints: ['No mass outreach', 'One ask per connector per month'],
            gaps: ['Network mapping runs as relationships are counted.'],
          })
          onClose()
        }}>Create strategy</Btn>
      </div>
    </div>
  </div>
}
