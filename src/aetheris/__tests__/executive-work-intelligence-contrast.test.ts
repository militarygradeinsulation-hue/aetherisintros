import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('Executive Workbench intelligence contrast', () => {
  const page = file('../pages/ExecutiveWorkPage.tsx')
  const css = file('../executive-work-intelligence.css')

  it('styles the canonical tabbed modules rather than creating duplicate routes', () => {
    expect(page).toContain("import '../executive-work-intelligence.css'")
    expect(page).toContain('<BusinessAnalystPanel />')
    expect(page).toContain('<CurrentUserTrackRecord />')
  })
  it('defines readable light and dark palettes', () => {
    expect(css).toContain(':root[data-theme="dark"] .executive-workbench')
    expect(css).toContain(':root[data-theme="light"] .executive-workbench')
    expect(css).toContain('--evi-text:#f7fafb')
    expect(css).toContain('--evi-text:#111820')
    expect(css).toContain('color:var(--evi-text)')
  })
  it('covers analyst panels, verification records, mobile and reduced motion', () => {
    for (const selector of ['.analyst-card', '.analyst-generate-btn', '.track-record-card', '.reputation-dashboard', '.track-stat']) {
      expect(css).toContain(selector)
    }
    expect(css).toContain('@media(max-width:600px)')
    expect(css).toContain('@media(prefers-reduced-motion:reduce)')
  })
})
