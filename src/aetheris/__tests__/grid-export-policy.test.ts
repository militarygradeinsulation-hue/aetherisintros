import { describe, expect, it } from 'vitest'
import { gridExportContainsContacts } from '../crm/export-policy'
import { readFileSync } from 'node:fs'

const columns = [{ key: 'a', name: 'A' }, { key: 'b', name: 'B' }]
const row = (a: string, b: string) => ({ values: { a, b } })

describe('Grid contact export policy', () => {
  it('denies all linked Grid exports, including relationship and CRM-linked sheets', () => {
    expect(gridExportContainsContacts(true, columns, [])).toBe(true)
  })
  it('denies a contact-shaped freeform spreadsheet', () => {
    expect(gridExportContainsContacts(false, [{ key: 'email', name: 'Email' }], [])).toBe(true)
    expect(gridExportContainsContacts(false, columns, [row('person@example.test', 'Hello')])).toBe(true)
    expect(gridExportContainsContacts(false, columns, [row('317-555-0101', 'Intro')])).toBe(true)
  })
  it('keeps non-contact budget or formula-only data exportable', () => {
    expect(gridExportContainsContacts(false, columns, [row('Revenue', '=10000-4200')])).toBe(false)
  })
  it('invokes the existing backend contact export denial rather than a local-only warning', () => {
    const source = readFileSync(new URL('../pages/GridPage.tsx', import.meta.url), 'utf8')
    expect(source).toContain('await contactExportIsDenied()')
    expect(source).toContain('gridExportContainsContacts')
  })
})
