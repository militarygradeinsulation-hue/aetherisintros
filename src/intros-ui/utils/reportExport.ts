// @ts-nocheck
import { Person, Opportunity } from '../types';

export type SortMode = 'last_engaged' | 'name' | 'urgency';

export function parseDaysAgo(touchpoint: string): number {
  const lower = touchpoint.toLowerCase();
  if (lower.includes('yesterday')) return 1;
  if (lower.includes('today') || lower.includes('hour') || lower.includes('minute') || lower.includes('m ago') || lower.includes('h ago')) return 0;
  
  const daysMatch = lower.match(/(\d+)\s*d/);
  if (daysMatch) return parseInt(daysMatch[1], 10);
  
  const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) return parseInt(daysAgoMatch[1], 10);

  const weeksMatch = lower.match(/(\d+)\s*week/);
  if (weeksMatch) return parseInt(weeksMatch[1], 10) * 7;

  return 30; // default medium distance
}

export function getUrgencyRank(person: Person): number {
  // Higher rank = higher urgency
  if (person.engagement === 'followup' || person.radarBucket === 'at_risk') return 100;
  if (person.radarBucket === 'hot') return 80;
  if (person.radarBucket === 'emerging') return 60;
  if (person.radarBucket === 'dormant') return 40;
  return 20; // strategic / steady
}

export function sortConnections(people: Person[], mode: SortMode): Person[] {
  const list = [...people];
  switch (mode) {
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'urgency':
      return list.sort((a, b) => {
        const rankDiff = getUrgencyRank(b) - getUrgencyRank(a);
        if (rankDiff !== 0) return rankDiff;
        return b.connectionScore - a.connectionScore;
      });
    case 'last_engaged':
    default:
      return list.sort((a, b) => {
        const daysA = parseDaysAgo(a.lastTouchpoint);
        const daysB = parseDaysAgo(b.lastTouchpoint);
        return daysA - daysB;
      });
  }
}

export function generateNetworkCsv(people: Person[], opportunities: Opportunity[] = []): string {
  const headers = [
    'Connection Name',
    'Executive Title',
    'Organization',
    'Email Address',
    'Phone',
    'Connection Score (0-100)',
    'Recency Factor',
    'Frequency Factor',
    'Reciprocity Factor',
    'Mutual Executives',
    'Engagement Level',
    'Radar Bucket',
    'Last Engagement Touchpoint',
    'Touchpoint Modality',
    'Linked Active Opportunities',
    'Total Pipeline Exposure (USD)',
    'Executive Notes'
  ];

  const rows = people.map((p) => {
    const opps = opportunities.filter((o) =>
      o.leadPerson?.toLowerCase().includes(p.name.toLowerCase())
    );
    const oppTitles = opps.map((o) => o.title).join('; ') || 'None';
    const totalPipeline = opps.reduce((sum, o) => sum + o.value, 0);

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    return [
      escapeCsv(p.name),
      escapeCsv(p.title),
      escapeCsv(p.company),
      escapeCsv(p.email),
      escapeCsv(p.phone || 'Private / Verified'),
      p.connectionScore,
      p.scoreBreakdown?.recency ?? 'N/A',
      p.scoreBreakdown?.frequency ?? 'N/A',
      p.scoreBreakdown?.reciprocity ?? 'N/A',
      p.mutualsCount,
      escapeCsv(p.engagement ? p.engagement.toUpperCase() : 'ACTIVE'),
      escapeCsv(p.radarBucket ? p.radarBucket.toUpperCase() : 'STRATEGIC'),
      escapeCsv(p.lastTouchpoint),
      escapeCsv(p.touchpointType),
      escapeCsv(oppTitles),
      totalPipeline,
      escapeCsv(p.notes || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function downloadNetworkReport(people: Person[], opportunities: Opportunity[] = []) {
  const csvContent = generateNetworkCsv(people, opportunities);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Aetheris_Executive_Network_Report_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
