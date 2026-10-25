import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAccess } from './access'
import { AskIntrosLockup } from './AskIntrosLockup'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { CinematicEntrance, CITY_OPENING_VIDEO } from '@/components/ui/cinematic-entrance'
import { AppearanceToggle } from './AppearanceToggle'
import { HomeSlideCarousel } from './HomeSlideCarousel'
import './editorial-landing.css'
import './architectural-system.css'
import './compact-homepage.css'
import './editorial-media.css'
import './public-burnt-orange.css'
import './home-slides.css'

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
      </nav>
      <div className="ael-header-actions">
        <AppearanceToggle className="ael-appearance" />
        {signedIn ? <Link to="/app" className="ael-signin">My network</Link> : <Link to="/auth" className="ael-signin">Member sign in</Link>}
        <JoinAction signedIn={signedIn} className="ael-nav-cta ai-gradient-button" />
      </div>
    </header>

    <section className="ael-hero ael-hero--carousel" id="ael-main" aria-labelledby="ael-hero-title">
      <h1 id="ael-hero-title" className="sr-only">Ask Intros — The only social platform that runs your business.</h1>
      <HomeSlideCarousel />
      <div className="ael-hero-content">
        <p className="sr-only">Share what you need. Explore relevant people. Request an introduction with context and mutual consent.</p>
        <div className="ael-hero-actions">
          <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
          <Link to="/demo" className="ael-text-link">Explore the demo <ArrowRight aria-hidden="true" size={16} /></Link>
        </div>
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

    <footer className="ael-compact-footer">
      <Link to="/" className="ael-compact-footer-brand" aria-label="Ask Intros home"><span className="stencil-footer-wordmark" style={{ color: "var(--st-ink)", backgroundColor: "var(--st-bg)" }}>ASK INTROS</span></Link>
      <span>WHY ME &middot; WHY THEM &middot; WHY NOW</span>
    </footer>
  </main>
}
