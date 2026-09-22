import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { ArrowRight, BrainCircuit, Globe2, LayoutGrid, LockKeyhole, ShieldCheck, Smartphone, Zap } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import landingPortraitAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'
import showcaseAsset from '@/assets/one-connected-system.png.asset.json'

import { foundingStats, joinWaitlist, useAccess, type FoundingStats } from './access'

/** Public front page. The root URL always remains the public Aetheris page. */
export default function Landing() {
  const { access } = useAccess()
  return <LandingPage signedIn={access.signedIn} />
}

function JoinBand({ signedIn }: { signedIn: boolean }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [stats, setStats] = useState<FoundingStats | null>(null)
  useEffect(() => { void foundingStats().then(setStats) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || state === 'sending') return
    setState('sending')
    try { await joinWaitlist(email.trim().toLowerCase(), name.trim()); setState('done') }
    catch { setState('error') }
  }

  const remaining = stats ? Math.max(stats.capacity - stats.approved, 0) : null

  return (
    <section className="lv-join" id="whitelist">
      <div className="lv-join-copy">
        <span>THE FOUNDING 1,000 · WHITELIST</span>
        <h2>Join the <em>whitelist.</em></h2>
        <p>Ask Intros opens to 1,000 founding members. Add your name and we review it against the standard: CEOs, founders, owners, managing partners and principal operators. Verified people only — that is what makes an introduction here worth taking.</p>
        <ul>
          <li><i />Reviewed by a person, not a signup form</li>
          <li><i />Double opt-in introductions, always</li>
          <li><i />No spam, no selling your attention</li>
        </ul>
      </div>
      <form className="lv-join-form" onSubmit={e => void submit(e)}>
        {remaining != null && <span className="lv-join-count">{remaining.toLocaleString()} FOUNDING PLACES REMAINING</span>}
        {state === 'done'
          ? <>
              <p className="lv-join-ok">You're on the whitelist. We'll email {email} when your place is ready.</p>
              <Link to="/demo" className="btn primary">Explore the demo now <ArrowRight size={15} /></Link>
            </>
          : <>
              <label><b>NAME</b><input value={name} onChange={e => setName(e.target.value)} placeholder="Joseph Toney" autoComplete="name" /></label>
              <label><b>WORK EMAIL</b><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
              <button className="btn primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Adding you…' : 'Request whitelist access'}</button>
              {state === 'error' && <small>That didn't go through. Please check the email and try again.</small>}
              {!signedIn && <Link to="/demo" className="lv-join-demo">Or try the demo first <ArrowRight size={13} /></Link>}
              <small>Ready now? <Link to="/early-access" className="lv-join-demo" style={{ display: 'inline-flex' }}>Create an account</Link></small>
            </>}
      </form>
    </section>
  )
}

const capabilityCards = [
  { id: 'context', icon: BrainCircuit, title: 'Active Memory', copy: 'Living context that remembers what matters across relationships, asks and conversations.', visual: 'memory', featured: true },
  { id: 'adapt', icon: LayoutGrid, title: 'One adaptive workspace', copy: 'Social View, CRM, Grid and Calendar move as one connected system.', visual: 'layout' },
  { id: 'network', icon: Globe2, title: 'Relationship network', copy: 'See the people, warm paths and mutual context already around you.', visual: 'network', featured: true },
  { id: 'timing', icon: Zap, title: 'Why now', copy: 'Timely signals surface the conversations and opportunities ready for action.', visual: 'signal' },
  { id: 'trust', icon: ShieldCheck, title: 'Trust by design', copy: 'Verified membership, private defaults and double opt-in introductions.', visual: 'security', wide: true },
  { id: 'mobile', icon: Smartphone, title: 'Ready wherever you lead', copy: 'A focused operating view that stays useful on every screen.', visual: 'mobile', wide: true },
] as const

function CapabilityVisual({ visual }: { visual: typeof capabilityCards[number]['visual'] }) {
  if (visual === 'memory') return <div className="lv-cap-type" aria-hidden="true"><span>Who</span><em>Why</em><b>Now</b></div>
  if (visual === 'layout') return <div className="lv-cap-layout" aria-hidden="true"><i /><i /><i /></div>
  if (visual === 'network') return <div className="lv-cap-network" aria-hidden="true"><Globe2 /><i /><i /><i /><i /></div>
  if (visual === 'signal') return <div className="lv-cap-speed" aria-hidden="true"><strong>NOW</strong><span><i /></span></div>
  if (visual === 'security') return <div className="lv-cap-locks" aria-hidden="true"><span><LockKeyhole /></span><span><LockKeyhole /></span><span><LockKeyhole /></span></div>
  return <div className="lv-cap-phone" aria-hidden="true"><Smartphone /><span /></div>
}

function Capabilities() {
  return <section className="lv-capabilities" aria-labelledby="capabilities-title">
    <header>
      <span>ONE CONNECTED SYSTEM</span>
      <h2 id="capabilities-title">Built around the way relationships <em>actually move.</em></h2>
      <p>Not another wall of disconnected tools. Ask Intros keeps people, context, timing and action together.</p>
    </header>
    <div className="lv-cap-grid">
      {capabilityCards.map(({ id, icon: Icon, title, copy, visual, featured, wide }, index) => <article
        key={id}
        className={`${featured ? 'featured' : ''} ${wide ? 'wide' : ''}`}
        style={{ '--cap-index': index } as React.CSSProperties}
      >
        <CapabilityVisual visual={visual} />
        <div className="lv-cap-copy"><h3><Icon size={18} />{title}</h3><p>{copy}</p></div>
      </article>)}
    </div>
  </section>
}

function LandingPage({ signedIn }: { signedIn: boolean }) {
  const showDemo = !signedIn
  const demoBtn = (label: string, cls: string) => showDemo
    ? <Link to="/demo" className={cls}>{label} <ArrowRight size={15} /></Link>
    : null
  const accountBtn = (cls: string) => <Link to={signedIn ? '/app' : '/early-access'} className={cls}>{signedIn ? 'Enter your network' : 'Join the whitelist'}</Link>
  const loginBtn = (cls: string) => signedIn ? null : <Link to="/auth" search={{ next: '/' }} className={cls}>Log in</Link>

  return (
    <main className="lv">
      {/* ── Top strip: WHY ME · WHY THEM · WHY NOW ── */}
      <div className="lv-topstrip" aria-hidden="true">
        <span className="t-orange">WHY ME</span>
        <i>·</i>
        <span className="t-blue">WHY THEM</span>
        <i>·</i>
        <span className="t-orange">WHY NOW</span>
      </div>

      {/* ── Section 1: Black hero ── */}
      <header className="lv-nav">
        <div className="brand-mark">
          <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
          <span className="brand-name">Ask<em>Intros</em></span>
        </div>
        <nav>PEOPLE&nbsp;&nbsp;|&nbsp;&nbsp;IDEAS&nbsp;&nbsp;|&nbsp;&nbsp;OPPORTUNITIES</nav>
        <div className="lv-nav-actions">
          {demoBtn('Demo', 'btn primary')}
          {loginBtn('btn ghost')}
          {accountBtn(showDemo ? 'btn primary' : 'btn primary')}
        </div>
      </header>

      <section className="lv-hero">
        <div className="lv-hero-copy">
          <span className="lv-hero-topright">ASK INTROS</span>
          <h1><span>Ask Intros</span><em>The Relationship Network for CEOs.</em></h1>
          <p className="lv-hero-sub">Who matters. Why they matter. Why now.</p>
          <span className="lv-hero-scale">RELATIONSHIPS · INTELLIGENCE · OPPORTUNITY</span>
          <div className="lv-hero-actions">
            {demoBtn('Demo the system', 'btn primary')}
            {loginBtn('btn ghost')}
            {accountBtn(showDemo ? 'btn primary' : 'btn primary')}
          </div>
          <Link to="/founder-story" className="lv-founder-link">Read My Story <ArrowRight size={14} /></Link>
        </div>
        <div className="lv-hero-visual">
          <img src={landingPortraitAsset.url} alt="A professional in quiet thought beside hard window light" />
        </div>
      </section>

      <section className="lv-quote" aria-label="Ask Intros principle">
        <blockquote>You&rsquo;re defined by the people you surround yourself with.</blockquote>
      </section>

      <JoinBand signedIn={signedIn} />



      <section className="lv-founder-band">
        <span>FOUNDER CONTEXT / WHY ME</span>
        <p>Before Aetheris was software, it was a lifetime of learning how people, systems, pressure, failure, and responsibility connect.</p>
        <Link to="/founder-story">Read My Story <ArrowRight size={15} /></Link>
      </section>

      {/* ── Section 2: Ivory WHY ME / WHY YOU / WHY NOW ── */}
      <section className="lv-why">
        <div className="lv-why-label">Answering The:</div>
        <div className="lv-why-articles">
          <article className="orange">
            <span>WHY ME</span>
            <i />
            <p>Unique blend of business, AI, and real-world execution. Built by an operator who understands what actually works.</p>
          </article>
          <article className="blue">
            <span>WHY YOU</span>
            <i />
            <p>Access to the right people, opportunities, and know-how. A trusted, curated network built for a serious outcome.</p>
          </article>
          <article className="orange">
            <span>WHY NOW</span>
            <i />
            <p>The world is more connected but more fragmented than ever. The biggest opportunities go to those who move first.</p>
          </article>
        </div>
      </section>

      {/* ── Showcase: One Connected System for CEOs ── */}
      <section className="lv-showcase">
        <div className="lv-showcase-plate">
          <img src={showcaseAsset.url} alt="One Connected System for CEOs — the tools companies pay for separately, now native inside Ask Intros" />
        </div>
        <div className="lv-showcase-foot">
          <p>Instead of paying for disconnected tools, Intros gives you <b>one native system.</b></p>
        </div>
      </section>

      <Capabilities />


      <footer className="lv-legal">
        <div className="brand-mark">
          <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
          <span className="brand-name">Ask<em>Intros</em></span>
        </div>
        <span><LockKeyhole size={12} />No spam. No selling your attention. Private by default.</span>
        <span>© 2026 Aetheris</span>
      </footer>
    </main>
  )
}
