/**
 * Pure helpers for member events: the "Add to calendar" .ics file, the attendee CSV export,
 * and converting between an event's local wall-clock time and UTC.
 */

export interface IcsEvent {
  id: string
  title: string
  description?: string | null
  startsAt: string | Date
  endsAt: string | Date
  location?: string | null
  url?: string | null
  cancelled?: boolean
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** 2026-10-09T18:30:00Z → 20261009T183000Z */
export function icsUtc(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

const utf8Length = (s: string) => new TextEncoder().encode(s).length

/** Fold a content line at 75 octets (continuations start with a space), never splitting a character. */
export function foldIcsLine(line: string): string {
  if (utf8Length(line) <= 75) return line
  const parts: string[] = []
  let current = ''
  let limit = 75
  for (const ch of line) {
    if (utf8Length(current + ch) > limit) {
      parts.push(current)
      current = ch
      limit = 74 // the leading space counts towards the next line's 75
    } else current += ch
  }
  if (current) parts.push(current)
  return parts.join('\r\n ')
}

export function buildEventIcs(event: IcsEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ask Intros//Member events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@askintros`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsUtc(event.startsAt)}`,
    `DTEND:${icsUtc(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ]
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  if (event.url && /^https:\/\//i.test(event.url)) lines.push(`URL:${event.url.replace(/[\r\n]/g, '')}`)
  lines.push(`STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT', 'END:VCALENDAR')
  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}

/** A safe file name for the download. */
export function icsFileName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `${slug || 'event'}.ics`
}

/* ── CSV ─────────────────────────────────────────────────────────────────────────────── */

/** Quote a CSV cell; cells that a spreadsheet would run as a formula are prefixed with '. */
export function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/* ── Time zones ──────────────────────────────────────────────────────────────────────── */

/** Offset (ms) of `timeZone` from UTC at the instant `date`. */
function zoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

export function isValidTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone }); return true } catch { return false }
}

/** '2026-11-03T19:00' in Europe/London → the UTC instant. */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) throw new Error('Use a date and time')
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  // Two passes settle the offset around daylight-saving changes.
  let guess = wall - zoneOffset(new Date(wall), timeZone)
  guess = wall - zoneOffset(new Date(guess), timeZone)
  return new Date(guess)
}

/** The UTC instant → '2026-11-03T19:00' on the wall clock in `timeZone` (for editing). */
export function utcToZonedLocal(value: string | Date, timeZone: string): string {
  const d = value instanceof Date ? value : new Date(value)
  const local = new Date(d.getTime() + zoneOffset(d, timeZone))
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`
}

/** "Tue 3 Nov, 19:00 – 22:00 (Europe/London)" */
export function eventWhen(startsAt: string, endsAt: string, timeZone: string, locale?: string): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC'
  const day = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const s = new Date(startsAt), e = new Date(endsAt)
  const sameDay = day.format(s) === day.format(e)
  return `${day.format(s)}, ${time.format(s)} – ${sameDay ? '' : `${day.format(e)}, `}${time.format(e)} (${tz.replace(/_/g, ' ')})`
}
