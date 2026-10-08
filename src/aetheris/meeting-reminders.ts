/**
 * Meeting reminders: a downloadable calendar file (with its own 10-minute alert) and the
 * in-app banner for meetings about to start or already started without you.
 */

export interface ReminderMeeting {
  id: string
  title: string
  hostId: string
  scheduledFor: string | null
  startedAt: string | null
  endedAt: string | null
  myJoinedAt: string | null
}

export interface Reminder { meetingId: string; title: string; kind: 'starting' | 'started'; minutes: number }

/**
 * Which meetings deserve a banner now: scheduled ones starting within 10 minutes (or up to 10
 * minutes late), and calls someone else started in the last hour that you have not joined.
 */
export function dueReminders(meetings: ReminderMeeting[], myId: string, now = Date.now(), dismissed: ReadonlySet<string> = new Set()): Reminder[] {
  const out: Reminder[] = []
  for (const m of meetings) {
    if (m.endedAt || m.myJoinedAt || dismissed.has(m.id)) continue
    if (m.startedAt && m.hostId !== myId && now - new Date(m.startedAt).getTime() <= 60 * 60000) {
      out.push({ meetingId: m.id, title: m.title, kind: 'started', minutes: Math.max(0, Math.round((now - new Date(m.startedAt).getTime()) / 60000)) })
      continue
    }
    if (m.scheduledFor) {
      const until = new Date(m.scheduledFor).getTime() - now
      if (until <= 10 * 60000 && until >= -10 * 60000) out.push({ meetingId: m.id, title: m.title, kind: 'starting', minutes: Math.round(until / 60000) })
    }
  }
  return out.sort((a, b) => (a.kind === b.kind ? a.minutes - b.minutes : a.kind === 'started' ? -1 : 1))
}

export function reminderText(r: Reminder): string {
  if (r.kind === 'started') return `“${r.title}” has started${r.minutes ? ` (${r.minutes} min ago)` : ''}.`
  if (r.minutes > 0) return `“${r.title}” starts in ${r.minutes} minute${r.minutes === 1 ? '' : 's'}.`
  if (r.minutes === 0) return `“${r.title}” starts now.`
  return `“${r.title}” started ${-r.minutes} minute${r.minutes === -1 ? '' : 's'} ago.`
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Fold long lines at 75 octets as the iCalendar format requires. */
function fold(line: string): string {
  const parts: string[] = []
  let rest = line
  while (rest.length > 74) { parts.push(rest.slice(0, 74)); rest = ` ${rest.slice(74)}` }
  parts.push(rest)
  return parts.join('\r\n')
}

/** An .ics invitation for a scheduled meeting, with a 10-minute alert. */
export function icsForMeeting(m: { id: string; title: string; startsAt: string; minutes?: number; agenda?: string; url: string }, stamp = new Date().toISOString()): string {
  const end = new Date(new Date(m.startsAt).getTime() + (m.minutes ?? 45) * 60000).toISOString()
  const description = [m.agenda?.trim(), `Join on Ask Intros: ${m.url}`].filter(Boolean).join('\n\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ask Intros//Meetings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:meeting-${m.id}@askintros`,
    `DTSTAMP:${icsDate(stamp)}`,
    `DTSTART:${icsDate(m.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(m.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    'LOCATION:Ask Intros video',
    `URL:${m.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(m.title)}`, 'TRIGGER:-PT10M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
