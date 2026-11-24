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
    let interacting = false
    let resumeTimer: ReturnType<typeof setTimeout> | undefined
    let last = 0
    let rect = canvas.getBoundingClientRect()
    let nodes: Node[] = []
    let beams: Beam[] = []
    const mouse = { x: -1000, y: -1000 }

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.5)
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const init = () => {
      const count = Math.max(24, Math.round((width * height) / 16000))
      nodes = Array.from({ length: Math.min(count, width < 768 ? 32 : 72) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: Math.random() * 0.4 + 0.1,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!,
      }))
      beams = Array.from({ length: Math.min(width < 768 ? 8 : 16, Math.max(6, Math.round(width / 60))) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 100 + 50,
        speed: Math.random() * 6 + 3,
        opacity: Math.random() * 0.28 + 0.12,
      }))
    }

    const onMove = (e: MouseEvent) => {
      if (interacting || motion.matches || document.hidden) return
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000 }

    const draw = (now: number, still = false) => {
      const step = still || motion.matches ? 0 : Math.min((now - last) / 16.667 || 1, 3)
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
        if (!still && (dist < 180 || Math.random() > 0.98)) {
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

    }

    const running = () => !motion.matches && !document.hidden && !interacting
    const tick = (now: number) => {
      raf = 0
      if (!running()) return
      // Preserve the motion at idle but leave the other display frames for UI.
      if (now - last >= 1000 / 24) draw(now)
      raf = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = 0
      const active = running()
      canvas.dataset['motion'] = active ? 'running' : 'paused'
      if (active) { last = performance.now(); raf = requestAnimationFrame(tick) }
    }
    const redraw = () => {
      if (!document.hidden) draw(performance.now(), true)
      sync()
    }
    const onInteraction = () => {
      if (document.hidden || motion.matches) return
      if (!interacting) {
        interacting = true
        onLeave()
        sync()
      }
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        interacting = false
        rect = canvas.getBoundingClientRect()
        sync()
      }, 180)
    }
    resize()
    init()
    redraw()
    const onResize = () => { resize(); init(); redraw() }
    const onVisibility = () => { if (document.hidden) sync(); else redraw() }
    const observer = new MutationObserver(() => { updateColor(); redraw() })
    observer.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']})
    motion.addEventListener('change', redraw)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove, {passive:true})
    window.addEventListener('mouseout', onLeave)
    document.addEventListener('scroll', onInteraction, {capture:true,passive:true})
    window.addEventListener('aetheris:workspace-navigated', onInteraction)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resumeTimer)
      document.removeEventListener('scroll', onInteraction, true)
      window.removeEventListener('aetheris:workspace-navigated', onInteraction)
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
