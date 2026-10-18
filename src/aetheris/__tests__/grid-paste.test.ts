import { describe, expect, it } from 'vitest'
import { planFreeformPaste } from '../crm/paste'

const cols = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]
const rows = [
  { id: 'one', values: { a: 'original a', b: 'original b', c: '=A1' } },
  { id: 'two', values: { a: 'old', b: 'old', c: 1 } },
]

describe('freeform Grid paste planning', () => {
  it('preserves untouched cells and creates one write per existing row', () => {
    expect(planFreeformPaste(rows, cols, 0, 1, [['new b', 'new c'], ['new b2', 'new c2']]))
      .toEqual({ updates: [
        { rowId: 'one', values: { a: 'original a', b: 'new b', c: 'new c' } },
        { rowId: 'two', values: { a: 'old', b: 'new b2', c: 'new c2' } },
      ], appended: [] })
  })

  it('fills new rows instead of inserting blanks and discarding clipboard data', () => {
    expect(planFreeformPaste(rows, cols, 1, 0, [['updated', 'today'], ['new', 'tomorrow']]))
      .toEqual({ updates: [
        { rowId: 'two', values: { a: 'updated', b: 'today', c: 1 } },
      ], appended: [{ a: 'new', b: 'tomorrow' }] })
  })

  it('supports pasting into a blank freeform sheet', () => {
    expect(planFreeformPaste([], cols, 0, 0, [['first', 'second']]))
      .toEqual({ updates: [], appended: [{ a: 'first', b: 'second' }] })
  })

  it('blocks out-of-bounds columns rather than silently dropping values', () => {
    expect(() => planFreeformPaste(rows, cols, 0, 2, [['too wide', 'lost']]))
      .toThrow('more columns')
  })

  it('rejects invalid starting positions and oversize inputs', () => {
    expect(() => planFreeformPaste(rows, cols, 4, 0, [['x']])).toThrow('valid Grid cell')
    expect(() => planFreeformPaste(rows, cols, 0, 0, [Array(10001).fill('x')])).toThrow()
  })
})
