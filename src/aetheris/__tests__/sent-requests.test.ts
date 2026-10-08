import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { normaliseSent, sentStage, stageLine, waitingLabel } from '../sent-requests'

const base = normaliseSent({ id: 'r1', target_user_id: 'u2', target_name: 'Lee', reason: 'CFO search', created_at: '2026-10-01T00:00:00Z', days_waiting: 2, nudged_at: null, can_nudge: false })

describe('sentStage', () => {
  it('waits, then offers one reminder, then remembers it was sent', () => {
    expect(sentStage(base)).toBe('waiting')
    expect(sentStage({ ...base, daysWaiting: 6, canNudge: true })).toBe('nudge')
    expect(sentStage({ ...base, daysWaiting: 8, nudgedAt: '2026-10-07T00:00:00Z' })).toBe('nudged')
  })
  it('calls a two-week-old request stale once no reminder is left, but never hides an unused reminder', () => {
    expect(sentStage({ ...base, daysWaiting: 15, nudgedAt: '2026-10-07T00:00:00Z' })).toBe('stale')
    expect(sentStage({ ...base, daysWaiting: 20, canNudge: true })).toBe('nudge')
  })
})

describe('stageLine', () => {
  it('says how long and what happens next', () => {
    expect(stageLine({ ...base, daysWaiting: 0 })).toBe('Sent today. Lee decides; nothing happens until they accept.')
    expect(stageLine({ ...base, daysWaiting: 6, canNudge: true })).toBe('Waiting 6 days. You can send Lee one reminder.')
    expect(stageLine({ ...base, daysWaiting: 15, nudgedAt: '2026-10-07T00:00:00Z' })).toMatch(/^Waiting 15 days\. Lee may not be the right path/)
  })
})

describe('normaliseSent', () => {
  it('fills a missing name and coerces fields', () => {
    const r = normaliseSent({ id: 'x', target_user_id: 'u', target_name: '', created_at: '', days_waiting: '3', can_nudge: null })
    expect(r).toMatchObject({ targetName: 'A member', daysWaiting: 3, canNudge: false, nudgedAt: null, reason: '' })
  })
})

describe('waitingLabel', () => {
  it('counts whole days', () => {
    const now = Date.parse('2026-10-08T12:00:00Z')
    expect(waitingLabel('2026-10-08T01:00:00Z', now)).toBe('sent today')
    expect(waitingLabel('2026-10-07T11:00:00Z', now)).toBe('waiting 1 day')
    expect(waitingLabel('2026-09-30T12:00:00Z', now)).toBe('waiting 8 days')
  })
})
