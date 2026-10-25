import { useEffect, useRef, useState } from 'react'
import type { ConnectionResult } from './lib/connection-preflight'

type Beam = { id: string; path: string; verified: boolean }
/** Adapted from the supplied AnimatedBeam geometry. It decorates actual read results only. */
export function ConnectionReadBeams({ rows }: { rows: ConnectionResult[] }) {
  const anchor = useRef<SVGSVGElement>(null)
  const [beams, setBeams] = useState<Beam[]>([])
  const [size, setSize] = useState({ width: 1, height: 1 })
  useEffect(() => {
    const host = anchor.current?.parentElement
    if (!host) return
    const update = () => {
      const bounds = host.getBoundingClientRect()
      setSize({width:bounds.width,height:bounds.height})
      setBeams(rows.flatMap(row => {
        const card = host.querySelector<HTMLElement>(`[data-connection-id="${row.id}"]`)
        if (!card) return []
        const rect = card.getBoundingClientRect()
        const x = rect.left - bounds.left + rect.width / 2
        const y = rect.top - bounds.top
        return [{id:row.id,path:`M ${bounds.width / 2} 0 Q ${x} ${Math.max(12,y / 2)} ${x} ${y}`,verified:row.state === 'read_verified'}]
      }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    window.addEventListener('resize',update)
    return () => { observer.disconnect(); window.removeEventListener('resize',update) }
  }, [rows])
  return <svg ref={anchor} className="admin-read-beams" aria-hidden="true" width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
    {beams.map(beam => <g key={beam.id}><path d={beam.path} className="admin-read-beam-base"/>{beam.verified && <path d={beam.path} className="admin-read-beam-confirmed" pathLength={100}/>}</g>)}
  </svg>
}
