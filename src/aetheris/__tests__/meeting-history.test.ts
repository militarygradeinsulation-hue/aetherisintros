import { describe, expect, it } from 'vitest'
import { groupMeetingsByDay, meetingActivityDate } from '../meeting-history'

const now = new Date('2026-10-28T02:35:00Z')
const meeting = (id: string, createdAt: string, startedAt: string | null = null, endedAt: string | null = null, scheduledFor: string | null = null) =>
  ({ id, createdAt, startedAt, endedAt, scheduledFor })

describe('meeting history and saved material discovery', () => {
  it('keeps earlier meetings visible even when their ended_at is missing', () => {
    const m = meeting('yesterday', '2026-10-25T15:00:00Z', '2026-10-25T16:00:00Z')
    expect(groupMeetingsByDay([m], now).earlier).toEqual([m])
  })
  it('groups today’s finished or still-open calls together and future appointments separately', () => {
    const saved = meeting('today', '2026-10-28T02:00:00Z', '2026-10-28T02:15:00Z')
    const ended = meeting('finished', '2026-10-28T01:00:00Z', '2026-10-28T01:10:00Z', '2026-10-28T01:30:00Z')
    const upcoming = meeting('next', '2026-10-25T01:00:00Z', null, null, '2026-10-30T14:00:00Z')
    const result = groupMeetingsByDay([upcoming,saved,ended], now)
    expect(result.today.map(m=>m.id)).toEqual(['today','finished'])
    expect(result.upcoming.map(m=>m.id)).toEqual(['next'])
    expect(result.earlier).toEqual([])
  })
  it('chooses actual start over original scheduled date', () => {
    const m = meeting('rescheduled', '2026-10-25T11:00:00Z', '2026-10-28T02:15:00Z',null,'2026-10-25T12:00:00Z')
    expect(meetingActivityDate(m).toISOString()).toBe('2026-10-28T02:15:00.000Z')
  })
})
