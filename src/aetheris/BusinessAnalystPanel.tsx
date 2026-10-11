/**
 * BusinessAnalystPanel — on-demand AI strategic brief for a member.
 * Reads the most recent business_diagnostics report on mount and lets the
 * member trigger a fresh analysis at any time.
 */
import { useEffect, useState } from 'react'

import { generateBusinessAnalysis, getLatestAnalysis, type BusinessDiagnostic, type BusinessOpportunity } from '@/lib/businessAnalyst.functions'

/* ─── helpers ─── */

function scoreColor(score: number): string {
  if (score >= 75) return '#4ade80'   // green
  if (score >= 50) return '#facc15'   // amber
  return '#f87171'                     // red
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Building'
  return 'Needs attention'
}

/* ─── sub-components ─── */

function AnalystCard({ title, items, variant = 'default' }: { title: string; items: string[]; variant?: 'positive' | 'warning' | 'default' }) {
  return (
    <div className={`analyst-card analyst-card--${variant}`}>
      <h3 className="analyst-card-title">{title}</h3>
      <ul className="analyst-card-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function OpportunitiesCard({ items }: { items: BusinessOpportunity[] }) {
  return (
    <div className="analyst-card analyst-card--opportunity">
      <h3 className="analyst-card-title">Top opportunities right now</h3>
      <ol className="analyst-card-list analyst-card-list--numbered">
        {items.map((opp, i) => (
          <li key={i}>
            <strong>{opp.title}</strong>
            <span className="analyst-opp-rationale">{opp.rationale}</span>
            <span className="analyst-opp-action">{opp.action}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MomentumGauge({ score }: { score: number }) {
  const color = scoreColor(score)
  const label = scoreLabel(score)
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className="momentum-gauge">
      <div className="momentum-gauge-header">
        <span className="momentum-gauge-label">Network health score</span>
        <span className="momentum-gauge-value" style={{ color }}>{score} / 100</span>
      </div>
      <div className="momentum-gauge-track">
        <div className="momentum-gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="momentum-gauge-status" style={{ color }}>{label}</span>
    </div>
  )
}

/* ─── main panel ─── */

export default function BusinessAnalystPanel() {
  const [report, setReport] = useState<BusinessDiagnostic | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const result = await getLatestAnalysis()
        setReport(result.report)
        if (result.error) setError(result.error)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load analysis.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const result = await generateBusinessAnalysis()
      if (result.error) {
        setError(result.error)
      } else {
        setReport(result.report)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="analyst-panel">
      <div className="analyst-panel-header">
        <div>
          <h2 className="analyst-panel-title">AI Business Analyst</h2>
          <p className="analyst-panel-subtitle">
            A strategic brief built from your profile, intro history, and active opportunities.
          </p>
        </div>
        <button
          className="analyst-generate-btn"
          onClick={() => void handleGenerate()}
          disabled={generating}
          aria-busy={generating}
        >
          {generating
            ? 'Analyzing…'
            : report
            ? 'Refresh analysis'
            : 'Generate analysis'}
        </button>
      </div>

      {generating && (
        <div className="analyst-loading" role="status">
          <span className="analyst-spin" aria-hidden="true" />
          Analyzing your business presence…
        </div>
      )}

      {error && !generating && (
        <p className="analyst-error" role="alert">{error}</p>
      )}

      {loading && !generating && (
        <p className="analyst-loading-init">Loading your latest analysis…</p>
      )}

      {!loading && !generating && !report && !error && (
        <div className="analyst-empty">
          <p>No analysis yet. Click <strong>Generate analysis</strong> to get your strategic brief.</p>
        </div>
      )}

      {report && !generating && (
        <div className="analyst-results">
          <MomentumGauge score={report.health_score} />

          <div className="analyst-cards-grid">
            <AnalystCard
              title="Where you're leaking leads"
              items={report.lead_leaks.length ? report.lead_leaks : ['No lead leaks detected']}
              variant="warning"
            />
            <AnalystCard
              title="Cold relationships to reactivate"
              items={report.cold_relationships.length ? report.cold_relationships : ['All key relationships are warm']}
              variant="default"
            />
            <AnalystCard
              title="Partner introductions you need"
              items={report.partner_needs.length ? report.partner_needs : ['No critical gaps identified']}
              variant="positive"
            />
            <OpportunitiesCard
              items={report.top_opportunities.length
                ? report.top_opportunities.slice(0, 3)
                : [{ title: 'No opportunities identified', rationale: 'Generate a fresh analysis to see platform opportunities.', action: '' }]}
            />
          </div>

          <div className="analyst-summary">
            <h3>Summary</h3>
            <p>{report.summary}</p>
            <time className="analyst-timestamp" dateTime={report.generated_at}>
              Generated {new Date(report.generated_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        </div>
      )}
    </div>
  )
}
