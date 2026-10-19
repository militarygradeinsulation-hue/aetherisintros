import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const file = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
describe('live opportunity wheel integration', () => {
  it('uses actual authenticated exchange records, not demo or stock data', () => {
    const exchange = file('../LiveOpportunityExchange.tsx')
    expect(exchange).toContain('visible.map(o => ({ id: o.id, label: o.title, kind: o.kind, summary: o.objective }))')
    expect(exchange).toContain('userId && !query.isError && visible.length > 1')
    expect(exchange).toContain('id={"exchange-opportunity-" + o.id}')
  })
  it('supports keyboard navigation and a reduced-motion preference', () => {
    const wheel = file('../OpportunityWheel.tsx')
    const css = file('../opportunity-wheel.css')
    expect(wheel).toContain("e.key === 'ArrowDown'")
    expect(wheel).toContain('aria-activedescendant')
    expect(wheel).toContain('onPointerDown={pointerDown}')
    expect(css).toContain('prefers-reduced-motion:reduce')
  })
})
