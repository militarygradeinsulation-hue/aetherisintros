import { useEffect, useRef } from 'react'
import {
  advanceSpring, clamp, instrumentPosition, scrollPercent, springSettled,
  caliperGeometryDue, CALIPER_SECTION_LIMIT, type CaliperSpring,
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
    let velocity = 0
    let scrollPos = 0
    let rawGap = 0
    let dirty = true
    let lastMeasured = -Infinity
    let sectionScope: Element | null = null
    let sections: HTMLElement[] = []
    let sectionsAt = -Infinity

    const resize = () => {
      const nextHeight = rail.clientHeight
      if (nextHeight < 1) return
      if (nextHeight === railHeight && svg.dataset['sized'] === 'true') return
      railHeight = nextHeight
      svg.dataset['sized'] = 'true'
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

    const measure = (now: number) => {
      if (!tracked.isConnected) { tracked = page; primed = false }
      const isPage = tracked === page
      const view = isPage
        ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
        : tracked.getBoundingClientRect()
      const visibleHeight = isPage ? window.innerHeight : tracked.clientHeight
      const amount = isPage ? window.scrollY : tracked.scrollTop
      const fullHeight = tracked.scrollHeight
      const max = fullHeight - visibleHeight
      scrollPos = amount
      needle.t = scrollPercent(amount, fullHeight, visibleHeight)

      // Only structural section boundaries are inspected. We never read content
      // text, user messages, profile fields, or private network data.
      const scope = isPage ? document.querySelector('main') : tracked
      // Cache structural candidates. Apply the limit before reading layout and
      // never enumerate sections on every spring/paint frame.
      if (scope !== sectionScope || now - sectionsAt >= 500) {
        sectionScope = scope
        sectionsAt = now
        sections = scope ? Array.from(scope.querySelectorAll<HTMLElement>('[data-section], section, article')).slice(0, CALIPER_SECTION_LIMIT) : []
      }
      let sectionTotal = 0
      let best = -1
      let largestOverlap = 0
      let bestBounds: DOMRect | null = null
      for (let i = 0; i < sections.length; i++) {
        const bounds = sections[i]!.getBoundingClientRect()
        if (bounds.height < 64 || bounds.width < 120) continue
        const visibleSection = sectionTotal++
        const overlap = Math.max(0, Math.min(bounds.bottom, view.bottom) - Math.max(bounds.top, view.top))
        if (overlap > largestOverlap) {
          best = visibleSection
          largestOverlap = overlap
          bestBounds = bounds
        }
      }
      const label = best === -1 ? 'PAGE' : `SEC ${best + 1}/${sectionTotal}`
      if (sectionChip.textContent !== label) sectionChip.textContent = label
      const scrollable = max > 2 && visibleHeight > 120 ? 'true' : 'false'
      if (rail.dataset['scrollable'] !== scrollable) rail.dataset['scrollable'] = scrollable
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
      if (document.hidden) { running = false; return }
      // Decorative motion has no reason to consume the entire display frame.
      if (lastFrame && now - lastFrame < 30) { frame = requestAnimationFrame(tick); return }
      const dt = lastFrame ? clamp((now - lastFrame) / 1000, 0, 0.05) : 1 / 30
      lastFrame = now
      if (caliperGeometryDue(dirty, now, lastMeasured)) {
        const previous = scrollPos
        measure(now)
        lastMeasured = now
        dirty = false
        velocity += 0.2 * ((scrollPos - previous) / Math.max(dt, 0.001) - velocity)
      } else velocity *= 0.8
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
      const pixels = rawGap.toFixed(0)
      const percent = String(Math.round(clamp(needle.x, 0, 100)))
      if (pxChip.textContent !== pixels) pxChip.textContent = pixels
      if (pctChip.textContent !== percent) pctChip.textContent = percent

      const speed = reduced ? 0 : Math.abs(velocity)
      const echoLength = Math.min(10, speed / 200)
      const echoOpacity = Math.min(0.45, speed / 3000)
      echo.style.opacity = echoOpacity < 0.02 ? '0' : echoOpacity.toFixed(2)
      // The translucent echo remains, without a per-frame animated blur filter.
      echo.style.transform = `translateY(${(-(scrollPos % 8) + Math.sign(velocity) * echoLength).toFixed(2)}px)`

      if (!dirty && now - lastScroll > 180 && springSettled(top) && springSettled(bottom) && springSettled(needle)) {
        echo.style.opacity = '0'
        echo.style.filter = 'none'
        running = false
        return
      }
      frame = requestAnimationFrame(tick)
    }

    const wake = () => {
      if (running || document.hidden) return
      running = true
      lastFrame = 0
      frame = requestAnimationFrame(tick)
    }

    const scroll = (event: Event) => {
      const target = event.target
      const candidate = target instanceof HTMLElement ? target : page
      // Follow a meaningful inner scroll area, but do not jump to textareas,
      // dropdown lists or tiny sliders when their scroll position changes.
      if (candidate !== tracked && candidate !== page &&
          (candidate.clientHeight <= 180 || candidate.clientWidth <= 260 ||
            candidate.scrollHeight <= candidate.clientHeight + 8)) return
      if (tracked !== candidate) {
        tracked = candidate
        sectionScope = null
        primed = false
      }
      dirty = true
      lastScroll = performance.now()
      wake()
    }

    const onResize = () => { resize(); dirty = true; sectionsAt = -Infinity; lastScroll = performance.now(); wake() }
    const onNavigation = () => {
      tracked = document.getElementById('aetheris-workspace-content') ?? page
      sectionScope = null
      primed = false
      dirty = true
      lastMeasured = -Infinity
      lastScroll = performance.now()
      wake()
    }
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); running = false }
      else onNavigation()
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(rail)
    resizeObserver.observe(document.documentElement)
    document.addEventListener('scroll', scroll, { capture: true, passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('aetheris:workspace-navigated', onNavigation)
    window.addEventListener('resize', onResize)
    window.addEventListener('pageshow', onNavigation)
    resize()
    onNavigation()

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('scroll', scroll, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('aetheris:workspace-navigated', onNavigation)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pageshow', onNavigation)
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
