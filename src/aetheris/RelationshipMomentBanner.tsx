import { useState } from 'react'
import { Zap, X, ChevronRight } from 'lucide-react'

export type TriggerType = 'funding_round' | 'new_hire' | 'product_launch' | 'news'

export interface RelationshipMoment {
  id: string
  triggerType: TriggerType
  companyName: string
  eventSummary: string
  warmPathCount: number
  daysRemaining: number
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  funding_round: 'Funding Announced',
  new_hire: 'Key Hire',
  product_launch: 'Product Launch',
  news: 'In the News',
}

const MOCK_MOMENT: RelationshipMoment = {
  id: 'moment-001',
  triggerType: 'funding_round',
  companyName: 'Meridian Health AI',
  eventSummary: 'Meridian Health AI just announced a $28M Series B led by Horizon Capital.',
  warmPathCount: 3,
  daysRemaining: 11,
}

interface RelationshipMomentBannerProps {
  moment?: RelationshipMoment
  onViewPaths?: () => void
  className?: string
}

export function RelationshipMomentBanner({
  moment = MOCK_MOMENT,
  onViewPaths,
  className = '',
}: RelationshipMomentBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className={`rel-moment-banner ${className}`} role="status" aria-live="polite">
      <div className="rel-moment-banner__left">
        <Zap size={13} className="rel-moment-banner__icon" aria-hidden="true" />
        <div className="rel-moment-banner__content">
          <span className="rel-moment-banner__trigger">
            {TRIGGER_LABELS[moment.triggerType]}
          </span>
          <span className="rel-moment-banner__company">{moment.companyName}</span>
          <span className="rel-moment-banner__event">{moment.eventSummary}</span>
        </div>
      </div>
      <div className="rel-moment-banner__right">
        <span className="rel-moment-banner__paths">
          {moment.warmPathCount} warm path{moment.warmPathCount !== 1 ? 's' : ''}
        </span>
        <span className="rel-moment-banner__deadline">{moment.daysRemaining}d window</span>
        {onViewPaths && (
          <button type="button" className="rel-moment-banner__cta" onClick={onViewPaths}>
            View <ChevronRight size={10} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="rel-moment-banner__dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss relationship moment"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
