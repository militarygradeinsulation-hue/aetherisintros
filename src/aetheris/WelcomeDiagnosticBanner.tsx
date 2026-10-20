/**
 * WelcomeDiagnosticBanner — shown once to new members on their first visit to the
 * live network. Prompts them to run the AI Business Analyst immediately so they
 * experience first-session value before the feed populates.
 *
 * The banner reads a localStorage flag set by onboarding.tsx after profile save.
 * It clears the flag on dismiss or after the panel is expanded.
 */
import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import BusinessAnalystPanel from './BusinessAnalystPanel'

const FLAG = 'ai-welcome-pending'

function readFlag(): boolean {
  try { return localStorage.getItem(FLAG) === '1' } catch { return false }
}

function clearFlag(): void {
  try { localStorage.removeItem(FLAG) } catch { /* storage blocked */ }
}

export function WelcomeDiagnosticBanner() {
  const [hasPending] = useState(readFlag)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!hasPending || dismissed) return null

  if (expanded) {
    return (
      <div className="welcome-diagnostic-expanded" role="region" aria-label="AI Business Analysis">
        <div className="welcome-diagnostic-expanded-header">
          <span className="folio">FIRST SESSION / YOUR BUSINESS BRIEF</span>
          <button
            type="button"
            className="welcome-diagnostic-close"
            onClick={() => { clearFlag(); setDismissed(true) }}
            aria-label="Close analysis"
          >
            <X size={16} />
          </button>
        </div>
        <BusinessAnalystPanel />
      </div>
    )
  }

  return (
    <div className="welcome-diagnostic-banner" role="complementary" aria-label="Get your first business insight">
      <div className="welcome-diagnostic-copy">
        <span className="folio">WELCOME TO ASK INTROS</span>
        <p>
          <strong>What does your network say about your business?</strong>{' '}
          Your AI Business Analyst reads your profile, intro history, and active asks — then surfaces where you are leaking leads, which relationships have gone cold, and which introductions would move your business forward right now.
        </p>
      </div>
      <div className="welcome-diagnostic-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => setExpanded(true)}
        >
          Run my first analysis <ArrowRight size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => { clearFlag(); setDismissed(true) }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
