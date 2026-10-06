import { useEffect, useRef, useState } from 'react'

/**
 * Ambient pointer layer for the public landing page, adapted from the
 * "Digital Serenity" reference in Aetheris colors: a soft cobalt glow that
 * follows the pointer and a thin amber ripple on click. Purely decorative,
 * pointer-events none, disabled for reduced-motion users.
 */
export default function SerenityAmbient() {
  const glowRef = useRef<HTMLDivElement>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const glow = glowRef.current
    if (!glow) return
    const onMove = (e: MouseEvent) => {
      glow.style.left = `${e.clientX}px`
      glow.style.top = `${e.clientY}px`
      glow.style.opacity = '1'
    }
    const onLeave = () => { glow.style.opacity = '0' }
    const onClick = (e: MouseEvent) => {
      const id = Date.now()
      setRipples(prev => [...prev.slice(-5), { id, x: e.clientX, y: e.clientY }])
      window.setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 900)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <>
      <div ref={glowRef} className="serenity-glow" aria-hidden="true" />
      {ripples.map(r => <span key={r.id} className="serenity-ripple" style={{ left: r.x, top: r.y }} aria-hidden="true" />)}
    </>
  )
}
