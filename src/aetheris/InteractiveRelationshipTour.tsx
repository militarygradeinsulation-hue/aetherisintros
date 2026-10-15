import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Compass, Play, RotateCcw, X } from 'lucide-react'
import { boundedJourneyIndex, JOURNEY_STEPS } from './demo-journey'
import './demo-journey.css'

/** Public explorable story. Does not interact with signed-in accounts or demo records. */
export function InteractiveRelationshipTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const id = useId()
  const launcher = useRef<HTMLButtonElement>(null)
  const close = () => { setOpen(false); launcher.current?.focus() }

  useEffect(() => {
    if (!open) return
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open])

  const current = JOURNEY_STEPS[boundedJourneyIndex(step)]!
  const last = step === JOURNEY_STEPS.length - 1
  return <aside className="journey-shell" aria-label="Ask Intros guided product walkthrough">
    {!open && <button ref={launcher} type="button" className="journey-launcher"
      aria-controls={id} aria-expanded={false} onClick={() => setOpen(true)}>
      <span className="journey-launcher-label"><Compass size={17} aria-hidden="true" /> <span>Explore the business journey</span></span><span className="journey-launcher-cue">7-step walkthrough <Play size={13} aria-hidden="true" /></span>
    </button>}
    {open && <section id={id} className="journey-panel" aria-label="Interactive fictional Ask Intros walkthrough">
      <header className="journey-head">
        <div><span>ASK INTROS / PRODUCT EXPERIENCE</span><strong>From intent to evidence.</strong></div>
        <button type="button" className="journey-close" onClick={close} aria-label="Close guided tour"><X size={20} /></button>
      </header>
      <p className="journey-disclaimer">Fictional demonstration. Names, companies, projects and results in this tour are illustrative, not member records or verified customer claims.</p>
      <nav aria-label="Walkthrough chapters" className="journey-stages">
        {JOURNEY_STEPS.map((item, i) => <button key={item.id} type="button"
          onClick={() => setStep(i)} aria-current={i===step?'step':undefined}
          className={i===step ? 'active' : i<step ? 'visited' : ''}>
          <span>{i<step ? <Check size={13} aria-hidden="true"/> : String(i+1).padStart(2,'0')}</span>
          <small>{item.label}</small>
        </button>)}
      </nav>
      <div className="journey-body" aria-live="polite" aria-atomic="true">
        <div className="journey-eyebrow">{current.eyebrow}</div>
        <h2>{current.headline}</h2>
        <p>{current.explanation}</p>
        <div className="journey-evidence"><small>ILLUSTRATIVE BUSINESS CONTEXT</small><p>{current.evidence}</p></div>
        <div className="journey-result"><small>CONNECTED RESULT</small><p>{current.outcome}</p></div>
      </div>
      <footer className="journey-footer">
        <span className="journey-count">{step+1} of {JOURNEY_STEPS.length}</span>
        <div>
          <button type="button" onClick={() => setStep(s => Math.max(s-1,0))}
            disabled={step===0}><ArrowLeft size={15}/> Previous</button>
          {last ? <button type="button" className="journey-next" onClick={() => setStep(0)}>
            <RotateCcw size={15}/> Replay
          </button> : <button type="button" className="journey-next" onClick={() => setStep(s => boundedJourneyIndex(s+1))}>
            Next <ArrowRight size={15}/>
          </button>}
        </div>
      </footer>
      <p className="journey-footnote">Explore the working sample network underneath this guide. Real introductions and meeting requests require authorization and mutual consent.</p>
    </section>}
  </aside>
}
