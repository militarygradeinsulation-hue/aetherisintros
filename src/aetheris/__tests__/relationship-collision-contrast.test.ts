import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(new URL('../pages/CollisionsPage.tsx', import.meta.url), 'utf8')
const directory = readFileSync(new URL('../../intros-ui/views/PeopleDirectoryView.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../site-readability.css', import.meta.url), 'utf8')

const rgb = (hex: string) => {
  const raw = hex.replace('#', '')
  const parts = [0, 2, 4].map(i => parseInt(raw.slice(i, i + 2), 16) / 255)
  return parts.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
}
const luminosity = (hex: string) => {
  const [r = 0, g = 0, b = 0] = rgb(hex)
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}
const contrast = (a: string, b: string) => {
  const x = luminosity(a), y = luminosity(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const stylesFor = (theme: 'dark' | 'light', selector: string) => {
  const head = `html:root[data-theme="${theme}"] body ${selector} {`
  const index = css.indexOf(head)
  expect(index, `CSS rule missing for ${theme} ${selector}`).toBeGreaterThan(-1)
  return css.slice(index + head.length, css.indexOf('}', index))
}

describe('relationship filters and collision identities', () => {
  it('marks actual collision names rather than changing avatar initials', () => {
    expect(component).toContain('className="collision-person-name"')
    expect(stylesFor('dark', '.collision-card .collision-faces button .collision-person-name')).toContain('color:#f5f5f5!important')
    expect(stylesFor('light', '.collision-card .collision-faces button .collision-person-name')).toContain('color:#17191c!important')
    expect(contrast('#f5f5f5', '#000000')).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#17191c', '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })
  it('keeps the selected Relationship Tier label, count and surface readable', () => {
    expect(directory).toContain('ix-relationship-tier-option')
    expect(directory).toContain('ix-relationship-tier-label')
    expect(directory).toContain('ix-relationship-tier-count')
    expect(stylesFor('dark', '.ix-root .ix-relationship-tier-option[aria-pressed="true"]')).toContain('background:#292017!important')
    expect(stylesFor('light', '.ix-root .ix-relationship-tier-option[aria-pressed="true"]')).toContain('background:#fff0db!important')
    expect(contrast('#ffffff', '#292017')).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#1c1711', '#fff0db')).toBeGreaterThanOrEqual(4.5)
  })
  it('keeps the compact tier chips theme-aware and keyboard reachable', () => {
    expect(directory).toContain('ix-relationship-tier-quick-option')
    expect(directory).toContain('aria-pressed={selectedTier === t.id}')
    for (const theme of ['dark', 'light'] as const) {
      expect(stylesFor(theme, '.ix-root .ix-relationship-tier-quick-option[aria-pressed="true"]')).toContain('background:')
      expect(stylesFor(theme, '.ix-root .ix-relationship-tier-option[aria-pressed="false"]')).toContain('color:')
    }
    expect(css).toContain('.ix-relationship-tier-quick-option):focus-visible')
  })
})
