import { useEffect, useRef } from 'react'
import {
  advanceSpring, clamp, instrumentPosition, scrollPercent, springSettled,
  type CaliperSpring,
} from './scroll-caliper-core'
import './system-scroll-caliper.css'

const W = 48

/** A global, decorative instrument inspired by the supplied vernier-caliper
 * scroll treatment. It measures the current page OR the scrollable panel the
 * member is using; native scrolling, keyboard navigation and touch stay intact.
 *
 * The rail is mounted once in the route shell rather than wrapping the whole
 * app in a fixed-height overflow container (which would break chat, dialogs,
 * sticky headers, editor focus and mobile navigation).
 */
export function SystemScrollCaliper() {
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const ticksRef = useRef<SVGGElement>(null)
  const echoRef = useRef<SVGGElement>(null)
  const minorRef = useRef<SVGPathElement>(null)
  const majorRef = useRef<SVGPathElement>(null)
  const echoMinorRef = useRef<SVGPathElement>(null)
  const echoMajorRef = useRef<SVGPathElement>(null)
  const spineRef = useRef<SVGPathElement>(null)
  const regionRef = useRef<SVGRectElement>(null)
  const topJawRef = useRef<SVGGElement>(null)
  const bottomJawRef = useRef<SVGGElement>(null)
  const needleRef = useRef<SVGGElement>(null)
  const sectionRef = useRef<HTMLSpanElement>(null)
  const pxRef = useRef<HTMLSpanElement>(null)
  const percentRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const rail = rootRef.current
    const svg = svgRef.current
    const ticks = ticksRef.current
    const echo = echoRef.current
    const minor = minorRef.current
    const major = majorRef.current
    const echoMinor = echoMinorRef.current
    const echoMajor = echoMajorRef.current
    const spine = spineRef.current
    const region = regionRef.current
    const topJaw = topJawRef.current
    const bottomJaw = bottomJawRef.current
    const needleMark = needleRef.current
    const sectionChip = sectionRef.current
    const pxChip = pxRef.current
    const pctChip = percentRef.current

    if (!rail || !svg || !ticks || !echo || !minor || !major || !echoMinor ||
        !echoMajor || !spine || !region || !topJaw || !bottomJaw || !needleMark ||
        !sectionChip || !pxChip || !pctChip) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top: CaliperSpring = { x: 0, v: 0, t: 0 }
    const bottom: CaliperSpring = { x: 0, v: 0, t: 0 }
    const needle: CaliperSpring = { x: 0, v: 0, t: 0 }
    const page = document.scrollingElement ?? document.documentElement
    let tracked: Element = page
    let railHeight = rail.clientHeight
    let running = false
    let primed = false
    let frame = 0
    let lastFrame = 0
    let lastScroll = performance.now()
    let lastTop = tracked.scrollTop
    let velocity = 0
    let scrollPos = 0
    let sectionNumber = -1
    let sectionTotal = 0
    let rawGap = 0

    const resize = () => {
      railHeight = rail.clientHeight
      if (railHeight < 1) return
      svg.setAttribute('viewBox', `0 0 ${W} ${railHeight}`)
      let small = ''
      let large = ''
      for (let y = -8; y <= railHeight + 8; y += 2) {
        if (y % 40 === 0) large += `M${W - 17} ${y}h17`
        else if (y % 8 === 0) large += `M${W - 10} ${y}h10`
        else small += `M${W - 5} ${y}h5`
      }
      minor.setAttribute('d', small)
      major.setAttribute('d', large)
      echoMinor.setAttribute('d', small)
      echoMajor.setAttribute('d', large)
      spine.setAttribute('d', `M${W - 0.8} 0V${railHeight}`)
    }

    const measure = () => {
      const isPage = tracked === page
      const view = isPage
        ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
        : tracked.getBoundingClientRect()
      const visibleHeight = isPage ? window.innerHeight : tracked.clientHeight
      const amount = isPage ? window.scrollY : tracked.scrollTop
      const max = tracked.scrollHeight - visibleHeight
      rail.dataset['scrollable'] = max > 2 && visibleHeight > 120 ? 'true' : 'false'
      scrollPos = amount
      needle.t = scrollPercent(amount, tracked.scrollHeight, visibleHeight)

      // Only structural section boundaries are inspected. We never read content
      // text, user messages, profile fields, or private network data.
      const scope = isPage ? document.querySelector('main') : tracked
      const sections = scope
        ? Array.from(scope.querySelectorAll<HTMLElement>('[data-section], section, article'))
            .filter(el => el.offsetHeight >= 64 && el.offsetWidth >= 120)
            .slice(0, 120)
        : []
      sectionTotal = sections.length
      let best = -1
      let largestOverlap = 0
      let bestBounds: DOMRect | null = null
      for (let i = 0; i < sections.length; i++) {
        const bounds = sections[i]!.getBoundingClientRect()
        const overlap = Math.max(0, Math.min(bounds.bottom, view.bottom) - Math.max(bounds.top, view.top))
        if (overlap > largestOverlap) {
          best = i
          largestOverlap = overlap
          bestBounds = bounds
        }
      }
      sectionNumber = best
      sectionChip.textContent = best === -1 ? 'PAGE' : `SEC ${best + 1}/${sectionTotal}`
      if (bestBounds) {
        top.t = instrumentPosition(bestBounds.top, view.top, visibleHeight, railHeight)
        bottom.t = instrumentPosition(bestBounds.bottom, view.top, visibleHeight, railHeight)
        rawGap = Math.max(0, Math.min(bestBounds.bottom, view.bottom) - Math.max(bestBounds.top, view.top))
        // Readout measures current section, not an invented whole-page dimension.
        needle.t = clamp(((view.top + visibleHeight / 2 - bestBounds.top) / Math.max(1, bestBounds.height)) * 100, 0, 100)
      } else {
        top.t = 0
        bottom.t = railHeight
        rawGap = visibleHeight
      }
    }

    const tick = (now: number) => {
      const dt = lastFrame ? clamp((now - lastFrame) / 1000, 0, 0.05) : 1 / 60
      lastFrame = now
      const movement = tracked.scrollTop - lastTop
      velocity += 0.2 * (movement / Math.max(dt, 0.001) - velocity)
      lastTop = tracked.scrollTop
      measure()
      if (reduced || !primed) {
        for (const spring of [top, bottom, needle]) {
          spring.x = spring.t
          spring.v = 0
        }
        primed = true
      } else {
        advanceSpring(top, 120, 0.9, dt)
        advanceSpring(bottom, 120, 0.9, dt)
        advanceSpring(needle, 90, 0.55, dt)
      }

      const min = Math.min(top.x, bottom.x)
      const height = Math.max(0, bottom.x - top.x)
      topJaw.style.transform = `translateY(${top.x.toFixed(2)}px)`
      bottomJaw.style.transform = `translateY(${bottom.x.toFixed(2)}px)`
      ticks.style.transform = `translateY(${(-(scrollPos % 8)).toFixed(2)}px)`
      region.setAttribute('y', min.toFixed(2))
      region.setAttribute('height', height.toFixed(2))
      needleMark.style.transform = `translateY(${(min + height * clamp(needle.x, 0, 100) / 100).toFixed(2)}px)`
      pxChip.textContent = rawGap.toFixed(0)
      pctChip.textContent = String(Math.round(clamp(needle.x, 0, 100)))

      const speed = reduced ? 0 : Math.abs(velocity)
      const echoLength = Math.min(10, speed / 200)
      const echoOpacity = Math.min(0.45, speed / 3000)
      echo.style.opacity = echoOpacity < 0.02 ? '0' : echoOpacity.toFixed(2)
      echo.style.filter = echoOpacity < 0.02 ? 'none' : `blur(${(echoLength / 2).toFixed(2)}px)`
      echo.style.transform = `translateY(${(-(scrollPos % 8) + Math.sign(velocity) * echoLength).toFixed(2)}px)`

      if (now - lastScroll > 180 && springSettled(top) && springSettled(bottom) && springSettled(needle)) {
        echo.style.opacity = '0'
        echo.style.filter = 'none'
        running = false
        return
      }
      frame = requestAnimationFrame(tick)
    }

    const wake = () => {
      if (running) return
      running = true
      lastFrame = 0
      frame = requestAnimationFrame(tick)
    }

    const scroll = (event: Event) => {
      const target = event.target
      const candidate = target instanceof HTMLElement ? target : page
      // Follow a meaningful inner scroll area, but do not jump to textareas,
      // dropdown lists or tiny sliders when their scroll position changes.
      if (candidate === page ||
          (candidate.clientHeight > 180 && candidate.clientWidth > 260 &&
            candidate.scrollHeight > candidate.clientHeight + 8)) {
        if (tracked !== candidate) {
          tracked = candidate
          lastTop = tracked.scrollTop
          primed = false
        }
      }
      lastScroll = performance.now()
      wake()
    }

    const onResize = () => { resize(); lastScroll = performance.now(); wake() }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(rail)
    resizeObserver.observe(document.documentElement)
    document.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('pageshow', onResize)
    resize()
    wake()

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pageshow', onResize)
      resizeObserver.disconnect()
    }
  }, [])

  return <><div ref={rootRef} className="ask-scroll-caliper" aria-hidden="true" data-scrollable="false">
    <svg ref={svgRef} className="ask-scroll-caliper-svg" viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" fill="none">
      <g ref={echoRef} opacity="0" className="ask-scroll-caliper-ticks">
        <path ref={echoMinorRef} stroke="currentColor" strokeWidth="1" />
        <path ref={echoMajorRef} stroke="currentColor" strokeWidth="1.2" />
      </g>
      <g ref={ticksRef} className="ask-scroll-caliper-ticks">
        <path ref={minorRef} stroke="currentColor" strokeWidth="1" />
        <path ref={majorRef} stroke="currentColor" strokeWidth="1.2" />
      </g>
      <path ref={spineRef} stroke="currentColor" strokeWidth="1.5" />
      <rect ref={regionRef} x={3} y={0} width={W - 6} height={0} fill="currentColor" opacity={0.05} />
      <g ref={topJawRef} className="ask-scroll-caliper-jaw">
        <path d={`M4 0H${W}M4 0V-13`} stroke="currentColor" strokeWidth="2" />
        <path d="M4 0l11 -5v5z" fill="currentColor" />
      </g>
      <g ref={bottomJawRef} className="ask-scroll-caliper-jaw">
        <path d={`M4 0H${W}M4 0V13`} stroke="currentColor" strokeWidth="2" />
        <path d="M4 0l11 5v-5z" fill="currentColor" />
        <path d="M31 4h8M31 7h8M31 10h8" stroke="currentColor" opacity={0.45} />
      </g>
      <g ref={needleRef} className="ask-scroll-caliper-indicator">
        <path d={`M${W - 23} 0H${W}`} stroke="currentColor" strokeWidth="1.5" />
        <path d={`M${W - 23} 0l-6 -4v8z`} fill="currentColor" />
      </g>
    </svg>
    <div className="ask-scroll-caliper-chip">
      <span className="ask-scroll-caliper-label" ref={sectionRef}>PAGE</span>
      <div><span ref={pxRef}>0</span><span className="ask-scroll-caliper-dim"> PX · </span><span ref={percentRef}>0</span><span className="ask-scroll-caliper-dim">%</span></div>
    </div>
  </div>
  <div className="ask-scroll-caliper-bottom-scale" aria-hidden="true" />
  </>
}

export default SystemScrollCaliper
