import { describe, expect, it } from 'vitest'

import { dueReminders, icsForMeeting, reminderText, type ReminderMeeting } from '../meeting-reminders'

const now = Date.parse('2026-11-02T15:00:00Z')
const base: ReminderMeeting = { id: 'm1', title: 'Board prep', hostId: 'host', scheduledFor: null, startedAt: null, endedAt: null, myJoinedAt: null }
const at = (min: number) => new Date(now + min * 60000).toISOString()

describe('dueReminders', () => {
  it('reminds from 10 minutes before until 10 minutes after the scheduled time', () => {
    expect(dueReminders([{ ...base, scheduledFor: at(8) }], 'me', now)).toEqual([{ meetingId: 'm1', title: 'Board prep', kind: 'starting', minutes: 8 }])
    expect(dueReminders([{ ...base, scheduledFor: at(-9) }], 'me', now)[0]?.minutes).toBe(-9)
    expect(dueReminders([{ ...base, scheduledFor: at(11) }], 'me', now)).toEqual([])
    expect(dueReminders([{ ...base, scheduledFor: at(-11) }], 'me', now)).toEqual([])
  })
  it('tells you when someone else started a call you have not joined', () => {
    expect(dueReminders([{ ...base, startedAt: at(-3) }], 'me', now)).toEqual([{ meetingId: 'm1', title: 'Board prep', kind: 'started', minutes: 3 }])
    expect(dueReminders([{ ...base, hostId: 'me', startedAt: at(-3) }], 'me', now)).toEqual([])
    expect(dueReminders([{ ...base, startedAt: at(-61) }], 'me', now)).toEqual([])
  })
  it('stays quiet once you joined, the meeting ended, or you dismissed it', () => {
    expect(dueReminders([{ ...base, scheduledFor: at(5), myJoinedAt: at(-1) }], 'me', now)).toEqual([])
    expect(dueReminders([{ ...base, scheduledFor: at(5), endedAt: at(-1) }], 'me', now)).toEqual([])
    expect(dueReminders([{ ...base, scheduledFor: at(5) }], 'me', now, new Set(['m1']))).toEqual([])
  })
  it('puts calls already under way first', () => {
    const r = dueReminders([{ ...base, id: 'a', scheduledFor: at(2) }, { ...base, id: 'b', startedAt: at(-1) }], 'me', now)
    expect(r.map(x => x.meetingId)).toEqual(['b', 'a'])
  })
})

describe('reminderText', () => {
  it('reads naturally', () => {
    expect(reminderText({ meetingId: 'm', title: 'X', kind: 'starting', minutes: 1 })).toBe('“X” starts in 1 minute.')
    expect(reminderText({ meetingId: 'm', title: 'X', kind: 'starting', minutes: 0 })).toBe('“X” starts now.')
    expect(reminderText({ meetingId: 'm', title: 'X', kind: 'starting', minutes: -4 })).toBe('“X” started 4 minutes ago.')
    expect(reminderText({ meetingId: 'm', title: 'X', kind: 'started', minutes: 0 })).toBe('“X” has started.')
  })
})

describe('icsForMeeting', () => {
  const ics = icsForMeeting({ id: 'abc', title: 'Board prep; Q4, plan', startsAt: '2026-11-02T15:00:00Z', agenda: 'Line one\nLine two '.repeat(8), url: 'https://example.com/app/meetings' }, '2026-10-08T12:00:00Z')
  it('is a valid calendar event with a 10-minute alert', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261102T150000Z')
    expect(ics).toContain('DTEND:20261102T154500Z')
    expect(ics).toContain('DTSTAMP:20261008T120000Z')
    expect(ics).toContain('TRIGGER:-PT10M')
    expect(ics).toContain('UID:meeting-abc@askintros')
  })
  it('escapes text and folds long lines', () => {
    expect(ics).toContain('SUMMARY:Board prep\; Q4\\, plan')
    expect(ics.split('\r\n').every(l => l.length <= 75)).toBe(true)
    expect(ics).toMatch(/\r\n /)
  })
})
