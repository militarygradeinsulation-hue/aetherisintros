import { describe, expect, it } from 'vitest'

import { digestEmail } from '../digest-format'
import { buildWeek } from '../this-week-core'
import { secretMatches } from '@/lib/digest.server'

const items = buildWeek({
  pendingRequests: [{ id: 'r1', requesterName: 'Dana <script>', reason: 'Renewal at Northwind', createdAt: '' }],
  dueCheckins: 1, unansweredSent: [], helpableAsks: [], quietAsks: [], companyRisk: [],
})
const base = { firstName: 'Ana', appUrl: 'https://intros.example', unsubscribeUrl: 'https://intros.example/api/public/digest-unsubscribe?token=t', timeZone: 'UTC' }

describe('digestEmail', () => {
  it('sends nothing for an empty week', () => {
    expect(digestEmail({ ...base, items: [], meetings: [] })).toBeNull()
  })
  it('lists what is waiting, with links, meetings and an unsubscribe link', () => {
    const e = digestEmail({ ...base, items, meetings: [{ title: 'Board prep', startsAt: '2026-11-02T15:00:00Z' }] })!
    expect(e.subject).toBe('2 things waiting on you this week · 1 meeting')
    expect(e.text).toContain('Good morning, Ana.')
    expect(e.text).toContain('Review request: https://intros.example/app/introductions')
    expect(e.text).toContain('Board prep (Mon, Nov 2, 3:00 PM)')
    expect(e.text).toContain('Stop these emails: https://intros.example/api/public/digest-unsubscribe?token=t')
    expect(e.html).toContain('Dana &lt;script&gt; is waiting on your answer')
    expect(e.html).not.toContain('<script>')
  })
  it('has a meetings-only subject when nothing else is waiting', () => {
    expect(digestEmail({ ...base, items: [], meetings: [{ title: 'X', startsAt: '2026-11-02T15:00:00Z' }] })!.subject).toBe('Your week on Ask Intros: 1 meeting')
  })
})

describe('secretMatches', () => {
  it('needs the exact secret', () => {
    expect(secretMatches('abc123', 'abc123')).toBe(true)
    expect(secretMatches('abc124', 'abc123')).toBe(false)
    expect(secretMatches('abc', 'abc123')).toBe(false)
    expect(secretMatches('', '')).toBe(false)
  })
})
