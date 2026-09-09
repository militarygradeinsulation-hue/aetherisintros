import { ArrowRight, Eye, Network, Radar, ScanSearch, ShieldCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand">
          <div className="mini-logo"><Eye size={20} strokeWidth={2.2} /></div>
          <div><strong>AETHERIS</strong><span>NEXUS</span></div>
        </div>
        <Link to="/app" className="btn primary compact">Open the system <ArrowRight size={15} /></Link>
      </header>

      <section className="landing-hero">
        <div className="eyebrow">RELATIONSHIP INTELLIGENCE</div>
        <h1>Your network already contains opportunities.<br /><em>You just can’t see them.</em></h1>
        <p className="landing-lead">
          Aetheris Nexus turns conversations, contacts and relationships into a living map of who matters,
          why they matter and what should happen next.
        </p>
        <div className="landing-cta">
          <Link to="/app" className="btn primary"><ScanSearch size={16} /> SCAN MY NETWORK</Link>
          <Link to="/app" className="btn secondary">See the command center</Link>
        </div>
        <p className="landing-sub">
          Your CRM knows companies.<br />LinkedIn knows profiles.<br /><b>Nexus understands relationships.</b>
        </p>
      </section>

      <section className="landing-loop">
        {['DIAGNOSE', 'MAP', 'SCORE', 'CONNECT', 'COMPOUND'].map((stage, i) => (
          <div key={stage} className="loop-step"><span>{String(i + 1).padStart(2, '0')}</span><strong>{stage}</strong></div>
        ))}
      </section>

      <section className="landing-grid">
        <article className="panel">
          <Radar size={20} />
          <h3>Relationship radar</h3>
          <p>Hot now, emerging, strategic, dormant and at risk — ranked by relevance to the outcome you want, not by title or follower count.</p>
        </article>
        <article className="panel">
          <Network size={20} />
          <h3>Warm path intelligence</h3>
          <p>The shortest route is not always the strongest. Nexus scores trust, recency and credibility to choose the connector who would actually help.</p>
        </article>
        <article className="panel">
          <ShieldCheck size={20} />
          <h3>Explainable and permissioned</h3>
          <p>Every recommendation shows why them, why you, why now — with confidence and unknowns stated plainly. Nothing is sent without your authorization.</p>
        </article>
      </section>

      <section className="landing-close">
        <h2>Which relationship has enough strategic relevance, mutual value and timing to justify a conversation?</h2>
        <Link to="/app" className="btn primary">SCAN MY NETWORK</Link>
      </section>

      <footer className="landing-foot">
        <span>Aetheris Nexus · Relationship Intelligence</span>
        <span>Demonstration intelligence. No external accounts connected.</span>
      </footer>
    </div>
  )
}
