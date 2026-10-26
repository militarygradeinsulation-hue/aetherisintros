import { describe, expect, it } from 'vitest'
import { notificationPanelBounds } from '../notification-placement'
import { readFileSync } from 'node:fs'

describe('mobile notification viewport placement', () => {
  const trigger = { left: 178, right: 222, top: 70, bottom: 114 }

  it.each([320, 375, 390, 430, 620, 768, 1024, 1440])('never clips the panel at %spx', width => {
    const viewport = { width, height: 800 }
    const box = notificationPanelBounds(trigger, viewport)
    expect(box.left).toBeGreaterThanOrEqual(12)
    expect(box.width).toBeGreaterThan(0)
    expect(box.left + box.width).toBeLessThanOrEqual(width - 12)
    expect(box.top).toBeGreaterThanOrEqual(12)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(viewport.height - 12)
    expect(box.maxHeight).toBeGreaterThan(100)
    if (width <= 640) expect(box.left).toBe(12)
  })

  it('moves the panel above a lower toolbar without losing scrollable space', () => {
    const box = notificationPanelBounds(
      { left: 300, right: 340, top: 696, bottom: 740 },
      { width: 390, height: 760 },
    )
    expect(box.left).toBe(12)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(688)
    expect(box.maxHeight).toBeGreaterThan(400)
  })

  it('accounts for an offset visual viewport on a zoomed phone', () => {
    const box = notificationPanelBounds(
      { left: 280, right: 325, top: 142, bottom: 188 },
      { width: 320, height: 560, offsetLeft: 80, offsetTop: 48 },
    )
    expect(box.left).toBe(92)
    expect(box.left + box.width).toBeLessThanOrEqual(80 + 320 - 12)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(48 + 560 - 12)
  })

  it('uses a body portal, fixed positioning, and one wrapping iPhone instruction block', () => {
    const component = readFileSync(new URL('../notifications-bell.tsx', import.meta.url), 'utf8')
    const styles = readFileSync(new URL('../notification-popover.css', import.meta.url), 'utf8')
    const push = readFileSync(new URL('../push-ui.tsx', import.meta.url), 'utf8')
    expect(component).toContain('createPortal(')
    expect(component).toContain('document.body')
    expect(component).toContain('window.visualViewport')
    expect(component).toContain('window.addEventListener(\'resize\', reposition)')
    expect(styles).toMatch(/body \.live-bell-panel\s*\{[^}]*position: fixed/s)
    expect(styles).toContain('right: auto')
    expect(styles).toContain('overflow-y: auto')
    expect(push).toContain('<span>On iPhone: tap <b>Share</b>')
  })
})
