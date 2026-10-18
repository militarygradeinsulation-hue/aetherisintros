import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const view = readFileSync(new URL('../pages/OutcomesPage.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('Record outcome value guidance', () => {
  for (const kind of ['direct', 'influenced']) {
    it(kind + ' note has a readable associated hint', () => {
      expect(view).toContain('aria-describedby="outcome-' + kind + '-hint"')
      expect(view).toContain('id="outcome-' + kind + '-hint" className="outcome-hint"')
    })
  }
  it('uses existing responsive outcome layout', () => {
    expect(view.match(/className="outcome-field"/g)).toHaveLength(2)
    expect(css).toContain('.need-modal.outcome-modal .outcome-field')
    expect(css).toContain('.need-modal.outcome-modal .outcome-hint')
    expect(css).toContain('overflow-wrap: anywhere')
  })
})
