import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../stencil-system.css', import.meta.url), 'utf8')
const part = css.split('21 / CINEMATIC MEMBERSHIP:')[1] ?? ''
const toRgb = (hex: string) => Array.from({length: 3}, (_v, i) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255)
const lum = (hex: string) => toRgb(hex).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0)
const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe('cinematic membership contrast after light-first appearance', () => {
  it('uses contrast-safe inverse heading, body and kicker colors on the dark chapter', () => {
    expect(contrast('#f5f7f6', '#11191c')).toBeGreaterThan(7)
    expect(contrast('#f4d3a9', '#11191c')).toBeGreaterThan(7)
  })
  it('scopes the override to this section in both themes', () => {
    expect(part).toContain(':root[data-theme="light"]')
    expect(part).toContain(':root[data-theme="dark"]')
    expect(part).toContain('section.ael-compact-membership')
    expect(part).toContain('.ael-compact-membership-content :is(h2,h2 span,h2 em,h2 svg,p)')
  })
  it('keeps the vector heading legible and excludes buttons/links from text overrides', () => {
    expect(part).toContain('.stencil-headline svg path')
    expect(part).toContain('stroke:currentColor!important')
    expect(part).not.toMatch(/:is\([^)]*(?:button|\ba\b)[^)]*\)/)
  })
})
