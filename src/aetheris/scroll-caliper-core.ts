/** Shared geometry for Ask Intros' scroll instrument.
 * These helpers never change the browser's native scrolling.
 */
export interface CaliperSpring {
  x: number
  v: number
  t: number
}
export const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min

export function advanceSpring(s: CaliperSpring, k: number, damping: number, dt: number): void {
  const t = clamp(dt, 0, 0.05)
  const c = 2 * damping * Math.sqrt(k)
  s.v += (k * (s.t - s.x) - c * s.v) * t
  s.x += s.v * t
}

export const springSettled = (s: CaliperSpring) => Math.abs(s.x - s.t) < 0.05 && Math.abs(s.v) < 0.05

export function scrollPercent(position: number, scrollHeight: number, viewportHeight: number): number {
  return scrollHeight > viewportHeight
    ? clamp((position / (scrollHeight - viewportHeight)) * 100, 0, 100)
    : 0
}

/** Project an actual section edge inside a scroller's visible client rectangle. */
export function instrumentPosition(edge: number, top: number, visibleHeight: number, railHeight: number): number {
  return visibleHeight > 0 ? clamp(((edge - top) / visibleHeight) * railHeight, 0, railHeight) : 0
}

/** First-party sections only: avoids exposing live data or reading text from the page. */
export const CALIPER_SECTIONS = '[data-section], main section, main article'
