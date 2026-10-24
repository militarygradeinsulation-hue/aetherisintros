import { Target, TrendingUp, ChevronRight } from 'lucide-react'
import type { AskDraft } from './AskIntrosComposerCard'

export interface GapOpportunity {
  id: string
  title: string
  description: string
  impactEstimate: string
  matchCount: number
  industry: string
  urgency: 'high' | 'medium' | 'low'
}

const MOCK_OPPORTUNITIES: GapOpportunity[] = [
  {
    id: 'gap-001',
    title: 'No Enterprise Sales Motion',
    description: 'Specter detected no structured enterprise outbound process. This gap is estimated to represent unaddressed ARR potential.',
    impactEstimate: '$400K+ ARR opportunity',
    matchCount: 3,
    industry: 'SaaS',
    urgency: 'high',
  },
  {
    id: 'gap-002',
    title: 'Healthcare Distribution Gap',
    description: 'No identified distribution relationships with hospital systems or group purchasing organizations.',
    impactEstimate: '$250K+ channel revenue',
    matchCount: 2,
    industry: 'Healthcare',
    urgency: 'medium',
  },
]

const URGENCY_LABELS = { high: '↑ High', medium: '→ Medium', low: '↓ Low' }

interface GapOpportunityCardProps {
  opportunity: GapOpportunity
  onBuildAsk: (draft: Partial<AskDraft>) => void
}

export function GapOpportunityCard({ opportunity, onBuildAsk }: GapOpportunityCardProps) {
  return (
    <div className={`gap-opp-card gap-opp-card--${opportunity.urgency}`}>
      <div className="gap-opp-card__header">
        <Target size={14} className="gap-opp-card__icon" aria-hidden="true" />
        <div className="gap-opp-card__header-text">
          <div className="gap-opp-card__title">{opportunity.title}</div>
          <div className="gap-opp-card__industry">{opportunity.industry}</div>
        </div>
        <span className={`gap-opp-card__urgency gap-opp-card__urgency--${opportunity.urgency}`}>
          {URGENCY_LABELS[opportunity.urgency]}
        </span>
      </div>
      <p className="gap-opp-card__desc">{opportunity.description}</p>
      <div className="gap-opp-card__impact">
        <TrendingUp size={11} aria-hidden="true" />
        <span>{opportunity.impactEstimate}</span>
      </div>
      <div className="gap-opp-card__footer">
        <span className="gap-opp-card__matches">
          {opportunity.matchCount} network match{opportunity.matchCount !== 1 ? 'es' : ''}
        </span>
        <button
          type="button"
          className="gap-opp-card__cta"
          onClick={() => onBuildAsk({
            whoImLookingFor: opportunity.description,
            source: 'specter',
            evidence: [{
              slot: 'whoImLookingFor' as const,
              sourceUrl: `specter://gap/${opportunity.id}`,
              confidence: 0.85,
              extractedAt: new Date().toISOString(),
            }],
          })}
        >
          Build Ask <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

interface GapOpportunityFeedProps {
  onBuildAsk: (draft: Partial<AskDraft>) => void
  className?: string
}

export function GapOpportunityFeed({ onBuildAsk, className = '' }: GapOpportunityFeedProps) {
  return (
    <div className={`gap-opp-feed ${className}`}>
      <div className="gap-opp-feed__header">
        <Target size={13} aria-hidden="true" />
        <span>Gap Opportunities</span>
        <span className="gap-opp-feed__sub">Detected by Specter · Route to your network</span>
      </div>
      <div className="gap-opp-feed__list">
        {MOCK_OPPORTUNITIES.map(opp => (
          <GapOpportunityCard key={opp.id} opportunity={opp} onBuildAsk={onBuildAsk} />
        ))}
      </div>
    </div>
  )
}
