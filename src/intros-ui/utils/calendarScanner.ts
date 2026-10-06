// @ts-nocheck
import { CalendarEvent, Person } from '../types';
import { parseDaysAgo } from './reportExport';

export interface CalendarScanResult {
  updatedPeople: Person[];
  activeCount: number;
  dormantCount: number;
  followupCount: number;
  totalScannedEvents: number;
  details: string[];
}

export function scanCalendarAndMapEngagement(
  people: Person[],
  calendarEvents: CalendarEvent[]
): CalendarScanResult {
  const details: string[] = [];
  let activeCount = 0;
  let dormantCount = 0;
  let followupCount = 0;

  const updatedPeople = people.map((person) => {
    // Find calendar events involving this person
    const matchedEvents = calendarEvents.filter((ev) => {
      const isLinked = ev.linkedPerson?.toLowerCase().includes(person.name.toLowerCase());
      const isAttendee = ev.attendees?.some((att) =>
        att.name.toLowerCase().includes(person.name.toLowerCase())
      );
      return isLinked || isAttendee;
    });

    const daysAgo = parseDaysAgo(person.lastTouchpoint);

    if (matchedEvents.length > 0) {
      // Confirmed active via scheduled calendar event
      activeCount++;
      const topEvent = matchedEvents[0];
      details.push(
        `${person.name}: Active — Briefing scheduled (${topEvent.title} at ${topEvent.time})`
      );

      return {
        ...person,
        engagement: 'active' as const,
        radarBucket: (person.radarBucket === 'dormant' || person.radarBucket === 'at_risk') 
          ? 'emerging' as const 
          : person.radarBucket,
      };
    } else if (daysAgo >= 30) {
      // Flagged as dormant / follow-up needed due to schedule absence & touchpoint drift
      if (person.radarBucket === 'at_risk' || daysAgo >= 45) {
        followupCount++;
        details.push(
          `${person.name}: Follow-up Needed — ${daysAgo}d touchpoint drift with zero meetings on calendar`
        );
        return {
          ...person,
          engagement: 'followup' as const,
          radarBucket: 'at_risk' as const,
        };
      } else {
        dormantCount++;
        details.push(
          `${person.name}: Dormant — ${daysAgo}d touchpoint drift with zero calendar commitments`
        );
        return {
          ...person,
          engagement: 'dormant' as const,
          radarBucket: 'dormant' as const,
        };
      }
    } else {
      // Steady connection
      activeCount++;
      details.push(
        `${person.name}: Active — Recent interaction within ${daysAgo}d`
      );
      return {
        ...person,
        engagement: 'active' as const,
      };
    }
  });

  return {
    updatedPeople,
    activeCount,
    dormantCount,
    followupCount,
    totalScannedEvents: calendarEvents.length,
    details,
  };
}
