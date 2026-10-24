import type { SVGProps } from 'react'

/** Ask Intros' own connection identity: three people joined by one introduction bridge. */
export type AskIntrosMarkProps = Omit<SVGProps<SVGSVGElement>, 'size'> & {
  size?: number | string
  title?: string
}
export function AskIntrosMark({ size = 20, title, className = '', ...props }: AskIntrosMarkProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"
      width={props.width ?? size} height={props.height ?? size} fill="none"
      className={['ask-intros-mark', className].filter(Boolean).join(' ')}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} data-ask-intros-mark="">
      {title ? <title>{title}</title> : null}
      <path d="M9.5 35 24 10.5 38.5 35" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 27.5H32" stroke="var(--ask-mark-accent, #EF4444)" strokeWidth="3.8" strokeLinecap="round" />
      <circle cx="9.5" cy="35" r="3.7" fill="currentColor" />
      <circle cx="24" cy="10.5" r="3.7" fill="var(--ask-mark-accent, #EF4444)" />
      <circle cx="38.5" cy="35" r="3.7" fill="currentColor" />
    </svg>
  )
}
