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
})
