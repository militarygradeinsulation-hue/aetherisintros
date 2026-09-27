import type { Finding } from '../ceo-insights'
import type { FindingRow } from './types'

const sev = { critical: 3, high: 3, medium: 2, low: 1 } as const

/**
 * Open diagnostic findings become an additional source for the existing
 * Blind Spot radar — one list, not a competing one. Items the radar already
 * detects on its own (missing next action) are not repeated.
 */
export function findingsAsBlindSpots(rows: readonly FindingRow[]): Finding[] {
  return rows
    .filter(f => f.status === 'open' && f.kind !== 'pattern' && !/has no next action recorded\.$/.test(f.claim))
    .slice(0, 20)
    .map(f => ({
      id: `diag-${f.id}`,
      kind: f.kind === 'leak' ? 'Revenue leak' : f.kind === 'unknown' ? 'Unknown worth checking' : f.kind === 'risk' ? 'Diagnosed risk' : 'Diagnosed gap',
      title: f.claim,
      why: f.evidence.slice(0, 3).map(e => ({ text: e.label || e.ref, source: 'RECORDED' as const })),
      missing: f.unknowns.slice(0, 2),
      source: 'RECORDED' as const,
      route: { page: 'crm' },
      fix: 'Open the diagnosis',
      severity: sev[f.severity],
    }))
}
