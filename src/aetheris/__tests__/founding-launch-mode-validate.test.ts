import { describe, expect, it } from 'vitest'
import { normalizeFoundingStats } from '../access'

describe('founding member launch statistics', () => {
  const restricted = { approved: 0, capacity: 1000, mode: 'invite_only' }

  it('preserves validated published launch modes', () => {
    expect(normalizeFoundingStats({ approved: 10, capacity: 1000, mode: 'first_1000' }))
      .toEqual({ approved: 10, capacity: 1000, mode: 'first_1000' })
    expect(normalizeFoundingStats({ approved: 1000, capacity: 1000, mode: 'closed' }))
      .toEqual({ approved: 1000, capacity: 1000, mode: 'closed' })
  })
  it('never treats unknown, missing, or hostile modes as open registration', () => {
    for (const raw of [null, undefined, {}, {mode: 'open'}, {mode: true}, {mode: 'first_1000', approved: -1, capacity: 1000},
      {mode: 'first_1000', approved: 1001, capacity: 1000},
      {mode: 'first_1000', approved: 0, capacity: 0},
      {mode: 'first_1000', approved: 'NaN', capacity: 1000},
      {mode: 'first_1000', approved: 1.3, capacity: 1000}]) {
      expect(normalizeFoundingStats(raw)).toEqual(restricted)
    }
  })
  it('rejects coercible non-numbers in either counter', () => {
    for (const value of [null, undefined, true, false, '', '0', '10', '1000', [], [1], {}, { valueOf: () => 1 }]) {
      expect(normalizeFoundingStats({ mode: 'first_1000', approved: value, capacity: 1000 })).toEqual(restricted)
      expect(normalizeFoundingStats({ mode: 'first_1000', approved: 0, capacity: value })).toEqual(restricted)
    }
  })
  it('rejects non-finite, fractional, and unsafe numeric counters', () => {
    for (const value of [NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(normalizeFoundingStats({ mode: 'first_1000', approved: value, capacity: Number.MAX_SAFE_INTEGER })).toEqual(restricted)
      expect(normalizeFoundingStats({ mode: 'first_1000', approved: 0, capacity: value })).toEqual(restricted)
    }
  })
  it('accepts numeric boundary values without coercion', () => {
    for (const [approved, capacity] of [[0, 1], [1, 1], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]]) {
      expect(normalizeFoundingStats({ mode: 'first_1000', approved, capacity })).toEqual({ mode: 'first_1000', approved, capacity })
    }
  })
})
