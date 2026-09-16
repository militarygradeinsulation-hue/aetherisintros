import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import landingPortraitAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'

import { FaLinkedin, FaMicrosoft, FaSalesforce } from 'react-icons/fa'
import { BsMicrosoftTeams, BsSlack } from 'react-icons/bs'
import { PiMicrosoftOutlookLogoFill } from 'react-icons/pi'
import { SiGmail, SiGooglecalendar, SiHubspot, SiNotion, SiZoom } from 'react-icons/si'
import { foundingStats, isLiveMember, joinWaitlist, useAccess, type FoundingStats } from './access'


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
        <p>Aetheris Intros opens to 1,000 founding members. Add your name and we review it against the standard: CEOs, founders, owners, managing partners and principal operators. Verified people only — that is what makes an introduction here worth taking.</p>
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

      <section className="lv-quote" aria-label="Aetheris Intros principle">
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
