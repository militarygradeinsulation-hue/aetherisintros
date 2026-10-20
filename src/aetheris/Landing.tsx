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
 * Three chapters: hero, experience + process + AI brief, membership.
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
    ? <Link className={className} to="/app">Find your next connection <ArrowUpRight aria-hidden="true" size={16} /></Link>
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
        <div className="ael-platform-strip" aria-label="A purposeful business connection">
          <p className="ael-platform-statement">A real business need. A relevant person. <strong>A reason to connect.</strong></p>
          <p className="ael-platform-disclaimer">The relationship network for CEOs. Who matters. Why they matter. Why now.</p>
        </div>
        <p className="ael-kicker ael-kicker-light"><span className="ael-dash" /> Relationships by design</p>
        <h1 id="ael-hero-title" className="stencil-display"><span className="sr-only">The Only social platform that runs your business.</span><StencilHeadline lines={['THE ONLY SOCIAL', 'PLATFORM THAT', 'RUNS YOUR BUSINESS']} className="stencil-headline--hero" /></h1>
        <p className="ael-hero-lede">Share what you need. Explore relevant people. Request an introduction with context and mutual consent.</p>
        <div className="ael-hero-actions">
          <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
          <Link to="/try" className="ael-text-link">Try it in 30 seconds <ArrowRight aria-hidden="true" size={16} /></Link>
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
          <p>Start with something specific: a customer you want to reach, expertise you need, or a project you can help deliver. Give the next conversation a clear purpose.</p>
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
          <li><span>01</span><div><strong>Bring one real need</strong><p>Explain what would move you forward and what you can help others with.</p></div></li>
          <li><span>02</span><div><strong>Find a reason to meet</strong><p>Review the person and context before requesting an introduction. Both people choose whether to connect.</p></div></li>
          <li><span>03</span><div><strong>Agree on a next step</strong><p>Continue the conversation, arrange a meeting and record what you agree to do next.</p></div></li>
        </ol>
        <Link to="/demo" className="ael-underlink ael-underlink-dark">See the demo experience <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>
      <div className="ael-compact-method" id="intelligence" aria-labelledby="ael-intelligence-title">
        <div className="ael-compact-method-heading">
          <span className="ael-fine-label">THE AI BRIEF / YOUR BUSINESS ANALYST</span>
          <h3 id="ael-intelligence-title" className="stencil-display"><span className="sr-only">What your AI Business Analyst surfaces.</span><StencilHeadline lines={['YOUR BUSINESS', 'BRIEF']} /></h3>
        </div>
        <ol className="ael-compact-steps">
          <li><span>01</span><div><strong>Lead leaks</strong><p>Where deals slip before they close.</p></div></li>
          <li><span>02</span><div><strong>Cold relationships</strong><p>High-value connections worth one reactivation.</p></div></li>
          <li><span>03</span><div><strong>Partner introductions</strong><p>Named people whose work addresses your gaps.</p></div></li>
          <li><span>04</span><div><strong>Network health score</strong><p>A live 0–100 reading of your activity vs. your opportunities.</p></div></li>
        </ol>
        <Link to="/demo" className="ael-underlink ael-underlink-dark">See a sample brief <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>
      <div className="ael-compact-method" id="intelligence" aria-labelledby="ael-intelligence-title">
        <div className="ael-compact-method-heading">
          <span className="ael-fine-label">THE AI BRIEF / YOUR BUSINESS ANALYST</span>
          <h3 id="ael-intelligence-title" className="stencil-display"><span className="sr-only">What your AI Business Analyst surfaces.</span><StencilHeadline lines={['YOUR BUSINESS', 'BRIEF']} /></h3>
        </div>
        <ol className="ael-compact-steps">
          <li><span>01</span><div><strong>Lead leaks</strong><p>Where deals slip before they close.</p></div></li>
          <li><span>02</span><div><strong>Cold relationships</strong><p>High-value connections worth one reactivation.</p></div></li>
          <li><span>03</span><div><strong>Partner introductions</strong><p>Named people whose work addresses your gaps.</p></div></li>
          <li><span>04</span><div><strong>Network health score</strong><p>A live 0–100 reading of your activity vs. your opportunities.</p></div></li>
        </ol>
        <Link to="/demo" className="ael-underlink ael-underlink-dark">See a sample brief <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>
    </section>

    <section className="ael-membership ael-compact-membership" id="membership" aria-labelledby="ael-membership-title">
      <Photo src={photo.membership} alt="Business leaders discussing ideas and potential partnerships at a private meeting" className="ael-compact-membership-image" />
      <div className="ael-compact-membership-content">
        <div>
          <span className="ael-fine-label">MEMBERSHIP / ASK INTROS</span>
          <h2 id="ael-membership-title" className="stencil-display"><span className="sr-only">Start with one useful connection.</span><StencilHeadline lines={['START WITH ONE', 'USEFUL CONNECTION']} /></h2>
          <p>Bring a current need and something you can offer. Relevant connections depend on who has joined and what members choose to share.</p>
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
      <span>WHY ME &middot; WHY THEM &middot; WHY NOW</span>
      <small>Editorial imagery is illustrative. Pictured subjects are not Ask Intros members or endorsers.</small>
    </footer>
  </main>
}
