/**
 * Track Record Dashboard — reputation score badge, stat tiles, and refresh action.
 * Displays a computed 0-100 reputation score derived from intro outcomes.
 */
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, Users, CheckCircle2 } from 'lucide-react'
import { getReputationScore, computeAndSaveScore, type ReputationScore } from '@/lib/trackRecord.functions'
import { Btn, Eyebrow } from './ui'

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 50) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Building'
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="track-stat">
      <span className="track-stat-icon">{icon}</span>
      <span className="track-stat-value">{value}</span>
      <span className="track-stat-label">{label}</span>
    </div>
  )
}

export function TrackRecordDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<ReputationScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const score = await getReputationScore({ data: { userId } })
      setData(score)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load score.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void load() }, [load])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      const result = await computeAndSaveScore()
      setData(prev => prev
        ? { ...prev, ...result, updated_at: new Date().toISOString() }
        : { id: '', user_id: userId, response_rate: 0, ...result, updated_at: new Date().toISOString() }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed.')
    } finally {
      setRefreshing(false)
    }
  }

  const score = data?.score ?? 0
  const color = scoreColor(score)

  return (
    <div className="reputation-dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <Eyebrow>REPUTATION SCORE</Eyebrow>
        <Btn kind="quiet" disabled={refreshing} onClick={() => void refresh()} style={{ gap: '6px', fontSize: '12px' }}>
          <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Computing…' : 'Refresh Score'}
        </Btn>
      </div>

      {loading ? (
        <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {/* Circular badge */}
            <div className="reputation-badge" style={{ '--score-color': color } as React.CSSProperties}>
              <svg viewBox="0 0 80 80" className="reputation-ring" aria-hidden>
                <circle cx="40" cy="40" r="34" strokeWidth="7" stroke="rgba(255,255,255,.1)" fill="none" />
                <circle
                  cx="40" cy="40" r="34" strokeWidth="7"
                  stroke={color} fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <span className="reputation-score" style={{ color }}>{score}</span>
            </div>
            {/* Label and tagline */}
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--soft)' }}>
                {scoreLabel(score)} reputation
              </p>
              <p style={{ margin: '.25rem 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>
                Based on {data?.total_intros ?? 0} introduction{(data?.total_intros ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="track-stats-row">
            <StatTile
              label="Response Rate"
              value={data?.response_rate != null ? `${Math.round(data.response_rate)}%` : '—'}
              icon={<Users size={14} />}
            />
            <StatTile
              label="Success Rate"
              value={data?.intro_success_rate != null ? `${Math.round(data.intro_success_rate)}%` : '—'}
              icon={<TrendingUp size={14} />}
            />
            <StatTile
              label="Follow-Through"
              value={data?.follow_through_rate != null ? `${Math.round(data.follow_through_rate)}%` : '—'}
              icon={<CheckCircle2 size={14} />}
            />
          </div>

          {data?.updated_at && (
            <p style={{ marginTop: '.75rem', fontSize: '.72rem', color: 'var(--muted)', textAlign: 'right' }}>
              Last updated {new Date(data.updated_at).toLocaleDateString()}
            </p>
          )}
        </>
      )}

      {error && <p style={{ color: 'var(--danger, #e05252)', fontSize: '.8rem', marginTop: '.5rem' }}>{error}</p>}
    </div>
  )
}
