import { describe, expect, it } from 'vitest'
import { safeAuthNext } from '../auth-next'

describe('safeAuthNext', () => {
  it('retains member deep links and queries on this application', () => {
    expect(safeAuthNext('/app?view=messages')).toBe('/app?view=messages')
    expect(safeAuthNext('/app?view=people#list')).toBe('/app?view=people#list')
    expect(safeAuthNext('/early-access')).toBe('/early-access')
    expect(safeAuthNext('/.lovable/oauth/consent?client_id=sample')).toBe('/.lovable/oauth/consent?client_id=sample')
  })

  it('rejects external or protocol-relative login destinations', () => {
    expect(safeAuthNext('https://example.net/phish')).toBe('')
    expect(safeAuthNext('//example.net/phish')).toBe('')
    expect(safeAuthNext('/\\example.net/phish')).toBe('')
    expect(safeAuthNext('///example.net/phish')).toBe('')
    expect(safeAuthNext('javascript:alert(1)')).toBe('')
  })

  it('rejects unexpected values, control characters and excessively long destinations', () => {
    expect(safeAuthNext(null)).toBe('')
    expect(safeAuthNext({ next: '/app' })).toBe('')
    expect(safeAuthNext('/app\nother')).toBe('')
    expect(safeAuthNext('/app\rother')).toBe('')
    expect(safeAuthNext('/'.padEnd(2050, 'a'))).toBe('')
  })
})
