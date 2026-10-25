import { useEffect, useRef, useState } from 'react'
import { HOME_SLIDES } from './home-slides'
import './home-slides.css'

const DWELL_MS = 5000

/**
 * The homepage hero's image area: the member's own Ask Intros brand graphics,
 * rotating every five seconds. Hovering or focusing pauses the rotation, and a
 * visible control lets anyone stop or restart it. With reduced motion the
 * rotation waits for the visitor instead of looping on its own.
 */
export function HomeSlideCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const count = HOME_SLIDES.length
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (paused || reduced) return
    const timer = window.setInterval(() => setIndex(i => (i + 1) % count), DWELL_MS)
    return () => window.clearInterval(timer)
  }, [paused, reduced, count])

  useEffect(() => {
    const next = HOME_SLIDES[(index + 1) % count]
    if (!next) return
    const preload = new Image()
    preload.src = next.src
  }, [index, count])


  return <>
    <div
      className="ael-hero-slides"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
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

    <div className="ael-hero-slide-controls">
      <button
        type="button"
        className="ael-hero-slide-toggle"
        onClick={() => setPaused(p => !p)}
      >
        {paused ? 'Play images' : 'Pause images'}
      </button>
      <div
        className="ael-hero-slide-dots"
        ref={dotsRef}
        role="group"
        aria-label="Choose a homepage image"
        onKeyDown={event => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
          event.preventDefault()
          const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count
          setIndex(next)
          dotsRef.current?.querySelectorAll<HTMLButtonElement>('.ael-hero-slide-dot')[next]?.focus()
        }}
      >
        {HOME_SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            className="ael-hero-slide-dot"
            aria-label={`Image ${i + 1} of ${count}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  </>
}
