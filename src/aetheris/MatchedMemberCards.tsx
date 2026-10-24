import { Lock, Users, ChevronRight } from 'lucide-react'

interface MatchedMemberCardsProps {
  count?: 2 | 3
  onRequestIntro?: () => void
  className?: string
}

type CardData = { tags: string[]; role: string; matchPct: number; mutuals: number }

const PLACEHOLDER_CARDS: CardData[] = [
  { tags: ['Healthcare', 'Strategy', 'Innovation'], role: 'Chief Strategy Officer', matchPct: 75, mutuals: 3 },
  { tags: ['Venture Capital', 'Investing', 'Growth'], role: 'Managing Partner', matchPct: 62, mutuals: 5 },
  { tags: ['Technology', 'AI', 'Enterprise'], role: 'CEO', matchPct: 68, mutuals: 2 },
]

function MatchRing({ pct }: { pct: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg className="matched-card__ring" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(37,99,235,.12)" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke="#2563EB" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="600" fill="#2563EB">{pct}%</text>
    </svg>
  )
}

export function MatchedMemberCards({ count = 2, onRequestIntro, className = '' }: MatchedMemberCardsProps) {
  const cards = PLACEHOLDER_CARDS.slice(0, count)

  return (
    <div className={`matched-cards ${className}`}>
      <div className="matched-cards__header">
        <Users size={14} aria-hidden="true" />
        <span>{count} potential match{count > 1 ? 'es' : ''} found in your network</span>
      </div>

      <div className="matched-cards__list">
        {cards.map((card, i) => (
          <div key={i} className="matched-card" aria-hidden="true">
            <div className="matched-card__avatar" />
            <div className="matched-card__body">
              <div className="matched-card__name-row">
                <div className="matched-card__name" />
                <div className="matched-card__role-text">{card.role}</div>
              </div>
              <div className="matched-card__tags">
                {card.tags.map(tag => (
                  <span key={tag} className="matched-card__tag">{tag}</span>
                ))}
              </div>
              <div className="matched-card__mutuals">
                <Lock size={10} />
                <span>{card.mutuals} mutual connection{card.mutuals > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="matched-card__score">
              <MatchRing pct={card.matchPct} />
              <span className="matched-card__score-label">Match Score</span>
            </div>
          </div>
        ))}
      </div>

      <p className="matched-cards__note">
        Member contact details are private until both parties consent to the introduction.
      </p>

      {onRequestIntro && (
        <button className="matched-cards__cta" type="button" onClick={onRequestIntro}>
          Request introduction <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
