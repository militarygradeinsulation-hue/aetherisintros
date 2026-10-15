import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import originalPortrait from '@/assets/aetheris-home-portrait.jpg.asset.json'
import showcaseAsset from '@/assets/one-connected-system.png.asset.json'
import { useAccess } from './access'
import { AskIntrosLockup } from './AskIntrosLockup'
import { AppearanceToggle } from './AppearanceToggle'
import { useAppearance } from './AppearanceMode'
import HalftoneWordmarkFooter from './HalftoneWordmarkFooter'
import './editorial-landing.css'
import './architectural-system.css'

/**
 * ASK INTROS / EDITORIAL PRIVATE-CIRCLE EXPERIENCE
 * Editorial photography is illustrative: people in these pictures are not
 * members, endorsers, or evidence of a business outcome.
 *
 * Art direction: cinematic travel, warm architecture, human conversations,
 * confident whitespace. The aesthetic is original, not a retailer's copy.
 */
const photo = {
  room: 'https://images.unsplash.com/photo-1772012454181-6eedf371b8ee?auto=format&fit=crop&w=2400&q=84',
  gathering: 'https://images.unsplash.com/photo-1761489798175-e2076856a9f7?auto=format&fit=crop&w=1600&q=82',
  conversation: 'https://images.unsplash.com/photo-1767652497594-4ca3daf36c8b?auto=format&fit=crop&w=1600&q=82',
  city: 'https://images.unsplash.com/photo-1757940809566-70aaf9501138?auto=format&fit=crop&w=1900&q=82',
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
    : <Link className={className} to="/early-access">Apply for access <ArrowUpRight aria-hidden="true" size={16} /></Link>
}

export default function Landing() {
  const { access } = useAccess()
  const { theme } = useAppearance()
  const signedIn = access.signedIn

  return <main className="ael">
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
      <Photo src={photo.room} alt="Contemporary architecture with crafted timber detail and measured proportions" className="ael-hero-image" eager />
      <div className="ael-hero-shade" aria-hidden="true" />
      <div className="ael-architecture-meta" aria-hidden="true"><span>RELATIONSHIPS / BY DESIGN</span><span>ASK INTROS — STUDY 001</span><span>EST. TO CONNECT WHAT MATTERS</span></div>
      <div className="ael-hero-content">
        <p className="ael-kicker ael-kicker-light"><span className="ael-dash" /> A different kind of professional circle</p>
        <h1 id="ael-hero-title">The right room <em>changes everything.</em></h1>
        <p className="ael-hero-lede">Great things are never built by accident. Neither are the relationships that make them possible.</p>
        <div className="ael-hero-actions">
          <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
          <Link to="/demo" className="ael-text-link">Explore Ask Intros <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="ael-hero-bottom">
        <span>WHY ME. WHY THEM. WHY NOW.</span>
        <a href="#experience">DISCOVER THE EXPERIENCE <ArrowDownRight aria-hidden="true" size={17} /></a>
        <span>01 / 04</span>
      </div>
    </section>

    <section className="ael-introduction" id="experience" aria-labelledby="ael-experience-title">
      <div className="ael-editorial-meta"><span>THE PHILOSOPHY</span><span>001 — THE VALUE OF ACCESS</span></div>
      <div className="ael-editorial-lead">
        <h2 id="ael-experience-title">The strongest networks are <em>built with intention.</em></h2>
        <div>
          <p>Most networks help you collect names. Ask Intros is designed to connect people through a real reason to meet, permission to be introduced, and a place to turn the conversation into action.</p>
          <Link className="ael-underlink" to="/founder-story">Why we built it <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>

    <section className="ael-scenes" aria-label="The professional experience">
      <article className="ael-scene ael-scene-first">
        <div className="ael-scene-photo">
          <Photo src={photo.gathering} alt="Sculptural contemporary building with a sweeping curved roof" />
          <span className="ael-scene-index">I / THE SETTING</span>
        </div>
        <div className="ael-scene-description">
          <span className="ael-fine-label">BEYOND THE CONNECTION REQUEST</span>
          <h3>An introduction is an <em>opening, not an outcome.</em></h3>
          <p>Opportunity often starts with being in the right conversation, at the right time, with enough shared context to make it count.</p>
        </div>
      </article>
      <article className="ael-scene ael-scene-second">
        <div className="ael-scene-description">
          <span className="ael-fine-label">THE VALUE OF RELEVANCE</span>
          <h3>Find people who <em>move things forward.</em></h3>
          <p>Discover expertise, shared priorities and credible introductions without turning professional relationships into a public popularity contest.</p>
        </div>
        <div className="ael-scene-photo">
          <Photo src={photo.conversation} alt="Refined European stone facade with carefully detailed architectural proportions" />
          <span className="ael-scene-index">II / THE CONVERSATION</span>
        </div>
      </article>
    </section>

    <section className="ael-approach" id="approach" aria-labelledby="ael-approach-title">
      <div className="ael-editorial-meta ael-editorial-meta-dark"><span>THE ASK INTROS METHOD</span><span>002 — FROM PERSON TO POSSIBILITY</span></div>
      <div className="ael-approach-grid">
        <div>
          <h2 id="ael-approach-title">A relationship is only the <em>beginning.</em></h2>
          <p>One connected environment makes it possible to move from intention to a qualified introduction, a real conversation, and the work that follows.</p>
          <Link to="/demo" className="ael-underlink ael-underlink-dark">Walk through the experience <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <ol className="ael-steps">
          <li><span>01</span><div><strong>Find your reason</strong><p>Communicate what you're building, offering or looking for.</p></div></li>
          <li><span>02</span><div><strong>Establish a warm path</strong><p>See relevant expertise and request introductions with both sides in control.</p></div></li>
          <li><span>03</span><div><strong>Have the conversation</strong><p>Carry context into messaging, meetings and agreed next steps.</p></div></li>
          <li><span>04</span><div><strong>Make it matter</strong><p>Move into private workspaces and record what actually happened.</p></div></li>
        </ol>
      </div>
    </section>

    <section className="ael-cinematic-break" aria-label="A new perspective on professional relationships">
      <Photo src={photo.city} alt="Warmly illuminated modern timber-and-glass architecture set in a natural landscape" />
      <div className="ael-cinematic-shade" aria-hidden="true" />
      <div className="ael-cinematic-message">
        <p className="ael-kicker ael-kicker-light"><span className="ael-dash" /> ACCESS IS ONLY THE START</p>
        <p>The next opportunity might start with <em>one introduction.</em></p>
      </div>
      <span className="ael-cinematic-caption">003 — A WORLD OF POSSIBILITY</span>
    </section>

    <section className="ael-system" aria-labelledby="ael-system-title">
      <div className="ael-editorial-meta ael-editorial-meta-dark"><span>THE INTELLIGENCE BEHIND THE EXPERIENCE</span><span>004 — ONE CONNECTED SYSTEM</span></div>
      <div className="ael-system-head">
        <h2 id="ael-system-title">Beautiful by design. <em>Connected by intention.</em></h2>
        <p>People, introductions, conversations, meetings and business follow-through are designed to work together—not live as unrelated activity across separate apps.</p>
      </div>
      <div className="ael-system-visual">
        <img loading="lazy" src={showcaseAsset.url} alt="Ask Intros connected-system diagram showing professional networking, business relationships and executive work tools" />
        <span>ASK INTROS / THE CONNECTED NETWORK</span>
      </div>
      <Link to="/demo" className="ael-underlink ael-underlink-dark">See how the system connects <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>

    <section className="ael-membership" id="membership" aria-labelledby="ael-membership-title">
      <span className="ael-fine-label">MEMBERSHIP / ASK INTROS</span>
      <h2 id="ael-membership-title">The next room is <em>yours to enter.</em></h2>
      <p>Bring a clear purpose. Meet people with reasons to connect. Do more with the relationships worth building.</p>
      <div className="ael-membership-actions">
        <JoinAction signedIn={signedIn} className="ael-btn ael-btn-gold ai-gradient-button" />
        {!signedIn && <Link to="/auth" className="ael-text-link">Already a member? Sign in <ArrowRight size={16} aria-hidden="true" /></Link>}
      </div>
    </section>

    <p className="ael-imagery-note">Editorial imagery is illustrative. Subjects pictured are not represented as Ask Intros members or endorsers.</p>
    <HalftoneWordmarkFooter
      className="ael-halftone-footer"
      wordmark="ask intros"
      height="clamp(390px, 43vw, 590px)"
      dotGap={6}
      radius={88}
      grain={0.35}
      palette={theme === 'dark' ? { background: '#111719', ink: '#f2eee6', warm: '#b59a74' } : { background: '#f3f0e9', ink: '#202420', warm: '#a36b43' }}
    />
  </main>
}
