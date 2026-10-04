/**
 * Zero-credit company diagnostic. Pure, deterministic rules over the member's
 * own CRM records — no model calls. Money is only ever the recorded value of
 * open opportunities, labelled as exposure, never as a confirmed loss.
 */
import type { OperationalSnapshot } from '../crm/repo'

export type DiagnosticArea = 'Revenue' | 'Customer retention' | 'Coverage' | 'Follow-through'

export interface DiagnosticIssue {
  id: string
  area: DiagnosticArea
  title: string
  detail: string
  severity: 'high' | 'medium' | 'low'
  exposure: number
  currency: string
  evidence: string[]
  why: string[]
  fix: { label: string; task: string; companyId: string | null; opportunityId: string | null; personId: string | null }
}

export interface DiagnosticReport {
  companyName: string
  issues: DiagnosticIssue[]
  exposureByCurrency: Record<string, number>
  recordCounts: { companies: number; people: number; opportunities: number; tasks: number }
}

const DAY = 86_400_000
const daysSince = (iso: string | null | undefined, now: number) => (iso ? Math.floor((now - new Date(iso).getTime()) / DAY) : null)
const isClosed = (stage: string) => /won|lost|closed/i.test(stage)

export function buildDiagnostic(snap: Pick<OperationalSnapshot, 'companies' | 'people' | 'opportunities' | 'tasks'>, companyName: string, now = Date.now()): DiagnosticReport {
  const companies = snap.companies.filter(c => !c.archived)
  const people = snap.people.filter(p => !(p as { archived?: boolean }).archived)
  const opps = snap.opportunities.filter(o => !(o as { archived?: boolean }).archived)
  const issues: DiagnosticIssue[] = []
  const companyLabel = (id: string | null) => companies.find(c => c.id === id)?.name ?? 'an account'

  for (const o of opps) {
    if (isClosed(o.stageName)) continue
    const idle = daysSince(o.updatedAt, now) ?? 0
    const overdue = o.expectedClose ? new Date(o.expectedClose).getTime() < now : false
    if (idle >= 45 || overdue) {
      issues.push({
        id: `stall-${o.id}`, area: 'Revenue', severity: idle >= 90 || overdue ? 'high' : 'medium',
        title: `${o.name} has stopped moving`,
        detail: overdue ? `The expected close date has passed and the deal is still in ${o.stageName || 'an open stage'}.` : `No change recorded for ${idle} days.`,
        exposure: o.amount > 0 ? o.amount : 0, currency: o.currency || 'USD',
        evidence: [`Last update ${idle} days ago`, o.expectedClose ? `Expected close ${o.expectedClose.slice(0, 10)}` : 'No close date set', o.nextAction ? `Next action: ${o.nextAction}` : 'No next action recorded'],
        why: [
          'The deal is not moving through stages.',
          o.nextAction ? 'A next action exists but has not been completed.' : 'No one owns a next step.',
          o.personId ? 'The single contact may have gone quiet.' : 'No contact is linked to the deal, so nobody is accountable on their side.',
        ],
        fix: { label: 'Create follow-up', task: `Re-open ${o.name}: confirm timing and next step`, companyId: o.companyId, opportunityId: o.id, personId: o.personId },
      })
    }
  }

  for (const c of companies) {
    const linked = people.filter(p => p.companyId === c.id)
    const openOpps = opps.filter(o => o.companyId === c.id && !isClosed(o.stageName))
    if (openOpps.length && linked.length <= 1) {
      const value = openOpps.reduce((s, o) => s + Math.max(0, o.amount), 0)
      issues.push({
        id: `single-${c.id}`, area: 'Coverage', severity: 'medium',
        title: `${c.name} depends on ${linked.length ? 'one person' : 'nobody on record'}`,
        detail: `${openOpps.length} open ${openOpps.length === 1 ? 'opportunity' : 'opportunities'} with ${linked.length} recorded contact${linked.length === 1 ? '' : 's'}.`,
        exposure: 0, currency: openOpps[0]?.currency || 'USD',
        evidence: [`${linked.length} contact(s) linked`, `${openOpps.length} open opportunity(ies)`, value ? `Recorded value ${value.toLocaleString()}` : 'No value recorded'],
        why: ['If that contact changes role or goes quiet, the account stalls.', 'There is no second relationship to confirm decisions.'],
        fix: { label: 'Add a second contact', task: `Find a second relationship at ${c.name}`, companyId: c.id, opportunityId: null, personId: null },
      })
    }
  }

  for (const p of people) {
    if (p.lifecycle !== 'customer') continue
    const quiet = daysSince(p.lastActivityAt, now)
    if (quiet === null || quiet >= 60) {
      issues.push({
        id: `quiet-${p.id}`, area: 'Customer retention', severity: quiet === null || quiet >= 120 ? 'high' : 'medium',
        title: `${p.fullName} has gone quiet`,
        detail: quiet === null ? 'No activity has ever been logged with this customer.' : `No activity logged for ${quiet} days.`,
        exposure: 0, currency: 'USD',
        evidence: [quiet === null ? 'No logged activity' : `Last activity ${quiet} days ago`, p.companyName ? `At ${p.companyName}` : 'No company linked'],
        why: ['Customers who hear nothing are easier to lose to a competitor.', 'There is no recorded touchpoint to anchor renewal.'],
        fix: { label: 'Schedule a check-in', task: `Check in with ${p.fullName}`, companyId: p.companyId, opportunityId: null, personId: p.id },
      })
    }
  }

  for (const t of snap.tasks) {
    if (t.status === 'done' || !t.dueAt) continue
    const late = daysSince(t.dueAt, now) ?? 0
    if (late >= 3) {
      issues.push({
        id: `late-${t.id}`, area: 'Follow-through', severity: t.kind === 'commitment' ? 'high' : 'low',
        title: t.kind === 'commitment' ? `A promise is ${late} days late` : `${t.title} is ${late} days overdue`,
        detail: t.kind === 'commitment' ? `“${t.title}”${t.owedTo ? ` — owed to ${t.owedTo}` : ''}.` : `Linked to ${companyLabel(t.companyId)}.`,
        exposure: 0, currency: 'USD',
        evidence: [`Due ${t.dueAt.slice(0, 10)}`, `Priority ${t.priority}`],
        why: ['Late follow-through erodes trust faster than silence.', 'Nobody has rescheduled or closed it.'],
        fix: { label: 'Reschedule', task: `Close or reschedule: ${t.title}`, companyId: t.companyId, opportunityId: t.opportunityId, personId: t.personId },
      })
    }
  }

  const rank = { high: 0, medium: 1, low: 2 }
  issues.sort((a, b) => rank[a.severity] - rank[b.severity] || b.exposure - a.exposure)
  const exposureByCurrency: Record<string, number> = {}
  for (const i of issues) if (i.exposure > 0) exposureByCurrency[i.currency] = (exposureByCurrency[i.currency] ?? 0) + i.exposure

  return {
    companyName, issues, exposureByCurrency,
    recordCounts: { companies: companies.length, people: people.length, opportunities: opps.length, tasks: snap.tasks.length },
  }
}

export function explainReport(r: DiagnosticReport): string {
  if (!r.issues.length) {
    return r.recordCounts.opportunities + r.recordCounts.people === 0
      ? 'Your diagnostic is empty because there are no records in your CRM yet. Add your companies, people and open deals, and I will show where attention is needed.'
      : `I checked ${r.recordCounts.opportunities} deals, ${r.recordCounts.people} people and ${r.recordCounts.tasks} tasks. Nothing is stalled, quiet or overdue right now.`
  }
  const top = r.issues.slice(0, 3)
  const money = Object.entries(r.exposureByCurrency).map(([c, v]) => `${v.toLocaleString()} ${c}`).join(' and ')
  return [
    `I found ${r.issues.length} thing${r.issues.length === 1 ? '' : 's'} worth your attention.`,
    money ? `Open deal value sitting in stalled deals is ${money}. That is exposure, not a confirmed loss.` : '',
    `Top priorities: ${top.map((i, n) => `${n + 1}, ${i.title}`).join('. ')}.`,
    `Start here: ${top[0]!.fix.task}.`,
  ].filter(Boolean).join(' ')
}
