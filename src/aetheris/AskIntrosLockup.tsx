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
      src="/ask-intros-logo-wide.jpg"
      alt="Ask Intros — Why me, why them, why now"
      width={1015}
      height={580}
      style={{ display: "block", height: "auto", borderRadius: 6 }}
    />
  )
}
