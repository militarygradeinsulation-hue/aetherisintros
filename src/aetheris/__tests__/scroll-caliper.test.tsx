import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SystemScrollCaliper } from '../SystemScrollCaliper'
import { advanceSpring, clamp, instrumentPosition, scrollPercent, springSettled } from '../scroll-caliper-core'

describe('kinetic scroll caliper', () => {
  it('does not alter scrolling and follows bounded section geometry', () => {
    expect(scrollPercent(50, 200, 100)).toBe(50)
    expect(scrollPercent(999, 200, 100)).toBe(100)
    expect(scrollPercent(50, 80, 100)).toBe(0)
    expect(instrumentPosition(250, 100, 300, 600)).toBe(300)
    expect(instrumentPosition(-100, 100, 300, 600)).toBe(0)
    expect(instrumentPosition(999, 100, 300, 600)).toBe(600)
    expect(clamp(NaN, 0, 100)).toBe(0)
  })

  it('damps toward the measured edge without infinite or invalid values', () => {
    const jaw = { x: 0, v: 0, t: 100 }
    for (let i = 0; i < 600; i++) advanceSpring(jaw, 120, 0.9, 1 / 60)
    expect(springSettled(jaw)).toBe(true)
    expect(jaw.x).toBeCloseTo(100, 1)
  })

  it('is a read-only overlay with no wheel/drag interception', () => {
    const html = renderToStaticMarkup(<SystemScrollCaliper />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('ask-scroll-caliper')
    expect(html).toContain('PAGE')
    expect(html).not.toContain('overflow-y-auto')
    expect(html).not.toContain('tabindex')
  })
})
