import { AskIntrosMark } from '@/aetheris/AskIntrosMark'
import { useId } from 'react'

type AskIntrosLockupProps = {
  variant?: 'compact' | 'hero'
  className?: string
}

export function AskIntrosLockup({ variant = 'compact', className = '' }: AskIntrosLockupProps) {
  const titleId = useId()
  const classes = ['ask-intros-lockup', `ask-intros-lockup--${variant}`, className].filter(Boolean).join(' ')

  return (
    <svg
      className={classes}
      viewBox="0 0 520 252"
      role="img"
      aria-labelledby={titleId}
      preserveAspectRatio="xMinYMid meet"
    >
      <title id={titleId}>Ask Intros — Why me, why them, why now</title>
      <g className="ask-intros-lockup__symbol" aria-hidden="true">
        <AskIntrosMark x={35} y={-25} size={144} />
      </g>

      <text className="ask-intros-lockup__ask" x="14" y="157">ASK</text>
      <text className="ask-intros-lockup__intros" x="205" y="157">INTROS</text>

      <line className="ask-intros-lockup__rule" x1="14" y1="181" x2="487" y2="181" aria-hidden="true" />
      <circle className="ask-intros-lockup__rule-dot" cx="499" cy="181" r="5" aria-hidden="true" />

      <text className="ask-intros-lockup__tagline" x="260" y="224" textAnchor="middle">
        WHY ME <tspan className="ask-intros-lockup__separator">|</tspan> WHY THEM <tspan className="ask-intros-lockup__separator">|</tspan> WHY NOW
      </text>
    </svg>
  )
}