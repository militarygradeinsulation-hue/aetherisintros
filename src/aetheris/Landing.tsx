import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import landingPortraitAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'
import showcaseAsset from '@/assets/one-connected-system.png.asset.json'
import { FaLinkedin, FaMicrosoft, FaSalesforce } from 'react-icons/fa'
import { BsMicrosoftTeams, BsSlack } from 'react-icons/bs'
import { PiMicrosoftOutlookLogoFill } from 'react-icons/pi'
import { SiGmail, SiGooglecalendar, SiHubspot, SiNotion, SiZoom } from 'react-icons/si'
import { isLiveMember, useAccess } from './access'

const platforms = [
  { name: 'LinkedIn', icon: FaLinkedin, tone: 'linkedin', blurb: 'Networking' },
  { name: 'Gmail', icon: SiGmail, tone: 'gmail', blurb: 'Email' },
  { name: 'Outlook', icon: PiMicrosoftOutlookLogoFill, tone: 'outlook', blurb: 'Email' },
  { name: 'Calendar', icon: SiGooglecalendar, tone: 'calendar', blurb: 'Scheduling' },
  { name: 'Slack', icon: BsSlack, tone: 'slack', blurb: 'Messaging' },
  { name: 'Zoom', icon: SiZoom, tone: 'zoom', blurb: 'Video' },
  { name: 'Teams', icon: BsMicrosoftTeams, tone: 'teams', blurb: 'Collaboration' },
  { name: 'HubSpot', icon: SiHubspot, tone: 'hubspot', blurb: 'CRM' },
  { name: 'Salesforce', icon: FaSalesforce, tone: 'salesforce', blurb: 'CRM' },
  { name: 'Notion', icon: SiNotion, tone: 'notion', blurb: 'Notes' },
]

const eliminates = ['Fragmented tools', 'Lost context', 'Cold outreach', 'Disconnected conversations', 'Forgotten follow-up', 'Scattered notes']

/**
 * Public front page. A signed-in member never sees the marketing page or any
 * showcase entry point: they are handed straight to their real network.
 */
export default function Landing() {
  const { access } = useAccess()
  const navigate = useNavigate()
  const member = isLiveMember(access)
  useEffect(() => {
    if (!access.loading && member) navigate({ to: '/app', replace: true })
  }, [access.loading, member, navigate])
  if (member) return <main className="landing landing-handoff"><p>Opening your network…</p></main>
  return <LandingPage signedIn={access.signedIn} />
}

function LandingPage({ signedIn }: { signedIn: boolean }) {
  const showDemo = !signedIn
  const demoBtn = (label: string, cls: string) => showDemo
    ? <Link to="/demo" className={cls}>{label} <ArrowRight size={15} /></Link>
    : null
  const accountBtn = (cls: string) => <Link to={signedIn ? '/app' : '/early-access'} className={cls}>{signedIn ? 'Enter your network' : 'Create an account'}</Link>
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
          <img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" />
          <span className="brand-name">Aetheris<em>Intros</em></span>
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
          <span className="lv-hero-topright">AETHERIS INTROS</span>
          <h1><span>Aetheris Intros</span><em>The Relationship Network for CEOs.</em></h1>
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

      {/* ── Showcase: the whole system, in one frame ── */}
      <section className="lv-showcase" id="one-connected-system">
        <header>
          <span>THE TOOLS COMPANIES PAY FOR SEPARATELY</span>
          <h2>One Connected System for <em>CEOs.</em></h2>
          <p>
            Social network. CRM. Spreadsheets. Calendar. Meetings. Signals. Knowledge.
            Built natively inside Aetheris Intros — one account, one data graph, one place.
          </p>
        </header>
        <figure className="lv-showcase-plate">
          <img src={showcaseAsset.url} alt="Aetheris Intros: one connected system for CEOs, replacing a fragmented stack of separate tools"
            width={1448} height={1086} loading="lazy" />
        </figure>
        <div className="lv-showcase-foot">
          <p>Instead of paying for disconnected tools, Intros gives you <b>one native system.</b> Every member is verified, so every relationship starts with a real person.</p>
          <div className="lv-showcase-actions">
            {accountBtn('btn primary')}
            {demoBtn('See the system', 'btn ghost')}
          </div>
        </div>
      </section>



      {/* ── Section 3: Black connected system ── */}
      <section className="lv-connect">
        <header className="lv-connect-head">
          <span>WHAT AETHERIS INTROS BRINGS TOGETHER</span>
          <h2>One Connected System.</h2>
          <p>PEOPLE. CONTEXT. OPPORTUNITIES. ALL IN ONE PLACE.</p>
        </header>
        <div className="lv-platforms">
          {platforms.map(({ name, icon: Icon, tone, blurb }) => (
            <div key={name} className="lv-platform">
              <span className={`eh-platform-logo ${tone}`}><Icon aria-hidden="true" /></span>
              <b>{name}</b>
              <small>{blurb}</small>
            </div>
          ))}
        </div>
        <div className="lv-eliminates">
          <span>ELIMINATES WHAT HOLDS YOU BACK</span>
          <p>{eliminates.map((e, i) => <span key={e}>{e}{i < eliminates.length - 1 && <i />}</span>)}</p>
        </div>
        <footer className="lv-foot">
          <span>REAL PEOPLE. REAL OPPORTUNITIES. A BRIGHTER TOMORROW.</span>
          <i />
          <span>ONE NETWORK FOR WHAT'S NEXT.</span>
        </footer>
      </section>

      <footer className="lv-legal">
        <div className="brand-mark">
          <img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" />
          <span className="brand-name">Aetheris<em>Intros</em></span>
        </div>
        <span><LockKeyhole size={12} />No spam. No selling your attention. Private by default.</span>
        <span>© 2026 Aetheris</span>
      </footer>
    </main>
  )
}
