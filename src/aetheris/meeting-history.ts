import type { Meeting } from './meetings'

/** A session belongs to the local day it actually started, then its schedule, then creation. */
export function meetingActivityDate(meeting: Pick<Meeting,'startedAt'|'scheduledFor'|'createdAt'>): Date {
  const candidate = meeting.startedAt || meeting.scheduledFor || meeting.createdAt
  const day = new Date(candidate)
  return Number.isNaN(day.getTime()) ? new Date(0) : day
}
const localDay = (date: Date) => [date.getFullYear(), date.getMonth(), date.getDate()].join('-')

/** Do not hide unfinished meetings from history; opening Notes works even if nobody pressed End. */
export function groupMeetingsByDay<T extends Pick<Meeting,'startedAt'|'scheduledFor'|'createdAt'|'endedAt'>>(
  meetings: readonly T[], now = new Date(),
): { today: T[]; upcoming: T[]; earlier: T[] } {
  const today: T[] = [], upcoming: T[] = [], earlier: T[] = []
  for (const meeting of meetings) {
    const date = meetingActivityDate(meeting)
    if (localDay(date) === localDay(now)) today.push(meeting)
    else if (!meeting.startedAt && !meeting.endedAt && meeting.scheduledFor && date > now) upcoming.push(meeting)
    else earlier.push(meeting)
  }
  const descending = (a: T, b: T) => meetingActivityDate(b).getTime() - meetingActivityDate(a).getTime()
  today.sort(descending)
  earlier.sort(descending)
  upcoming.sort((a,b) => meetingActivityDate(a).getTime() - meetingActivityDate(b).getTime())
  return { today, upcoming, earlier }
}
