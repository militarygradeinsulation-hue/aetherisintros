import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAccess } from './access'
import { AskIntrosLockup } from './AskIntrosLockup'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { CinematicEntrance, CITY_OPENING_VIDEO } from '@/components/ui/cinematic-entrance'
import { AppearanceToggle } from './AppearanceToggle'
import { StencilHeadline } from './StencilHeadline'
import './editorial-landing.css'
import './architectural-system.css'
import './compact-homepage.css'
import './editorial-media.css'
import './public-burnt-orange.css'

/** Compact typographic homepage with no illustrative photography. */
function JoinAction({ signedIn, className = '' }: { signedIn: boolean; className?: string }) {
  return signedIn
    ? <Link className={className} to="/app">Find your next connection <ArrowUpRight aria-hidden="true" size={16} /></Link>
    : <Link className={className} to="/auth" search={{ mode: 'signup' }}>Create your account <ArrowUpRight aria-hidden="true" size={16} /></Link>
}

export default function Landing() {
  const { access } = useAccess()
  const signedIn = access.signedIn

  return <main className="ael ael-compact ael--text">
    <CinematicEntrance videoSrc={CITY_OPENING_VIDEO} />
    <a className="ael-skip" href="#ael-main">Skip to content</a>

    <header className="ael-header" aria-label="Ask Intros public navigation">
      <Link to="/" className="ael-logo" aria-label="Ask Intros home">
        <AskIntrosLockup variant="compact" />
      </Link>
      <nav className="ael-nav" aria-label="Primary navigation">
        <a href="#cinematic-experience">The experience</a>
        <Link to="/demo">Explore the demo</Link>
        <a href="#membership">Membership</a>
      </nav>
      <div className="ael-header-actions">
        <AppearanceToggle className="ael-appearance" />
        {signedIn ? <Link to="/app" className="ael-signin">My network</Link> : <Link to="/auth" className="ael-signin">Member sign in</Link>}
        <JoinAction signedIn={signedIn} className="ael-nav-cta ai-gradient-button" />
      </div>
    </header>

    <section className="ael-hero" id="ael-main" aria-labelledby="ael-hero-title">
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
          <Link to="/demo" className="ael-text-link">Explore the demo <ArrowRight aria-hidden="true" size={16} /></Link>
        </div>
      </div>
      <div className="ael-hero-bottom">
        <span>WHY ME. WHY THEM. WHY NOW.</span>
        <a href="#cinematic-experience">THE EXPERIENCE <ArrowDownRight aria-hidden="true" size={16} /></a>
        <span>01 / 03</span>
      </div>
    </section>

    <CinematicHero
      id="cinematic-experience"
      brandName="ASK INTROS"
      tagline1="Each Connection"
      tagline2="Matters."
      cardHeading="The next relationship should start with a reason."
      cardDescription="Share a specific need, discover who can help, and make introductions with mutual consent. An intentional process, not another pile of contacts."
      metricValue={3}
      metricLabel="Simple steps"
      ctaHeading="Every great opportunity begins with a meaningful introduction."
      ctaDescription="Discover relevant people, know why they matter, and decide together what comes next."
      primaryHref={signedIn ? '/app' : '/auth?mode=signup'}
      primaryLabel={signedIn ? 'Open your network' : 'Create your account'}
      secondaryHref="/demo"
      secondaryLabel="Try the live experience"
    />

    <section className="ael-membership ael-compact-membership" id="membership" aria-labelledby="ael-membership-title">
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
    </footer>
  </main>
}
