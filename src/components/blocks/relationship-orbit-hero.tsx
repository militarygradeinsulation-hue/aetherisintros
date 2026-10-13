import { useEffect, useState } from 'react'
import { ArrowRight, Check, Play, X } from 'lucide-react'

export type RelationshipOrbitStep = { label: string; detail: string }

type RelationshipOrbitHeroProps = {
  titleTop: string
  accents: string[]
  description: string
  primaryLabel: string
  onPrimary: () => void
  steps: RelationshipOrbitStep[]
}

/**
 * A lightweight, local adaptation of the supplied ink-orbit hero. The visual
 * represents a relationship field, not a data source or a promise of results.
 */
export function RelationshipOrbitHero({ titleTop, accents, description, primaryLabel, onPrimary, steps }: RelationshipOrbitHeroProps) {
  const [word, setWord] = useState(0)
  const [dialog, setDialog] = useState(false)
  const [seed, setSeed] = useState(1)

  useEffect(() => {
    if (accents.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setWord(value => (value + 1) % accents.length), 3600)
    return () => window.clearInterval(timer)
  }, [accents.length])

  return <section className="relationship-orbit" aria-label="How Ask Intros works">
    <div className="relationship-orbit-copy">
      <span className="relationship-orbit-kicker">ASK INTROS / RELATIONSHIP INTELLIGENCE</span>
      <h2><span>{titleTop}</span><em key={word}>{accents[word] ?? ''}</em></h2>
      <p>{description}</p>
      <div className="relationship-orbit-actions">
        <button className="relationship-orbit-primary" onClick={onPrimary}>{primaryLabel}<ArrowRight size={15} /></button>
        <button className="relationship-orbit-secondary" onClick={() => setDialog(true)}><Play size={13} fill="currentColor" /> See the path</button>
      </div>
      <small>Recommendations remain explainable. Introductions require consent from both sides.</small>
    </div>
    <RelationshipField seed={seed} onReforge={() => setSeed(value => value + 1)} />
    {dialog && <PathDialog steps={steps} onClose={() => setDialog(false)} />}
  </section>
}

function RelationshipField({ seed, onReforge }: { seed: number; onReforge: () => void }) {
  const nodes = Array.from({ length: 20 }, (_, index) => {
    const angle = ((index * 137.5 + seed * 23) * Math.PI) / 180
    const radius = 23 + ((index * 17 + seed * 11) % 51)
    return { x: 50 + Math.cos(angle) * radius * 0.5, y: 50 + Math.sin(angle) * radius * 0.42, r: index % 5 === 0 ? 3.4 : 1.5 + (index % 3) * 0.45 }
  })
  return <div className="relationship-orbit-art">
    <button className="relationship-orbit-reforge" onClick={onReforge}>Reframe the field</button>
    <svg viewBox="0 0 100 100" role="img" aria-label="An abstract field of connected relationship signals">
      <defs><radialGradient id="relationship-orbit-glow"><stop stopColor="#f4a125" stopOpacity=".65" /><stop offset="1" stopColor="#f4a125" stopOpacity="0" /></radialGradient></defs>
      <circle cx="50" cy="50" r="43" fill="url(#relationship-orbit-glow)" opacity=".22" />
      <circle cx="50" cy="50" r="30" className="relationship-orbit-ring" /><circle cx="50" cy="50" r="18" className="relationship-orbit-ring relationship-orbit-ring-inner" />
      {nodes.slice(1).map((node, index) => <line key={`line-${index}`} x1="50" y1="50" x2={node.x} y2={node.y} className="relationship-orbit-line" />)}
      {nodes.map((node, index) => <circle key={`node-${index}`} cx={node.x} cy={node.y} r={node.r} className={index % 5 === 0 ? 'relationship-orbit-node is-signal' : 'relationship-orbit-node'} />)}
      <circle cx="50" cy="50" r="5.8" className="relationship-orbit-core" />
    </svg>
    <div className="relationship-orbit-hud"><span>CONTEXT · TRUST · TIMING</span><span>FIELD {String(seed).padStart(2, '0')}</span></div>
  </div>
}

function PathDialog({ steps, onClose }: { steps: RelationshipOrbitStep[]; onClose: () => void }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])
  return <div className="relationship-orbit-modal" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-label="Ask Intros relationship path">
      <header><div><span>THE RELATIONSHIP PATH</span><h3>Useful before access.</h3></div><button onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <ol>{steps.map((step, index) => <li key={step.label} className={index <= active ? 'complete' : ''}>
        <button onClick={() => setActive(index)}><i>{index < active ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</i><span><b>{step.label}</b><small>{step.detail}</small></span></button>
      </li>)}</ol>
      <footer><span>Nothing is sent or shared without the appropriate permission.</span><button onClick={() => setActive(value => Math.min(steps.length - 1, value + 1))} disabled={active >= steps.length - 1}>Next <ArrowRight size={14} /></button></footer>
    </section>
  </div>
}
