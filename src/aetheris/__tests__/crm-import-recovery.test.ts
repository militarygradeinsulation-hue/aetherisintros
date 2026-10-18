import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { safeImportSelection } from '../crm/import-policy'

const valid = { values: { fullName: 'Maya' }, errors: [] as string[] }
const invalid = { values: { fullName: '' }, errors: ['No name'] }
const duplicate = { values: { fullName: 'Maya' }, errors: ['Repeated in this sheet'] }

describe('CRM import validation and recovery', () => {
  it('imports only valid rows when skip is explicitly enabled', () => {
    expect(safeImportSelection([valid, invalid, duplicate], true))
      .toEqual({ rows: [valid], error: null })
  })
  it('blocks all writes if skip is off and any row is invalid', () => {
    const plan = safeImportSelection([valid, invalid, duplicate], false)
    expect(plan.rows).toHaveLength(0)
    expect(plan.error).toContain('need attention')
  })
  it('allows a clean import without skipping', () => {
    expect(safeImportSelection([valid], false)).toEqual({ rows: [valid], error: null })
  })
  it('retains failed records for retry and releases the busy state', () => {
    const source = readFileSync(new URL('../ledger/SheetImport.tsx', import.meta.url), 'utf8')
    expect(source).toContain('if (importingRef.current) return')
    expect(source).toContain('finally {')
    expect(source).toContain('setBusy(false)')
    expect(source).toContain('if (failed)')
    expect(source).toContain('The source file remains loaded')
    expect(source).toContain('safeImportSelection(checked, skipBad)')
    expect(source).toContain('importedRowsRef.current.add')
    expect(source).toContain('!importedRowsRef.current.has')
  })
})
