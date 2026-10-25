import { useEffect, useRef } from 'react'

// Native, brand-styled version of the supplied "Particle Drift" effect:
// rising beams, drifting ASCII glyph nodes, hairline proximity links,
// cursor-connected nodes — rendered on a plain canvas in the Ask Intros
// view palette (no iframe, no CDN scripts).
const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*()'.split('')
const BLUE = '96, 165, 250'
const RED = '239, 68, 68'

type Node = { x: number; y: number; vy: number; char: string }
type Beam = { x: number; y: number; length: number; speed: number; opacity: number }

export default function ParticleDrift({ className, view = 'social' }: { className?: string; view?: 'social' | 'business' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let color = view === 'social' ? BLUE : RED
    const updateColor = () => {
      const light = document.documentElement.dataset['theme'] === 'light'
      color = view === 'social' ? (light ? '37, 99, 235' : BLUE) : (light ? '185, 28, 28' : RED)
    }
    updateColor()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let raf = 0
    let nodes: Node[] = []
    let beams: Beam[] = []
    const mouse = { x: -1000, y: -1000 }

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const init = () => {
      const count = Math.max(24, Math.round((width * height) / 16000))
      nodes = Array.from({ length: Math.min(count, 110) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: Math.random() * 0.4 + 0.1,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!,
      }))
      beams = Array.from({ length: Math.min(25, Math.max(8, Math.round(width / 60))) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 100 + 50,
        speed: Math.random() * 6 + 3,
        opacity: Math.random() * 0.28 + 0.12,
      }))
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000 }

    let last = 0
    const draw = (now = 0) => {
      const step = motion.matches ? 0 : Math.min((now - last) / 16.667 || 1, 2)
      last = now
      ctx.clearRect(0, 0, width, height)

      // Rising beams
      for (const b of beams) {
        b.y -= b.speed * step
        if (b.y + b.length < 0) {
          b.y = height + 100
          b.x = Math.random() * width
        }
        const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.length)
        g.addColorStop(0, `rgba(${color}, ${b.opacity})`)
        g.addColorStop(1, 'transparent')
        ctx.strokeStyle = g
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x, b.y + b.length)
        ctx.stroke()
      }

      // Proximity hairlines
      ctx.lineWidth = 0.5
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 120) {
            ctx.strokeStyle = `rgba(${color}, ${0.15 * (1 - d / 120)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Drifting glyph nodes
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const n of nodes) {
        n.y += n.vy * step
        if (n.y > height + 20) {
          n.y = -20
          n.x = Math.random() * width
        }
        const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y)
        if (dist < 180 || Math.random() > 0.98) {
          n.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!
        }
        if (dist < 180) {
          ctx.strokeStyle = `rgba(${color}, ${0.5 * (1 - dist / 180)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(n.x, n.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
        ctx.fillStyle = `rgba(${color}, ${dist < 180 ? 0.85 : 0.4})`
        ctx.fillText(n.char, n.x, n.y)
      }

      if (!motion.matches && !document.hidden) raf = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()
    const redraw = () => { cancelAnimationFrame(raf); last = 0; draw() }
    const onResize = () => { resize(); init(); redraw() }
    const onVisibility = () => { cancelAnimationFrame(raf); if (!document.hidden) redraw() }
    const observer = new MutationObserver(() => { updateColor(); redraw() })
    observer.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']})
    motion.addEventListener('change', redraw)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseout', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      motion.removeEventListener('change', redraw)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
    }
  }, [view])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
