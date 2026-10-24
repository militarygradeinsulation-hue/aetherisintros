import { useState } from 'react'
import { ArrowRight, User, Zap, Search } from 'lucide-react'

export interface SpecterEvidence {
  slot: 'whoIAm' | 'whatIBring' | 'whoImLookingFor'
  sourceUrl: string
  confidence: number
  extractedAt: string
}

export interface AskDraft {
  whoIAm: string
  whatIBring: string
  whoImLookingFor: string
  source?: 'manual' | 'specter'
  evidence?: SpecterEvidence[]
}

interface AskIntrosComposerCardProps {
  authorName?: string
  onSubmit?: (draft: AskDraft) => void
  className?: string
}

function MatchSignal({ strength }: { strength: 0 | 1 | 2 | 3 }) {
  return (
    <span className="ask-composer-signal" aria-label={`Match signal: ${strength} of 3`}>
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`ask-composer-signal-dot${i <= strength ? ' filled' : ''}`}
        />
      ))}
    </span>
  )
}

function scoreStrength(draft: AskDraft): 0 | 1 | 2 | 3 {
  const filled = [draft.whoIAm, draft.whatIBring, draft.whoImLookingFor].filter(s => s.trim().length > 10).length
  return filled as 0 | 1 | 2 | 3
}

const SLOTS = [
  { key: 'whoIAm' as const, icon: User, label: 'Who I Am', hint: 'Your role, context, or company type' },
  { key: 'whatIBring' as const, icon: Zap, label: 'What I Bring', hint: 'The value or resource you offer' },
  { key: 'whoImLookingFor' as const, icon: Search, label: 'Who I\'m Looking For', hint: 'The kind of connection you need' },
]

export function AskIntrosComposerCard({ authorName, onSubmit, className = '' }: AskIntrosComposerCardProps) {
  const [draft, setDraft] = useState<AskDraft>({ whoIAm: '', whatIBring: '', whoImLookingFor: '', source: 'manual' })
  const [focused, setFocused] = useState<string | null>(null)

  const strength = scoreStrength(draft)
  const ready = strength === 3

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ready && onSubmit) onSubmit(draft)
  }

  return (
    <form className={`ask-composer-card ${className}`} onSubmit={handleSubmit} noValidate>
      <header className="ask-composer-card__header">
        <span className="ask-composer-card__eyebrow">Compose Your Ask</span>
        {authorName && <span className="ask-composer-card__author">{authorName}</span>}
      </header>

      <div className="ask-composer-card__slots">
        {SLOTS.map(({ key, icon: Icon, label, hint }) => (
          <div
            key={key}
            className={`ask-composer-slot${focused === key ? ' focused' : ''}${draft[key].trim() ? ' filled' : ''}`}
          >
            <label className="ask-composer-slot__label" htmlFor={`ask-slot-${key}`}>
              <Icon size={13} />
              <span>{label}</span>
            </label>
            <textarea
              id={`ask-slot-${key}`}
              className="ask-composer-slot__input"
              value={draft[key]}
              placeholder={hint}
              rows={2}
              onFocus={() => setFocused(key)}
              onBlur={() => setFocused(null)}
              onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <footer className="ask-composer-card__footer">
        <div className="ask-composer-card__meta">
          <MatchSignal strength={strength} />
          <span className="ask-composer-card__hint">
            {strength === 0 && 'Fill each slot to build signal strength'}
            {strength === 1 && 'Good start — two more slots'}
            {strength === 2 && 'Almost there — one more slot'}
            {strength === 3 && 'Strong ask — ready to match'}
          </span>
        </div>
        <button type="submit" className="ask-composer-card__submit" disabled={!ready}>
          Preview <ArrowRight size={14} />
        </button>
      </footer>
    </form>
  )
}
