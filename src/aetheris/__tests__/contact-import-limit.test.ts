import { describe, expect, it } from 'vitest'
import { validateProspectGrid } from '../prospect/upload'

const grid = (n: number) => [['name'], ...Array.from({ length: n }, (_, i) => [`Person ${i}`])]

describe('contact import limit', () => {
  it('accepts 50,000 people in one file — no row cap', () => {
    expect(() => validateProspectGrid(grid(50000))).not.toThrow()
  })
  it('still rejects empty and malformed files', () => {
    expect(() => validateProspectGrid([['name']])).toThrow()
    expect(() => validateProspectGrid([['a', 'b'], ['one']])).toThrow()
  })
})

import { utils, write } from 'xlsx'
import { isContactSheet, readSheetRows } from '../contact-files'

describe('contact files', () => {
  it('treats every spreadsheet format as a contacts file', () => {
    for (const name of ['a.csv', 'a.tsv', 'a.xlsx', 'a.xls', 'a.xlsm', 'a.ods', 'a.numbers']) expect(isContactSheet({ name, type: '' })).toBe(true)
    expect(isContactSheet({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false)
  })
  it('reads all 267 rows of a workbook, not a truncated extract', async () => {
    const rows = [['Name', 'Email'], ...Array.from({ length: 267 }, (_, i) => [`P${i}`, `p${i}@x.com`])]
    for (const bookType of ['xlsx', 'xls'] as const) {
      const wb = utils.book_new(); utils.book_append_sheet(wb, utils.aoa_to_sheet(rows), 'S')
      const buf = write(wb, { type: 'array', bookType }) as ArrayBuffer
      const out = await readSheetRows(new File([buf], `c.${bookType}`))
      expect(out.length).toBe(268)
      expect(out[267]).toEqual(['P266', 'p266@x.com'])
    }
  })
})
