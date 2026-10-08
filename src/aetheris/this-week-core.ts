/**
 * The pure part of "This week": what is waiting on a member, ordered by who is affected.
 * Shared by the Home panel (browser) and the weekly email digest (server), so it imports
 * nothing that touches the network.
 */
import { tokens } from './opportunity-graph'

export type WeekTarget = 'intros' | 'needs' | 'organization'
export type WeekKind = 'respond' | 'checkin' | 'unanswered' | 'help' | 'quiet_ask' | 'company_risk'

export interface WeekItem {
  key: string
  kind: WeekKind
  title: string
  detail: string
  action: string
  target: WeekTarget
}

export interface WeekInputs {
  pendingRequests: Array<{ id: string; requesterName: string; reason: string; createdAt: string }>
  dueCheckins: number
  /** The member's own requests that are ready for a reminder or have gone stale. */
  unansweredSent: Array<{ id: string; targetName: string; daysWaiting: number; canNudge: boolean }>
  helpableAsks: Array<{ id: string; ask: string; authorName: string; matched: string[] }>
  quietAsks: Array<{ id: string; ask: string; daysOld: number }>
  companyRisk: Array<{ orgName: string; atRisk: number; singleOwner: number }>
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Words a member's profile says they can help with, for matching against network asks. */
export function helpVocabulary(profile: { can_help_with?: string | null; expertise?: string[] | null; what_i_do?: string | null }): Set<string> {
  return new Set(tokens([profile.can_help_with ?? '', ...(profile.expertise ?? []), profile.what_i_do ?? ''].join(' ')))
}

/** Words an ask and the member's own stated help share; at least two to count as a fit. */
export function askMatch(ask: string, vocab: Set<string>): string[] {
  const hits = tokens(ask).filter(t => vocab.has(t))
  return hits.length >= 2 ? hits.slice(0, 3) : []
}

export function buildWeek(input: WeekInputs, limit = 6): WeekItem[] {
  const items: WeekItem[] = []
  for (const r of input.pendingRequests.slice(0, 3)) {
    items.push({
      key: `respond-${r.id}`, kind: 'respond', target: 'intros',
      title: `${r.requesterName} is waiting on your answer`,
      detail: r.reason ? clip(r.reason) : 'An introduction request with its context capsule.',
      action: 'Review request',
    })
  }
  if (input.pendingRequests.length > 3) {
    items.push({ key: 'respond-more', kind: 'respond', target: 'intros', title: `${input.pendingRequests.length - 3} more introduction requests waiting`, detail: 'Oldest first.', action: 'Open introductions' })
  }
  if (input.dueCheckins > 0) {
    items.push({
      key: 'checkins', kind: 'checkin', target: 'intros',
      title: `${plural(input.dueCheckins, 'introduction')} to follow up`,
      detail: 'Ten seconds each. This is how the network learns which introductions change results.',
      action: 'Record what happened',
    })
  }
  for (const s of input.unansweredSent.slice(0, 2)) {
    items.push({
      key: `unanswered-${s.id}`, kind: 'unanswered', target: 'intros',
      title: `${s.targetName} hasn't answered in ${s.daysWaiting} days`,
      detail: s.canNudge ? 'Send one reminder, or withdraw and try another path.' : 'A reminder was sent. Consider withdrawing and routing it elsewhere.',
      action: s.canNudge ? 'Send a reminder' : 'Review request',
    })
  }
  for (const a of input.helpableAsks.slice(0, 2)) {
    items.push({
      key: `help-${a.id}`, kind: 'help', target: 'needs',
      title: `${a.authorName} asked: “${clip(a.ask, 70)}”`,
      detail: `Matches what you say you help with: ${a.matched.join(', ')}.`,
      action: 'See the ask',
    })
  }
  for (const a of input.quietAsks.slice(0, 1)) {
    items.push({
      key: `quiet-${a.id}`, kind: 'quiet_ask', target: 'needs',
      title: `No replies yet to “${clip(a.ask, 70)}”`,
      detail: `Posted ${a.daysOld} days ago. Sharpen it, or route it to specific people.`,
      action: 'Revisit the ask',
    })
  }
  for (const c of input.companyRisk) {
    if (!c.atRisk && !c.singleOwner) continue
    items.push({
      key: `company-${c.orgName}`, kind: 'company_risk', target: 'organization',
      title: c.atRisk ? `${c.orgName}: ${plural(c.atRisk, 'relationship')} no one here holds now` : `${c.orgName}: ${plural(c.singleOwner, 'relationship')} rest on one person`,
      detail: 'Someone should pick these up before they go cold.',
      action: 'Open company workspace',
    })
  }
  return items.slice(0, limit)
}
