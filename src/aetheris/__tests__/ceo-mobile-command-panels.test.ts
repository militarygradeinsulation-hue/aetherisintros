import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../ceo-ui.tsx', import.meta.url), 'utf8')

describe('mobile CEO command panels', () => {
  it('overrides the generic mobile bottom sheet with a later centered CEO-only rule', () => {
    const generic = css.indexOf('.modal-wrap{align-items:flex-end;padding:0}')
    const scoped = css.indexOf('/* CEO OS command panels: centered on mobile')
    expect(generic).toBeGreaterThanOrEqual(0)
    expect(scoped).toBeGreaterThan(generic)

    const block = css.slice(scoped)
    expect(block).toContain('.ceo-modal-wrap{')
    expect(block).toContain('align-items:center')
    expect(block).toContain('justify-content:center')
    expect(block).toContain('env(safe-area-inset-bottom,0px)')
    expect(block).toContain('.ceo-drawer-body{')
    expect(block).toContain('overflow-y:auto')
  })

  it('uses an accessible scoped dialog host with contextual action controls', () => {
    expect(ui).toContain('modal-wrap ceo-modal-wrap')
    expect(ui).toContain('role="dialog" aria-modal="true"')
    expect(ui).toContain('const ceoCommandMeta: Record<CeoView, CeoCommandMeta>')
    expect(ui).toContain('meta.actions.map')
  })

  it('covers every CEO OS option visible in the mobile More grid', () => {
    const visibleViews = [
      'decisions', 'commitments', 'forecast', 'customerRisk', 'negotiation', 'scenario',
      'who', 'brief', 'missing', 'redteam', 'coverage', 'singles', 'time', 'promises',
      'patterns', 'replay', 'delegation',
    ]
    const meta = ui.slice(
      ui.indexOf('const ceoCommandMeta: Record<CeoView, CeoCommandMeta>'),
      ui.indexOf('function useGo()'),
    )
    for (const view of visibleViews) {
      expect(meta).toContain(`${view}: { purpose:`)
    }
  })
})
