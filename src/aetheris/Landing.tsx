import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAccess } from './access'
import { AskIntrosLockup } from './AskIntrosLockup'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { CinematicEntrance, CITY_OPENING_VIDEO } from '@/components/ui/cinematic-entrance'
import { AppearanceToggle } from './AppearanceToggle'
import { HomeSlideCarousel } from './HomeSlideCarousel'
import { ButlerAvatar } from '@/components/ui/butler-orb'
import { PublicStructuredData } from './PublicStructuredData'
import { PRODUCT_TITLE, PRODUCT_DESCRIPTION } from '@/lib/public-search'
import './editorial-landing.css'
import './architectural-system.css'
import './compact-homepage.css'
import './editorial-media.css'
import './public-burnt-orange.css'
import './home-slides.css'

/** Short, concrete ideas for exploring Ask Intros without signing in. */
const BUTLER_IDEAS = [
  'Start with a specific need. Ask Intros helps you discover people who may be able to help.',
  'Before a meeting, review the person and the reason you want to connect.',
  'Keep introductions, conversations, and next steps together instead of scattered across tools.',
  'In Business View, review your CRM and relationships to see what deserves attention next.',
  'Post one clear ask this week. Specific asks get better intros than broad ones.',
  'List what you can help with, not just what you need. Generosity attracts the right people.',
  'Every intro here is double opt-in, so both people agree before anyone is connected.',
  'Revisit a contact you have not spoken to in months. A short check-in often reopens doors.',
  'Ask for an intro with context: why them, why you, and why now.',
  'Browse the network by need or expertise instead of by job title.',
  'After a great conversation, note what you learned so your next follow-up is sharper.',
  'Offer one introduction for someone else today. Strong networks are built both ways.',
  'Keep your profile focus current. What you are working on now matters more than your history.',
  'Use Social View for the people pulse and Business View for pipeline and follow-ups.',
  'Turn a recurring question into an ask so the right member can find you.',
  'Verify your LinkedIn to move beyond a basic account and build more trust.',
  'Before asking for help, check whether a mutual connection can make a warm intro.',
  'Message people with one sentence about why you reached out. Clarity earns replies.',
  'Save people worth knowing so you can return when the timing is right.',
  'Review cooling conversations and decide which ones deserve a next step.',
] as const

function shuffledOrder(avoidFirst?: number) {
  const order = BUTLER_IDEAS.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = order[i]!; order[i] = order[j]!; order[j] = t
  }
  if (avoidFirst !== undefined && order[0] === avoidFirst) { order[0] = order[1]!; order[1] = avoidFirst }
  return order
}

function LandingButlerIdeas() {
  const [tip, setTip] = useState(-1)
  const queue = useRef<number[]>([])
  const nextTip = () => {
    if (queue.current.length === 0) queue.current = shuffledOrder(tip < 0 ? undefined : tip)
    setTip(queue.current.shift()!)
  }
  return <div className="ael-butler-ideas">
    <button type="button" className="ael-butler-idea-trigger"
      onClick={nextTip} aria-label="Ask Butler for an idea about Ask Intros"
      aria-describedby="ael-butler-idea-message">
      <ButlerAvatar robot className="butler-home-robot" view="social" />
      <span className="ael-butler-idea-action">ASK BUTLER FOR AN IDEA <ArrowUpRight aria-hidden="true" size={14}/></span>
    </button>
    <div className="ael-butler-idea-message" id="ael-butler-idea-message" role="status" aria-live="polite" aria-atomic="true">
      <span className="ael-carousel-label">BUTLER'S IDEA</span>
      <p>{tip < 0 ? 'Click the robot for a quick tip.' : BUTLER_IDEAS[tip]}</p>
    </div>
  </div>
}

/** Compact typographic homepage with no illustrative photography. */
function JoinAction({ signedIn, className = '' }: { signedIn: boolean; className?: string }) {
  return signedIn
    ? <Link className={className} to="/app">Find your next connection <ArrowUpRight aria-hidden="true" size={16} /></Link>
    : <Link className={className} to="/auth" search={{ mode: 'signup' }}>Create free account <ArrowUpRight aria-hidden="true" size={16} /></Link>
}

export default function Landing() {
  const { access } = useAccess()
  const signedIn = access.signedIn

  return <main className="ael ael-compact ael--text">
    <PublicStructuredData path="/" title={PRODUCT_TITLE} description={PRODUCT_DESCRIPTION} />
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
      <h1 id="ael-hero-title" className="sr-only">Ask Intros — CEO and executive networking through warm, double opt-in introductions.</h1>
      <div className="ael-hero-content">
        <p className="sr-only">Share what you need. Explore relevant CEOs, founders and operators. Request a warm introduction with context and mutual consent.</p>
        <div className="ael-hero-actions">
          <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
          {signedIn
            ? <Link to="/app" className="ael-btn ael-btn-ghost">My network <ArrowUpRight aria-hidden="true" size={16} /></Link>
            : <Link to="/auth" className="ael-btn ael-btn-ghost">Member sign in <ArrowUpRight aria-hidden="true" size={16} /></Link>}
          <Link to="/demo" className="ael-text-link">Explore the demo <ArrowRight aria-hidden="true" size={16} /></Link>
        </div>
      </div>
      <div className="ael-carousel-stage">
        <aside className="ael-carousel-intro" aria-label="Ask Intros and Butler">
          <LandingButlerIdeas />
          <div className="ael-carousel-copy">
            <p className="ael-carousel-label">WHY ME · WHY THEM · WHY NOW</p>
            <h2>More connection.<br />More possibility.</h2>
            <p>Built for CEOs, founders and operators who want warm introductions, not cold outreach. Start with a shared purpose and a reason to connect.</p>
            <Link to="/demo" className="ael-text-link">Find your next connection <ArrowRight aria-hidden="true" size={16} /></Link>
          </div>
        </aside>
        <HomeSlideCarousel />
      </div>
    </section>

    <CinematicHero
      id="cinematic-experience"
      brandName="ASK INTROS"
      tagline1="Each Connection"
      tagline2="Matters."
      cardHeading="The next relationship should start with a reason."
      cardDescription="Share a specific need, discover executives and founders who can help, and make introductions with mutual consent. An intentional process, not another pile of contacts."
      metricValue={3}
      metricLabel="Simple steps"
      ctaHeading="Every great opportunity begins with a meaningful introduction."
      ctaDescription="Discover relevant CEOs, founders and operators, know why they matter, and decide together what comes next."
      primaryHref={signedIn ? '/app' : '/auth?mode=signup'}
      primaryLabel={signedIn ? 'Open your network' : 'Create your account'}
      secondaryHref="/demo"
      secondaryLabel="Try the live experience"
    />

    <footer className="ael-compact-footer">
      <Link to="/" className="ael-compact-footer-brand" aria-label="Ask Intros home"><span className="stencil-footer-wordmark" style={{ color: "var(--st-ink)", backgroundColor: "var(--st-bg)" }}>ASK INTROS</span></Link>
      <span>WHY ME &middot; WHY THEM &middot; WHY NOW</span>
      <nav className="ael-guide-links" aria-label="Learn about Ask Intros">
        <Link to="/how-it-works">How it works</Link>
        <Link to="/warm-introductions">Warm introductions</Link>
        <Link to="/active-memory">Active Memory</Link>
        <Link to="/founder-story">Founder story</Link>
      </nav>
    </footer>
  </main>
}
