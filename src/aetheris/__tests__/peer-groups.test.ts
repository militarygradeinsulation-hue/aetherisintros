import { describe, expect, it } from 'vitest'

import { cleanMeetingUrl, localInputToIso, seatsLeft, splitSessions, threadPosts, validateIssue, type PeerPost } from '../peer-groups'

const post = (id: string, created_at: string, parent_id: string | null = null): PeerPost =>
  ({ id, parent_id, author_id: 'a', body: id, created_at, updated_at: created_at })

describe('threadPosts', () => {
  it('puts newest posts first with replies in order beneath them', () => {
    const t = threadPosts([
      post('old', '2026-10-01T10:00:00Z'), post('new', '2026-10-05T10:00:00Z'),
      post('r2', '2026-10-03T10:00:00Z', 'old'), post('r1', '2026-10-02T10:00:00Z', 'old'),
      post('orphan', '2026-10-02T10:00:00Z', 'gone'),
    ])
    expect(t.map(x => x.post.id)).toEqual(['new', 'old'])
    expect(t[1]?.replies.map(r => r.id)).toEqual(['r1', 'r2'])
    expect(t.flatMap(x => x.replies).some(r => r.id === 'orphan')).toBe(false)
  })
})

describe('seatsLeft', () => {
  it('never goes below zero or above the 16-person cap', () => {
    expect(seatsLeft(10, 12)).toBe(2)
    expect(seatsLeft(14, 12)).toBe(0)
    expect(seatsLeft(0, 40)).toBe(16)
  })
})

describe('cleanMeetingUrl', () => {
  it('accepts web links and in-app paths, refuses anything else', () => {
    expect(cleanMeetingUrl('  ')).toEqual({ url: null })
    expect(cleanMeetingUrl(' https://meet.example.com/x ').url).toBe('https://meet.example.com/x')
    expect(cleanMeetingUrl('/app/meetings').url).toBe('/app/meetings')
    expect(cleanMeetingUrl('javascript:alert(1)').error).toBeTruthy()
    expect(cleanMeetingUrl('https://' + 'a'.repeat(600)).error).toBeTruthy()
  })
})

describe('splitSessions', () => {
  it('keeps a session upcoming for three hours after it starts', () => {
    const now = Date.parse('2026-10-09T12:00:00Z')
    const s = (id: string, starts_at: string) => ({ id, starts_at, agenda: '', meeting_url: null })
    const { upcoming, past } = splitSessions([s('later', '2026-11-01T12:00:00Z'), s('now', '2026-10-09T10:00:00Z'), s('gone', '2026-09-01T12:00:00Z'), s('older', '2026-08-01T12:00:00Z')], now)
    expect(upcoming.map(x => x.id)).toEqual(['now', 'later'])
    expect(past.map(x => x.id)).toEqual(['gone', 'older'])
  })
})

describe('validateIssue', () => {
  it('needs a title and keeps text within the database limits', () => {
    expect(validateIssue({ title: 'ab', context: '', help: '' })).toBeTruthy()
    expect(validateIssue({ title: 'Co-founder wants out', context: '', help: '' })).toBeNull()
    expect(validateIssue({ title: 'Fine title', context: 'x'.repeat(4001), help: '' })).toBeTruthy()
  })
})

describe('localInputToIso', () => {
  it('turns a datetime-local value into a timestamp', () => {
    expect(localInputToIso('')).toBeNull()
    expect(localInputToIso('not a date')).toBeNull()
    expect(localInputToIso('2026-11-03T17:00')).toMatch(/^2026-11-0[34]T/)
  })
})
