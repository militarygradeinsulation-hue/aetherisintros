import { describe, expect, it } from 'vitest'
import { validateLinkedGridCsv } from '../crm/linked-csv-policy'

describe('linked Grid import protection', () => {
  it('accepts a single primary field with nonempty names', () => {
    expect(validateLinkedGridCsv('crm_people', ['Person'], [['Ada'], ['Bea']])).toBeNull()
    expect(validateLinkedGridCsv('crm_tasks', ['Task'], [['Call Ada']])).toBeNull()
  })
  it('blocks multi-column contact CSVs instead of silently dropping details', () => {
    expect(validateLinkedGridCsv('crm_people', ['Person','Email'], [['Ada','ada@example.test']]))
      .toContain('preserve all CSV columns')
  })
  it('blocks read-only intelligence and malformed headings', () => {
    expect(validateLinkedGridCsv('introductions', ['Person'], [['Ada']])).toContain('read-only')
    expect(validateLinkedGridCsv('crm_companies', ['Email'], [['Ada']])).toContain('name/title')
  })
  it('blocks missing names and oversized batches before starting any writes', () => {
    expect(validateLinkedGridCsv('crm_people', ['Person'], [['']])).toContain('name/title')
    expect(validateLinkedGridCsv('crm_people', ['Person'], Array.from({length:501},()=>['Test'])))
      .toContain('500')
  })
})
