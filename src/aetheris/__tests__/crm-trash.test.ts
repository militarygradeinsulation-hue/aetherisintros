import { describe, expect, it } from 'vitest'
import { daysLeftInTrash, isTrashExpired } from '../crm/trash'

const now = Date.parse('2026-10-27T12:00:00Z')
describe('contact trash', () => {
  it('keeps a deleted contact for 30 days', () => {
    expect(daysLeftInTrash('2026-10-27T12:00:00Z', now)).toBe(30)
    expect(isTrashExpired('2026-09-28T12:00:01Z', now)).toBe(false)
  })
  it('removes it once 30 days have passed', () => {
    expect(isTrashExpired('2026-09-27T12:00:00Z', now)).toBe(true)
  })
})
