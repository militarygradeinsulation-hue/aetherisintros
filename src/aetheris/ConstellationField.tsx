import { useEffect, useRef } from 'react'

// Native, brand-styled version of the supplied "Constellation Field" effect:
// slowly drifting nodes joined by hairline links — a quiet network metaphor
// in the Ask Intros palette (warm-gold nodes, cobalt links, graphite fades).
const GOLD = '199, 133, 34'    // warm gold rgb
const AMBER = '244, 161, 37'   // signal amber rgb
const COBALT = '96, 165, 250'  // cobalt-bright rgb

type Node = { x: number; y: number; vx: number; vy: number; radius: number; signal: boolean }

export default function ConstellationField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let raf = 0
    let nodes: Node[] = []
    const LINK = 160
    const mouse = { x: -1000, y: -1000 }

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const init = () => {
      const max = window.innerWidth < 768 ? 40 : 85
      const count = Math.max(18, Math.min(max, Math.round((width * height) / 14000)))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2.4 + 1.8,
        signal: Math.random() < 0.1, // sparse amber intelligence signals
      }))
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000 }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Hairline links between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < LINK) {
            const alpha = 0.22 * (1 - d / LINK)
            ctx.strokeStyle = `rgba(${COBALT}, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Drifting nodes
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -20) n.x = width + 20
        if (n.x > width + 20) n.x = -20
        if (n.y < -20) n.y = height + 20
        if (n.y > height + 20) n.y = -20

        // Gentle attraction toward the cursor, like a network noticing attention
        const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y)
        if (dist < 200 && dist > 0.001) {
          const pull = 0.012 * (1 - dist / 200)
          n.vx += ((mouse.x - n.x) / dist) * pull
          n.vy += ((mouse.y - n.y) / dist) * pull
        }
        n.vx = Math.max(-0.5, Math.min(0.5, n.vx))
        n.vy = Math.max(-0.5, Math.min(0.5, n.vy))

        const base = n.signal ? AMBER : GOLD
        const near = dist < 200
        ctx.fillStyle = `rgba(${base}, ${near ? 0.95 : 0.55})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius * (near ? 1.25 : 1), 0, Math.PI * 2)
        ctx.fill()
        if (n.signal) {
          ctx.fillStyle = `rgba(${AMBER}, 0.12)`
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius * 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()
    const onResize = () => { resize(); init() }
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseout', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
