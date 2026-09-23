import type { ReactNode } from 'react'

export type TileVariant = 'hero' | 'wide' | 'tall' | 'compact' | 'data' | 'graph' | 'action'

export function HubIntro({ label, title, copy, aside }: {
  label: string; title: ReactNode; copy: string; aside?: ReactNode
}) {
  return <header className="hub-intro">
    <div><span>{label}</span><h1>{title}</h1><p>{copy}</p></div>
    {aside && <aside>{aside}</aside>}
  </header>
}

export function TileShell({ label, title, children, variant = 'compact', action, className = '' }: {
  label: string; title: ReactNode; children?: ReactNode; variant?: TileVariant; action?: ReactNode; className?: string
}) {
  return <article className={`feature-tile feature-tile-${variant} ${className}`}>
    <header><span>{label}</span>{action}</header>
    <h2>{title}</h2>
    {children}
  </article>
}

export function SignalPath({ points = 4, active = 1 }: { points?: number; active?: number }) {
  return <div className="tile-signal-path" aria-hidden="true">
    {Array.from({ length: points }, (_, index) => <span key={index} className={index === active ? 'active' : ''} />)}
  </div>
}

export function RadarMini({ values }: { values: number[] }) {
  return <div className="tile-radar" aria-hidden="true">
    <i /><i /><i />
    {values.slice(0, 5).map((value, index) => <b key={`${value}-${index}`} style={{ '--radar-angle': `${index * 72}deg`, '--radar-distance': `${24 + Math.min(48, value / 2)}px` } as React.CSSProperties} />)}
  </div>
}