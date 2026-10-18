import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { preflightFreeformCsv, preflightLinkedNames } from '../crm/csv-import-preflight'

describe('Grid CSV preflight', () => {
  const cols = [{ key: 'a', name: 'A' }, { key: 'b', name: 'B' }]
  it('maps every freeform value into its canonical column, in header order', () => {
    expect(preflightFreeformCsv(['B', 'A'], [['b1', 'a1'], ['b2', 'a2']], cols))
      .toEqual([{ b: 'b1', a: 'a1' }, { b: 'b2', a: 'a2' }])
  })
  it('rejects unmapped, duplicate or anonymous columns before any insert', () => {
    expect(() => preflightFreeformCsv(['Unmapped'], [['x']], cols)).toThrow('Unmapped')
    expect(() => preflightFreeformCsv(['A', 'a'], [['1', '2']], cols)).toThrow('duplicate')
    expect(() => preflightFreeformCsv([''], [['a']], cols)).toThrow('empty')
    expect(() => preflightFreeformCsv(['A'], [['a', 'overflow']], cols)).toThrow('without a matching')
  })
  it('requires a single named primary field for linked CRM imports', () => {
    expect(preflightLinkedNames(['Person'], [['Maya'], ['Andre']], 'Person')).toEqual(['Maya', 'Andre'])
    expect(() => preflightLinkedNames(['Person', 'Email'], [['Maya', 'm@x.test']], 'Person')).toThrow('one primary-name')
    expect(() => preflightLinkedNames(['Person'], [[''], ['Maya']], 'Person')).toThrow('blank')
    expect(() => preflightLinkedNames(['Person'], [['Maya'], ['maya']], 'Person')).toThrow('repeats')
  })
  it('does not silently accept empty files or enormous imports', () => {
    expect(() => preflightFreeformCsv(['A'], [], cols)).toThrow('at least one')
    expect(() => preflightFreeformCsv(['A'], Array.from({ length: 5001 }, () => ['x']), cols)).toThrow('5,000')
  })
  it('reports a server-confirmed linked record before incrementing imported rows', () => {
    const grid = readFileSync(new URL('../pages/GridPage.tsx', import.meta.url), 'utf8')
    const store = readFileSync(new URL('../crm/store.tsx', import.meta.url), 'utf8')
    expect(grid).toContain('const saved = await ops.createLinkedRecord')
    expect(grid).toContain('if (!saved) throw')
    expect(store).toContain('return true')
    expect(store).toContain('requireSavedGridRecord(personRepo.create')
  })
})
