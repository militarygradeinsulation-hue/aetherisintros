import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup'
import { IMPACT_NOTE, ImpactReportBody } from '@/aetheris/impact-ui'
import type { ImpactMetrics } from '@/aetheris/impact'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/impact/$slug')({
  head: () => ({
    meta: [
      { title: 'Network Impact Report — Ask Intros' },
      { name: 'description', content: 'What the Ask Intros network produced: introductions, meetings, outcomes and deals, counted from member-confirmed records.' },
      { property: 'og:title', content: 'Network Impact Report — Ask Intros' },
      { property: 'og:description', content: 'Introductions, meetings, outcomes and deals, counted from member-confirmed records.' },
      { property: 'og:type', content: 'article' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ImpactReportPage,
})

interface PublishedReport { period_label: string; period_from: string; period_to: string; metrics: ImpactMetrics; headline: string; published_at: string | null }

const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function ImpactReportPage() {
  const { slug } = Route.useParams()
  const [report, setReport] = useState<PublishedReport | null | undefined>(undefined)
  useEffect(() => {
    // RLS returns only published snapshots to visitors, so a draft or unknown slug reads as missing.
    void (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('impact_reports').select('period_label, period_from, period_to, metrics, headline, published_at')
      .eq('slug', slug).eq('published', true).maybeSingle()
      .then((r: { data: PublishedReport | null }) => setReport(r.data ?? null))
  }, [slug])

  return <main className="impact-public">
    <header className="impact-public-head">
      <Link to="/" aria-label="Ask Intros home"><AskIntrosLockup /></Link>
      <span className="eyebrow signal">NETWORK IMPACT REPORT</span>
    </header>
    {report === undefined && <p className="impact-public-wait">Opening the report…</p>}
    {report === null && <section className="impact-public-missing">
      <h1>This report is not public.</h1>
      <p>It may not be published yet, or it was taken down. Ask whoever shared it for a fresh link.</p>
      <Link className="btn" to="/">Visit Ask Intros</Link>
    </section>}
    {report && <>
      <section className="impact-public-title">
        <h1>{report.period_label}</h1>
        <p>{longDate(report.period_from)} – {longDate(report.period_to)}</p>
      </section>
      <ImpactReportBody metrics={report.metrics} headline={report.headline} />
      <footer className="impact-public-foot">
        <p>{IMPACT_NOTE}</p>
        <p>Ask Intros is a private network of verified owners and CEOs. <Link to="/">Learn more</Link></p>
      </footer>
    </>}
  </main>
}
