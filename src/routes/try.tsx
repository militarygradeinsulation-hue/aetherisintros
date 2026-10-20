import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { AppearanceToggle } from '@/aetheris/AppearanceToggle'
import {
  buildOpportunityPreview, opportunityGoal, opportunityGoals,
  type OpportunityFields, type OpportunityGoal,
} from '@/aetheris/opportunity-preview'
import '@/aetheris/opportunity-preview.css'

export const Route = createFileRoute('/try')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Try Ask Intros in 30 Seconds — Opportunity Preview' },
      { name: 'description', content: 'Pick a business goal, turn it into a clear introduction request, and see a sample permission-based path forward. Free, no sign-in needed.' },
      { property: 'og:title', content: 'What could Ask Intros help you do?' },
      { property: 'og:description', content: 'A free, private 30-second preview of how Ask Intros turns business goals into intentional introductions.' },
      { property: 'og:url', content: 'https://askintros.vip/try' },
      { property: 'og:type', content: 'website' },
    ],
    links: [{ rel: 'canonical', href: 'https://askintros.vip/try' }],
  }),
  component: OpportunityPreviewPage,
})

function OpportunityPreviewPage() {
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  const [goalId, setGoalId] = useState<OpportunityGoal>('customers')
  const [fields, setFields] = useState<OpportunityFields>(() => {
    const first = opportunityGoals[0]
    return { outcome: first.outcome, people: first.people, offer: first.offer }
  })
  const [copied, setCopied] = useState(false)
  const preview = useMemo(() => buildOpportunityPreview(goalId, fields), [goalId, fields])

  const chooseGoal = (id: OpportunityGoal) => {
    const picked = opportunityGoal(id)
    setGoalId(id)
    setFields({ outcome: picked.outcome, people: picked.people, offer: picked.offer })
    setCopied(false)
  }
  const edit = (key: keyof OpportunityFields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }))
    setCopied(false)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(preview.ask)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return <main className="ai-try">
    <header className="ai-try-top">
      <Link to="/" className="ai-try-logo" aria-label="Ask Intros home">ASK <span>INTROS</span></Link>
      <div className="ai-try-header-actions"><AppearanceToggle /><Link to="/" className="ai-try-back"><ArrowLeft size={16} aria-hidden="true" /> Back home</Link></div>
    </header>

    <div className="ai-try-container">
      <div className="ai-try-heading">
        <span className="ai-try-eyebrow">01 / SEE THE VALUE BEFORE YOU SIGN UP</span>
        <h1>One goal.<br /><em>A better next move.</em></h1>
        <p>What would you actually use Ask Intros for? Try a real-world workflow in about 30 seconds. No account, no imported contacts, no commitment.</p>
      </div>

      <div className="ai-try-layout">
        <section className="ai-try-builder" aria-labelledby="ai-try-build-heading" aria-busy={!ready}>
          <h2 id="ai-try-build-heading">Start with what matters.</h2>
          <fieldset className="ai-try-goals">
            <legend>Choose a business goal</legend>
            <div className="ai-try-goal-grid">
              {opportunityGoals.map((item, index) =>
                <button key={item.id} type="button" className={goalId === item.id ? 'ai-try-goal selected' : 'ai-try-goal'}
                  aria-pressed={goalId === item.id} disabled={!ready} onClick={() => chooseGoal(item.id)}>
                  <span className="ai-try-goal-num">0{index + 1}</span>
                  <span><strong>{item.title}</strong><small>{item.label}</small></span>
                </button>
              )}
            </div>
          </fieldset>

          <div className="ai-try-fields">
            <label htmlFor="ai-try-outcome">What are you trying to accomplish?</label>
            <textarea id="ai-try-outcome" rows={2} maxLength={180} value={fields.outcome} disabled={!ready}
              onChange={e => edit('outcome', e.target.value)} />
            <label htmlFor="ai-try-people">Who could help?</label>
            <textarea id="ai-try-people" rows={2} maxLength={180} value={fields.people} disabled={!ready}
              onChange={e => edit('people', e.target.value)} />
            <label htmlFor="ai-try-offer">What can you bring to the conversation?</label>
            <textarea id="ai-try-offer" rows={2} maxLength={180} value={fields.offer} disabled={!ready}
              onChange={e => edit('offer', e.target.value)} />
          </div>
          <button className="ai-try-reset" type="button" disabled={!ready} onClick={() => chooseGoal(goalId)}>
            <RotateCcw size={14} aria-hidden="true" /> Reset example
          </button>
          <p className="ai-try-privacy">Your edits stay in this page. We don't upload, search, or save them.</p>
        </section>

        <section className="ai-try-output" aria-labelledby="ai-try-output-heading">
          <span className="ai-try-eyebrow">02 / YOUR FIRST USEFUL OUTPUT</span>
          <h2 id="ai-try-output-heading">A clearer ask. Not another cold pitch.</h2>
          <div className="ai-try-draft">
            <span className="ai-try-draft-label">YOUR INTRODUCTION REQUEST · PREVIEW</span>
            <p aria-live="polite">{preview.ask}</p>
            <button className="ai-try-copy" type="button" disabled={!ready} onClick={() => void copy()}>
              {copied ? <Check size={16} aria-hidden="true" /> : <ClipboardCopy size={16} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy this request'}
            </button>
          </div>
          <h3>How Ask Intros could help next</h3>
          <ol className="ai-try-next-steps">
            {preview.steps.map((step, index) =>
              <li key={index}><b>0{index + 1}</b><span>{step}</span></li>
            )}
          </ol>
          <p className="ai-try-disclaimer">{preview.notice}</p>
          <div className="ai-try-actions">
            <Link to="/auth" search={{ mode: 'signup' }} className="ai-try-primary">Create your account <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/demo" className="ai-try-secondary">Explore the actual demo <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>

      <footer className="ai-try-footer">
        <span>WHY ME · WHY THEM · WHY NOW</span>
        <span>Real connections require mutual consent.</span>
      </footer>
    </div>
  </main>
}
