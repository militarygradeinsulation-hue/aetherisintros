import { Zap } from 'lucide-react'
import { SpecterSignalCard } from './SpecterSignalCard'
import type { SpecterSignal } from './SpecterSignalCard'
import type { AskDraft } from './AskIntrosComposerCard'

const MOCK_SIGNALS: SpecterSignal[] = [
  {
    id: 'sig-001',
    gapType: 'Enterprise Sales Capability',
    gapDescription: 'No enterprise sales motion identified. Looking for a seasoned VP Sales with SaaS enterprise experience who can establish a repeatable outbound process.',
    confidence: 0.87,
    industry: 'SaaS / B2B',
    impactLabel: 'High Impact',
    findingId: 'find-091',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'sig-002',
    gapType: 'Healthcare Distribution Partner',
    gapDescription: 'Missing a trusted distribution relationship in healthcare systems. Looking for a connector with established relationships in hospital procurement or health system networks.',
    confidence: 0.74,
    industry: 'Healthcare',
    impactLabel: 'Medium Impact',
    findingId: 'find-088',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'sig-003',
    gapType: 'CFO-Level Financial Oversight',
    gapDescription: 'No CFO-level financial governance visible. Looking for an experienced CFO or fractional CFO who has taken a SaaS company from Series A to profitability.',
    confidence: 0.81,
    industry: 'Finance / Operations',
    impactLabel: 'High Impact',
    findingId: 'find-085',
    timestamp: new Date().toISOString(),
  },
]

interface SpecterSignalFeedProps {
  onBuildAsk: (draft: Partial<AskDraft>) => void
  className?: string
}

export function SpecterSignalFeed({ onBuildAsk, className = '' }: SpecterSignalFeedProps) {
  return (
    <div className={`specter-signal-feed ${className}`}>
      <div className="specter-signal-feed__header">
        <Zap size={13} aria-hidden="true" />
        <span>Specter Detection Signals</span>
        <span className="specter-signal-feed__count">{MOCK_SIGNALS.length} active</span>
      </div>
      <p className="specter-signal-feed__sub">
        Business gaps detected by Specter. Each signal can be routed into a warm introduction ask.
      </p>
      <div className="specter-signal-feed__list">
        {MOCK_SIGNALS.map(signal => (
          <SpecterSignalCard key={signal.id} signal={signal} onBuildAsk={onBuildAsk} />
        ))}
      </div>
    </div>
  )
}
