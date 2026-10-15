import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const block = css.slice(css.indexOf('.app-shell .need-modal.outcome-modal {'))
const vars = Object.fromEntries([...block.slice(0, block.indexOf('}')).matchAll(/--(oc-[a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]))

const lum = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi = 0, lo = 0] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Record outcome modal contrast', () => {
  const onField = ['oc-text', 'oc-placeholder', 'oc-disabled']
  for (const k of onField) it(`${k} on field is >= 4.5:1`, () => expect(ratio(vars[k], vars['oc-field-bg'])).toBeGreaterThanOrEqual(4.5))
  for (const k of ['oc-label', 'oc-intro', 'oc-hint', 'oc-eyebrow', 'oc-text']) {
    it(`${k} on modal background is >= 4.5:1`, () => expect(ratio(vars[k], vars['oc-bg'])).toBeGreaterThanOrEqual(4.5))
  }
  it('scopes rules to the outcome modal and sets iOS select fill', () => {
    expect(block).toContain('-webkit-text-fill-color')
    expect(block).toContain('color-scheme: light')
  })
})
