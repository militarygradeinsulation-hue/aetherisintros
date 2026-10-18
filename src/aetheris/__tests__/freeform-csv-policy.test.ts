import { describe, expect, it } from 'vitest'
import { preflightFreeformCsv } from '../crm/freeform-csv-policy'
import { readFileSync } from 'node:fs'

const cols = [{ key: 'a', name: 'A' }, { key: 'b', name: 'B' }]
describe('freeform Grid CSV preflight', () => {
  it('maps all cells by header, independent of column order', () => {
    expect(preflightFreeformCsv(['B', 'A'], [['two', 'one']], cols))
      .toEqual([{ b: 'two', a: 'one' }])
  })
  it('preserves intentionally empty trailing cells', () => {
    expect(preflightFreeformCsv(['A', 'B'], [['x']], cols))
      .toEqual([{ a: 'x', b: '' }])
  })
  it('refuses duplicate, blank, unmatched and overflow columns', () => {
    expect(() => preflightFreeformCsv(['A', 'a'], [['x', 'y']], cols)).toThrow('duplicate')
    expect(() => preflightFreeformCsv(['A', ''], [['x', 'y']], cols)).toThrow('blank')
    expect(() => preflightFreeformCsv(['A', 'Missing'], [['x', 'y']], cols)).toThrow('Unmapped')
    expect(() => preflightFreeformCsv(['A'], [['x', 'y']], cols)).toThrow('more values')
  })
  it('refuses empty and excessively large imports', () => {
    expect(() => preflightFreeformCsv([], [], cols)).toThrow('needs headers')
    expect(() => preflightFreeformCsv(['A'], Array.from({ length: 5001 }, () => ['x']), cols))
      .toThrow('5,000')
  })
  it('the real Grid import uses this validated plan before calling canonical addRows', () => {
    const source = readFileSync(new URL('../pages/GridPage.tsx', import.meta.url), 'utf8')
    expect(source).toContain('const prepared = preflightFreeformCsv(header, body, columns)')
    expect(source).toContain('await ops.addRows(sheet.id, prepared)')
  })
})
