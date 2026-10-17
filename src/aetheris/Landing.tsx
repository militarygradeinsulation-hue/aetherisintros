import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import originalPortrait from '@/assets/aetheris-home-portrait.jpg.asset.json'
import { useAccess } from './access'
import { AskIntrosLockup } from './AskIntrosLockup'
import { AppearanceToggle } from './AppearanceToggle'
import { StencilHeadline } from './StencilHeadline'
import './editorial-landing.css'
import './architectural-system.css'
import './compact-homepage.css'

/**
 * A compact architectural editorial homepage.
 * Photos are illustrative, not member portraits, endorsements or outcomes.
 * Three chapters: hero, experience + process, membership.
 * Navigation and access destinations are unchanged.
 */
const photo = {
  room: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=2400&q=85',
  gathering: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1400&q=85',
  membership: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1700&q=85',
}

function Photo({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return <img
    src={src}
    alt={alt}
    className={className}
    loading={eager ? 'eager' : 'lazy'}
    fetchPriority={eager ? 'high' : 'auto'}
    decoding="async"
    onError={event => { if (event.currentTarget.dataset['fallback'] !== 'true') { event.currentTarget.dataset['fallback'] = 'true'; event.currentTarget.src = originalPortrait.url } }}
  />
}

function JoinAction({ signedIn, className = '' }: { signedIn: boolean; className?: string }) {
  return signedIn
    ? <Link className={className} to="/app">Enter your network <ArrowUpRight aria-hidden="true" size={16} /></Link>
    : <Link className={className} to="/auth" search={{ mode: 'signup' }}>Create your account <ArrowUpRight aria-hidden="true" size={16} /></Link>
}

export default function Landing() {
  const { access } = useAccess()
  const signedIn = access.signedIn

  return <main className="ael ael-compact">
    <a className="ael-skip" href="#ael-main">Skip to content</a>

    <header className="ael-header" aria-label="Ask Intros public navigation">
      <Link to="/" className="ael-logo" aria-label="Ask Intros home">
        <AskIntrosLockup variant="compact" />
      </Link>
      <nav className="ael-nav" aria-label="Primary navigation">
        <a href="#experience">The experience</a>
        <a href="#approach">How it works</a>
        <a href="#membership">Membership</a>
      </nav>
      <div className="ael-header-actions">
        <AppearanceToggle className="ael-appearance" />
        {signedIn ? <Link to="/app" className="ael-signin">My network</Link> : <Link to="/auth" className="ael-signin">Member sign in</Link>}
        <JoinAction signedIn={signedIn} className="ael-nav-cta ai-gradient-button" />
      </div>
    </header>

    <section className="ael-hero" id="ael-main" aria-labelledby="ael-hero-title">
      <Photo src={photo.room} alt="Professionals exchanging ideas during a focused executive meeting" className="ael-hero-image" eager />
      <div className="ael-hero-shade" aria-hidden="true" />
      <div className="ael-architecture-meta" aria-hidden="true"><span>RELATIONSHIPS / BY DESIGN</span><span>ASK INTROS — CONNECTION 001</span></div>
      <div className="ael-hero-content">
        <p className="ael-kicker ael-kicker-light"><span className="ael-dash" /> Relationships by design</p>
        <h1 id="ael-hero-title" className="stencil-display"><span className="sr-only">The right room changes everything.</span><StencilHeadline lines={['THE RIGHT ROOM', 'CHANGES', 'EVERYTHING']} className="stencil-headline--hero" /></h1>
        <p className="ael-hero-lede">The people who matter. A reason to meet. A place to make something happen.</p>
        <div className="ael-hero-actions">
          <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
          <Link to="/demo" className="ael-text-link">Explore Ask Intros <ArrowRight aria-hidden="true" size={16} /></Link>
        </div>
      </div>
      <div className="ael-hero-bottom">
        <span>WHY ME. WHY THEM. WHY NOW.</span>
        <a href="#experience">THE EXPERIENCE <ArrowDownRight aria-hidden="true" size={16} /></a>
        <span>01 / 03</span>
      </div>
    </section>

    <section className="ael-compact-story" id="experience" aria-labelledby="ael-experience-title">
      <div className="ael-compact-story-main">
        <div className="ael-compact-story-copy">
          <div className="ael-editorial-meta"><span>THE PHILOSOPHY</span><span>001 — RELATIONSHIPS WITH PURPOSE</span></div>
          <h2 id="ael-experience-title" className="stencil-display"><span className="sr-only">Not more contacts. Better connections.</span><StencilHeadline lines={['NOT MORE CONTACTS', 'BETTER CONNECTIONS']} /></h2>
          <p>Most networks stop at the introduction. Ask Intros gives each connection a clear purpose, mutual consent and a path to meaningful business.</p>
          <Link className="ael-underlink" to="/founder-story">Why we built it <ArrowUpRight aria-hidden="true" size={16} /></Link>
        </div>
        <figure className="ael-compact-story-photo">
          <Photo src={photo.gathering} alt="A small leadership group collaborating around a meeting table" />
          <figcaption>FIG 02 / CONVERSATIONS WITH PURPOSE</figcaption>
        </figure>
      </div>
      <div className="ael-compact-method" id="approach" aria-labelledby="ael-approach-title">
        <div className="ael-compact-method-heading">
          <span className="ael-fine-label">HOW IT WORKS / THREE MOVES</span>
          <h3 id="ael-approach-title" className="stencil-display"><span className="sr-only">From introduction to impact.</span><StencilHeadline lines={['FROM INTRODUCTION', 'TO IMPACT']} /></h3>
        </div>
        <ol className="ael-compact-steps">
          <li><span>01</span><div><strong>Show your intent</strong><p>What you need, offer or want to build.</p></div></li>
          <li><span>02</span><div><strong>Find the right path</strong><p>Relevant people and introductions by consent.</p></div></li>
          <li><span>03</span><div><strong>Make progress</strong><p>Conversations, meetings and private follow-through.</p></div></li>
        </ol>
        <Link to="/demo" className="ael-underlink ael-underlink-dark">See the experience <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>
    </section>

    <section className="ael-membership ael-compact-membership" id="membership" aria-labelledby="ael-membership-title">
      <Photo src={photo.membership} alt="Business leaders discussing ideas and potential partnerships at a private meeting" className="ael-compact-membership-image" />
      <div className="ael-compact-membership-content">
        <div>
          <span className="ael-fine-label">MEMBERSHIP / ASK INTROS</span>
          <h2 id="ael-membership-title" className="stencil-display"><span className="sr-only">Your next room is waiting.</span><StencilHeadline lines={['YOUR NEXT ROOM', 'IS WAITING']} /></h2>
          <p>Bring a purpose. Meet the right people. Make the connection count.</p>
        </div>
        <div className="ael-membership-actions">
          <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
          {!signedIn && <Link to="/auth" className="ael-text-link">Already a member? Sign in <ArrowRight aria-hidden="true" size={16} /></Link>}
          {!signedIn && <Link to="/early-access" className="ael-text-link">Founding access details <ArrowRight aria-hidden="true" size={16} /></Link>}
        </div>
      </div>
    </section>

    <footer className="ael-compact-footer">
      <Link to="/" className="ael-compact-footer-brand" aria-label="Ask Intros home"><span className="stencil-footer-wordmark" style={{ color: "var(--st-ink)", backgroundColor: "var(--st-bg)" }}>ASK INTROS</span></Link>
      <span>WHY ME · WHY THEM · WHY NOW</span>
      <small>Editorial imagery is illustrative. Pictured subjects are not Ask Intros members or endorsers.</small>
    </footer>
  </main>
}
