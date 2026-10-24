import { useState } from 'react'
import { Check, X, Zap } from 'lucide-react'

interface SpecterContext {
  evidenceSummary: string
  profileSource: string
  confidence: number
  approvalRequestId?: string
}

interface ConsentHandshakeProps {
  senderName: string
  recipientName: string
  onConfirm: () => void
  onDecline: () => void
  specterContext?: SpecterContext
}

type Phase = 'idle' | 'approaching' | 'connected' | 'confirmed' | 'declined'

export function ConsentHandshake({ senderName, recipientName, onConfirm, onDecline, specterContext }: ConsentHandshakeProps) {
  const [phase, setPhase] = useState<Phase>('idle')

  const handleConfirm = () => {
    setPhase('approaching')
    setTimeout(() => setPhase('connected'), 600)
    setTimeout(() => {
      setPhase('confirmed')
      onConfirm()
    }, 1300)
  }

  const handleDecline = () => {
    setPhase('declined')
    setTimeout(onDecline, 800)
  }

  const initial = (name: string) => name.trim().charAt(0).toUpperCase()

  return (
    <div className={`consent-handshake consent-handshake--${phase}`} role="dialog" aria-label="Consent to introduction">
      {specterContext && (
        <div className="consent-handshake__specter-ctx">
          <div className="consent-handshake__specter-label">
            <Zap size={11} aria-hidden="true" />
            <span>Specter Intelligence</span>
            <span className="consent-handshake__specter-conf">
              {Math.round(specterContext.confidence * 100)}% confidence
            </span>
          </div>
          <p className="consent-handshake__specter-summary">{specterContext.evidenceSummary}</p>
          <span className="consent-handshake__specter-src">{specterContext.profileSource}</span>
        </div>
      )}
      <p className="consent-handshake__prompt">
        Both parties must agree before an introduction is made.
      </p>

      <div className="consent-handshake__cards">
        <div className="consent-handshake__card consent-handshake__card--sender">
          <span className="consent-handshake__avatar">{initial(senderName)}</span>
          <span className="consent-handshake__name">{senderName}</span>
        </div>

        <div className="consent-handshake__bridge" aria-hidden="true">
          <span className="consent-handshake__dot" />
          <span className="consent-handshake__dot" />
          <span className="consent-handshake__dot" />
        </div>

        <div className="consent-handshake__card consent-handshake__card--recipient">
          <span className="consent-handshake__avatar">{initial(recipientName)}</span>
          <span className="consent-handshake__name">{recipientName}</span>
        </div>
      </div>

      {phase === 'confirmed' && (
        <p className="consent-handshake__success">
          <Check size={14} /> Introduction confirmed
        </p>
      )}

      {phase === 'declined' && (
        <p className="consent-handshake__declined">
          <X size={14} /> Introduction declined
        </p>
      )}

      {(phase === 'idle') && (
        <div className="consent-handshake__actions">
          <button type="button" className="consent-handshake__confirm" onClick={handleConfirm}>
            Confirm introduction
          </button>
          <button type="button" className="consent-handshake__decline" onClick={handleDecline}>
            Decline
          </button>
        </div>
      )}
    </div>
  )
}
