import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const view = readFileSync(new URL('../pages/OutcomesPage.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('record outcome modal readability', () => {
  it('uses the scoped high-contrast theme already defined for outcome forms', () => {
    expect(view).toContain('className="modal need-modal outcome-modal"')
    expect(styles).toContain('.app-shell .need-modal.outcome-modal')
    expect(styles).toContain('--oc-text:')
    expect(styles).toContain('--oc-field-bg:')
    expect(styles).toContain('color-scheme: light')
  })
})
