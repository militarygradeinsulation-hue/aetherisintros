type AskIntrosLockupProps = {
  variant?: 'compact' | 'hero' | 'header'
  className?: string
}

/** Official Ask Intros logo (three amber connection dots, ASK INTROS, WHY ME | WHY THEM | WHY NOW). */
export function AskIntrosLockup({ variant = 'compact', className = '' }: AskIntrosLockupProps) {
  const classes = ['ask-intros-lockup', `ask-intros-lockup--${variant}`, 'ask-intros-lockup--image', className].filter(Boolean).join(' ')
  return (
    <img
      className={classes}
      src="/ask-intros-logo.jpg"
      alt="Ask Intros — Why me, why them, why now"
      width={1254}
      height={1254}
      style={{ objectFit: 'cover', objectPosition: 'center 52%', aspectRatio: '2.2 / 1', height: 'auto', borderRadius: 6 }}
    />
  )
}
