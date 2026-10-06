import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import landingPortraitAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'
import showcaseAsset from '@/assets/one-connected-system.png.asset.json'

import { useAccess } from './access'

import { CinematicFooter } from './CinematicFooter'
import ParticleDrift from './ParticleDrift'
import ConstellationField from './ConstellationField'
import { AskIntrosLockup } from './AskIntrosLockup'
import SerenityAmbient from './SerenityAmbient'

/** Public front page. The root URL always remains the public Aetheris page. */
export default function Landing() {
  const { access } = useAccess()
  return <LandingPage signedIn={access.signedIn} />
}

/** Gold Ask Intros rule: a thin line with the node dot almost at the end. No counts shown. */
function ScarcityLine({ label, tone = 'light' }: { label: string; tone?: 'light' | 'dark' }) {
  return <div className={`lv-scarcity lv-scarcity-${tone}`} role="img" aria-label={label}>
    <span className="lv-scarcity-rule" aria-hidden="true"><i /><b /></span>
    <span className="lv-scarcity-label">{label}</span>
  </div>
}


type CapabilityCard = {
  id: string
  icon: typeof BrainCircuit
  title: string
  copy: string
  visual: 'memory' | 'layout' | 'network' | 'signal' | 'security' | 'mobile'
  featured?: boolean
  wide?: boolean
}

const capabilityCards: CapabilityCard[] = [
  { id: 'context', icon: BrainCircuit, title: 'Active Memory', copy: 'Living context that remembers what matters across relationships, asks and conversations.', visual: 'memory', featured: true },
  { id: 'adapt', icon: LayoutGrid, title: 'One adaptive workspace', copy: 'Social View, CRM, Grid and Calendar move as one connected system.', visual: 'layout' },
  { id: 'network', icon: Globe2, title: 'Relationship network', copy: 'See the people, warm paths and mutual context already around you.', visual: 'network', featured: true },
  { id: 'timing', icon: Zap, title: 'Why now', copy: 'Timely signals surface the conversations and opportunities ready for action.', visual: 'signal' },
  { id: 'trust', icon: ShieldCheck, title: 'Trust by design', copy: 'Verified membership, private defaults and double opt-in introductions.', visual: 'security', wide: true },
  { id: 'mobile', icon: Smartphone, title: 'Ready wherever you lead', copy: 'A focused operating view that stays useful on every screen.', visual: 'mobile', wide: true },
] 

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
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
          e.currentTarget.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
        }}
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
  const accountBtn = (cls: string) => signedIn
    ? <Link to="/app" className={cls}>Enter your network</Link>
    : <><Link to="/early-access" className={cls}>Request whitelist access</Link><Link to="/auth" className="btn ghost">Member log in</Link></>

  return (
    <main className="lv">
      <SerenityAmbient />
      {/* ── Manifesto band ── */}
      <div className="lv-manifesto" aria-label="Ask Intros manifesto">
        <p>Stop using LinkedIn, Facebook, HubSpot, Salesforce, and every other system that just creates chaos.</p>
      </div>


      {/* ── Top strip: WHY ME · WHY THEM · WHY NOW ── */}
      <div className="lv-topstrip" aria-hidden="true">
        <span className="t-orange">WHY ME</span>
        <i>·</i>
        <span className="t-blue">WHY THEM</span>
        <i>·</i>
        <span className="t-orange">WHY NOW</span>
      </div>

      {/* ── Section 1: Black hero ── */}

      <CinematicFooter />

      <section className="lv-hero">
        <ParticleDrift className="lv-hero-drift" />
        <div className="lv-hero-copy">
          <AskIntrosLockup variant="hero" />
          <h1 className="lv-hero-words"><span className="word-animate" style={{ animationDelay: '100ms' }}>Join</span> <span className="word-animate" style={{ animationDelay: '260ms' }}>the</span> <em className="word-animate" style={{ animationDelay: '420ms' }}>whitelist.</em></h1>
          <ScarcityLine label="LAUNCHING SOON — FOUNDING PLACES ALMOST FILLED" tone="dark" />
          <div className="lv-hero-actions">
            {demoBtn('Demo the system', 'btn ghost')}
            {accountBtn('btn primary')}
          </div>
          <Link to="/founder-story" className="lv-founder-link">Read My Story <ArrowRight size={14} /></Link>
        </div>
        <div className="lv-hero-visual">
          <img src={landingPortraitAsset.url} alt="A professional in quiet thought beside hard window light" />
        </div>
      </section>

      <section className="lv-quote" aria-label="Ask Intros principle">
        <ConstellationField className="lv-quote-constellation" />
        <blockquote>You&rsquo;re defined by the people you surround yourself with.</blockquote>
      </section>

      <section aria-label="Ask Intros film" style={{ background: '#0B0D0F', padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', border: '1px solid rgba(255,255,255,.10)', borderRadius: 10, overflow: 'hidden', aspectRatio: '16 / 9', background: '#000' }}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/i6L7DUU-1WA?rel=0"
            title="Ask Intros video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
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
    </main>
  )
}
