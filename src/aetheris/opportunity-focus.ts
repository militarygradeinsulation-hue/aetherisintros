import type { ProfessionalOpportunity } from './domain/pro-models'

export const opportunityFocuses = ['Active', 'Saved', 'Closing soon', 'Past / closed'] as const
export type OpportunityFocus = typeof opportunityFocuses[number]
type OpportunityWindow = Pick<ProfessionalOpportunity, 'status' | 'expiresOn' | 'saved'>

/** Date-only deadlines remain open through their UTC calendar day. Invalid dates fail closed. */
export function opportunityDaysLeft(opportunity: OpportunityWindow, now = Date.now()): number | null {
  const date = opportunity.expiresOn
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const deadline = Date.parse(`${date}T00:00:00Z`)
  if (!Number.isFinite(deadline) || new Date(deadline).toISOString().slice(0, 10) !== date) return null
  return Math.round((deadline - Date.parse(new Date(now).toISOString().slice(0, 10))) / 86400000)
}

export function matchesOpportunityFocus(opportunity: OpportunityWindow, focus: OpportunityFocus, now = Date.now()): boolean {
  const days = opportunityDaysLeft(opportunity, now)
  const active = opportunity.status !== 'closed' && opportunity.status !== 'expired' && days !== null && days >= 0
  if (focus === 'Saved') return opportunity.saved
  if (focus === 'Closing soon') return active && days! <= 7
  return focus === 'Active' ? active : !active
}
