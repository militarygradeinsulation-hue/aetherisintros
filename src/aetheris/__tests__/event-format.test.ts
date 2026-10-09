import { describe, expect, it } from 'vitest'

import {
  buildEventIcs, csvCell, escapeIcsText, eventWhen, foldIcsLine, icsFileName, icsUtc, toCsv,
  utcToZonedLocal, zonedLocalToUtc,
} from '../event-format'

const bytes = (s: string) => new TextEncoder().encode(s).length

describe('icsUtc', () => {
  it('writes UTC basic format', () => {
    expect(icsUtc('2026-11-03T19:05:09Z')).toBe('20261103T190509Z')
    expect(icsUtc('2026-11-03T19:05:09+02:00')).toBe('20261103T170509Z')
  })
  it('rejects invalid dates', () => {
    expect(() => icsUtc('nope')).toThrow()
  })
})

describe('escapeIcsText', () => {
  it('escapes backslashes, separators and newlines', () => {
    expect(escapeIcsText('a\\b; c, d\ne\r\nf')).toBe('a\\\\b\\; c\\, d\\ne\\nf')
  })
})

describe('foldIcsLine', () => {
  it('leaves short lines alone', () => {
    expect(foldIcsLine('SUMMARY:Dinner')).toBe('SUMMARY:Dinner')
  })
  it('folds at 75 octets with a leading space', () => {
    const line = 'DESCRIPTION:' + 'x'.repeat(200)
    const folded = foldIcsLine(line)
    const parts = folded.split('\r\n')
    expect(parts.length).toBeGreaterThan(2)
    expect(parts.every(p => bytes(p) <= 75)).toBe(true)
    expect(parts.slice(1).every(p => p.startsWith(' '))).toBe(true)
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line)
  })
  it('never splits a multi-byte character', () => {
    const line = 'SUMMARY:' + 'é€😀'.repeat(30)
    const parts = foldIcsLine(line).split('\r\n')
    expect(parts.every(p => bytes(p) <= 75)).toBe(true)
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line)
  })
})

describe('buildEventIcs', () => {
  const ics = buildEventIcs({
    id: 'abc', title: 'Operators dinner, London; private', description: 'Line one\nLine two',
    startsAt: '2026-11-03T19:00:00Z', endsAt: '2026-11-03T22:00:00Z', location: '1 Main St, London', url: 'https://meet.example.com/x',
  }, new Date('2026-10-01T00:00:00Z'))
  it('is a CRLF calendar with one event', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '').includes('\n')).toBe(false)
  })
  it('uses UTC times and escaped text', () => {
    expect(ics).toContain('DTSTART:20261103T190000Z\r\n')
    expect(ics).toContain('DTEND:20261103T220000Z\r\n')
    expect(ics).toContain('DTSTAMP:20261001T000000Z\r\n')
    expect(ics).toContain('UID:abc@askintros\r\n')
    expect(ics).toContain('SUMMARY:Operators dinner\\, London\\; private\r\n')
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\r\n')
    expect(ics).toContain('LOCATION:1 Main St\\, London\r\n')
    expect(ics).toContain('URL:https://meet.example.com/x\r\n')
    expect(ics).toContain('STATUS:CONFIRMED')
  })
  it('leaves out non-https links and empty fields, and marks cancellations', () => {
    const c = buildEventIcs({ id: 'x', title: 'T', startsAt: '2026-11-03T19:00:00Z', endsAt: '2026-11-03T20:00:00Z', url: 'javascript:alert(1)', cancelled: true })
    expect(c).not.toContain('URL:')
    expect(c).not.toContain('LOCATION:')
    expect(c).not.toContain('DESCRIPTION:')
    expect(c).toContain('STATUS:CANCELLED')
  })
  it('names the file safely', () => {
    expect(icsFileName('Operators dinner / London!')).toBe('operators-dinner-london.ics')
    expect(icsFileName('***')).toBe('event.ics')
  })
})

describe('csv', () => {
  it('quotes and neutralises formulas', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell(null)).toBe('')
    expect(toCsv(['Name', 'Status'], [['Ada', 'going']])).toBe('Name,Status\r\nAda,going\r\n')
  })
})

describe('time zones', () => {
  it('converts wall-clock time in a zone to UTC and back', () => {
    expect(zonedLocalToUtc('2026-11-03T19:00', 'Europe/London').toISOString()).toBe('2026-11-03T19:00:00.000Z')
    expect(zonedLocalToUtc('2026-07-03T19:00', 'Europe/London').toISOString()).toBe('2026-07-03T18:00:00.000Z')
    expect(zonedLocalToUtc('2026-07-03T19:00', 'America/New_York').toISOString()).toBe('2026-07-03T23:00:00.000Z')
    expect(utcToZonedLocal('2026-07-03T23:00:00Z', 'America/New_York')).toBe('2026-07-03T19:00')
    expect(utcToZonedLocal('2026-11-03T19:00:00Z', 'UTC')).toBe('2026-11-03T19:00')
  })
  it('describes when an event happens in its own zone', () => {
    const s = eventWhen('2026-07-03T23:00:00Z', '2026-07-04T01:00:00Z', 'America/New_York', 'en-GB')
    expect(s).toContain('19:00')
    expect(s).toContain('21:00')
    expect(s).toContain('(America/New York)')
  })
})
