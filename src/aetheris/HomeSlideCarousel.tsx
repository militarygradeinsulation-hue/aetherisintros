import { useEffect, useState } from 'react'
import { HOME_SLIDES } from './home-slides'
import './home-slides.css'

const DWELL_MS = 5000

/**
 * The homepage hero's image area: the member's own Ask Intros brand graphics,
 * each held for five seconds before the next one arrives. There are no visible
 * controls — the pictures simply move. Hovering holds the current picture, and
 * a visitor who asks for less motion sees a single still picture instead.
 */
export function HomeSlideCarousel() {
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [reduced, setReduced] = useState(false)
  const count = HOME_SLIDES.length

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (hovered || reduced) return
    const timer = window.setInterval(() => setIndex(i => (i + 1) % count), DWELL_MS)
    return () => window.clearInterval(timer)
  }, [hovered, reduced, count])

  useEffect(() => {
    const next = HOME_SLIDES[(index + 1) % count]
    if (!next) return
    const preload = new Image()
    preload.src = next.src
  }, [index, count])

  return (
    <div
      className="ael-hero-slides"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {HOME_SLIDES.map((slide, i) => (
        <div key={slide.src} className={i === index ? 'ael-hero-slide is-active' : 'ael-hero-slide'} aria-hidden={i !== index}>
          <img
            src={slide.src}
            alt={i === index ? slide.alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      ))}
    </div>
  )
}
