import logoAsset from '@/assets/ask-intros-official-logo.jpg.asset.json'

type AskIntrosLockupProps = {
  variant?: 'compact' | 'hero' | 'header'
  className?: string
}

export function AskIntrosLockup({ variant = 'compact', className = '' }: AskIntrosLockupProps) {
  return <span className={`official-logo official-logo--${variant} ${className}`} role="img" aria-label="Ask Intros — Why me, why them, why now">
    {variant === 'header' ? <>
      <span className="official-logo-symbol" aria-hidden="true"><img src={logoAsset.url} alt="" width={1254} height={1254} /></span>
      <span className="official-logo-lettering" aria-hidden="true"><img src={logoAsset.url} alt="" width={1254} height={1254} /></span>
    </> : <img src={logoAsset.url} alt="" width={1254} height={1254} />}
  </span>
}