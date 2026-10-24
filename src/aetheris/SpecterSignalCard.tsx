import { ChevronRight } from 'lucide-react'
import type { AskDraft } from './AskIntrosComposerCard'

export interface SpecterSignal {
  id: string
  gapType: string
  gapDescription: string
  confidence: number
  industry?: string
  impactLabel?: string
  findingId?: string
  timestamp: string
}

interface SpecterSignalCardProps {
  signal: SpecterSignal
  onBuildAsk: (draft: Partial<AskDraft>) => void
}

function ConfidenceRing({ pct }: { pct: number }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg className="specter-signal-card__ring" viewBox="0 0 32 32" aria-label={`${pct}% confidence`}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(20,184,166,.18)" strokeWidth="3" />
      <circle
        cx="16" cy="16" r={r} fill="none"
        stroke="#14B8A6" strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 16 16)"
      />
      <text x="16" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fill="#14B8A6">{pct}%</text>
    </svg>
  )
}

export function SpecterSignalCard({ signal, onBuildAsk }: SpecterSignalCardProps) {
  const pct = Math.round(signal.confidence * 100)

  const handleBuild = () => {
    onBuildAsk({
      whoImLookingFor: signal.gapDescription,
      source: 'specter',
      evidence: [{
        slot: 'whoImLookingFor' as const,
        sourceUrl: `specter://finding/${signal.findingId || signal.id}`,
        confidence: signal.confidence,
        extractedAt: signal.timestamp,
      }],
    })
  }

  return (
    <div className="specter-signal-card">
      <div className="specter-signal-card__header">
        <ConfidenceRing pct={pct} />
        <div className="specter-signal-card__meta">
          <div className="specter-signal-card__gap">{signal.gapType}</div>
          {signal.industry && (
            <div className="specter-signal-card__industry">{signal.industry}</div>
          )}
        </div>
        {signal.impactLabel && (
          <span className="specter-signal-card__impact">{signal.impactLabel}</span>
        )}
      </div>
      <p className="specter-signal-card__desc">{signal.gapDescription}</p>
      <button type="button" className="specter-signal-card__cta" onClick={handleBuild}>
        Build Ask <ChevronRight size={12} aria-hidden="true" />
      </button>
    </div>
  )
}
