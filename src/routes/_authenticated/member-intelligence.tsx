import { ClientOnly, createFileRoute, Link } from '@tanstack/react-router'

import BusinessAnalystPanel from '@/aetheris/BusinessAnalystPanel'
import { TrackRecordDashboard } from '@/aetheris/TrackRecordDashboard'
import '@/aetheris/member-intelligence.css'

/** Connect existing server-owned intelligence modules without weakening RLS. */
export const Route = createFileRoute('/_authenticated/member-intelligence')({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({ meta: [
    { title: 'Member Intelligence — Ask Intros' },
    { name: 'description', content: 'Private business analysis and your evidence-based reputation score.' },
  ] }),
  component: MemberIntelligence,
})

function MemberIntelligence() {
  const { user } = Route.useRouteContext()
  return <ClientOnly fallback={<p className="member-intel-loading">Loading member intelligence…</p>}>
    <main className="member-intel-page">
      <header className="member-intel-header">
        <Link to="/app" className="member-intel-back">← Back to Ask Intros</Link>
        <p className="member-intel-eyebrow">PRIVATE MEMBER INTELLIGENCE</p>
        <h1>What the network knows. What it can prove.</h1>
        <p>Run analysis against your real profile and network activity, and review a reputation score derived from introduction outcomes.</p>
      </header>
      {user ? <div className="member-intel-grid">
        <section aria-labelledby="business-analyst-heading" className="member-intel-panel">
          <h2 id="business-analyst-heading">Business Intelligence</h2>
          <BusinessAnalystPanel />
        </section>
        <section aria-labelledby="member-score-heading" className="member-intel-panel">
          <h2 id="member-score-heading">Track Record</h2>
          <p className="member-intel-explanation">This score is calculated from network outcomes. Members cannot directly edit their reputation score.</p>
          <TrackRecordDashboard userId={user.id} />
        </section>
      </div> : <p className="member-intel-loading">Sign in to review your private business and track-record data.</p>}
    </main>
  </ClientOnly>
}
