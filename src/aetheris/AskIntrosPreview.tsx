import { useState } from 'react'
import { Eye, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import type { AskDraft } from './AskIntrosComposerCard'

interface AskIntrosPreviewProps {
  draft: AskDraft
  authorName?: string
  authorRole?: string
}

export function AskIntrosPreview({ draft, authorName = 'You', authorRole }: AskIntrosPreviewProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const hasContent = draft.whoIAm.trim() || draft.whatIBring.trim() || draft.whoImLookingFor.trim()
  const isSpecterSourced = draft.source === 'specter' && draft.evidence && draft.evidence.length > 0

  return (
    <div className="ask-preview">
      <div className="ask-preview__label">
        <Eye size={12} />
        <span>How another member sees this ask</span>
      </div>

      <div className="ask-preview__card">
        <div className="ask-preview__author">
          <span className="ask-preview__avatar" aria-hidden="true">
            {authorName.charAt(0).toUpperCase()}
          </span>
          <div>
            <b>{authorName}</b>
            {authorRole && <small>{authorRole}</small>}
          </div>
        </div>

        {hasContent ? (
          <dl className="ask-preview__body">
            {draft.whoIAm.trim() && (
              <div className="ask-preview__row">
                <dt>Who I am</dt>
                <dd>{draft.whoIAm}</dd>
              </div>
            )}
            {draft.whatIBring.trim() && (
              <div className="ask-preview__row">
                <dt>What I bring</dt>
                <dd>{draft.whatIBring}</dd>
              </div>
            )}
            {draft.whoImLookingFor.trim() && (
              <div className="ask-preview__row">
                <dt>Who I'm looking for</dt>
                <dd>{draft.whoImLookingFor}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="ask-preview__empty">Your ask will appear here as you fill in the slots.</p>
        )}

        <div className="ask-preview__consent-note">
          Introductions require consent from both parties.
        </div>

        {isSpecterSourced && draft.evidence && (
          <div className="ask-preview__evidence">
            <button
              type="button"
              className="ask-preview__evidence-toggle"
              onClick={() => setEvidenceOpen(v => !v)}
              aria-expanded={evidenceOpen}
            >
              <Zap size={11} aria-hidden="true" />
              <span>Specter Detection Evidence</span>
              {evidenceOpen ? <ChevronUp size={11} aria-hidden="true" /> : <ChevronDown size={11} aria-hidden="true" />}
            </button>
            {evidenceOpen && (
              <ul className="ask-preview__evidence-list">
                {draft.evidence.map((ev, i) => (
                  <li key={i} className="ask-preview__evidence-item">
                    <span className="ask-preview__evidence-slot">{ev.slot.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                    <span className="ask-preview__evidence-conf">{Math.round(ev.confidence * 100)}% confidence</span>
                    <span className="ask-preview__evidence-src">{ev.sourceUrl}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
