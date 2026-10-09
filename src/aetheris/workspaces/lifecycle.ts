/**
 * Deal workspace rules, mirrored from drizzle/migrations/0057_deal_workspaces.sql. The database
 * is the authority; these helpers only decide what the UI offers and validate input before a
 * write is attempted, so a member gets a clear message instead of a rejected call.
 */

export const WORKSPACE_STATUSES = ['qualified', 'proposal', 'agreed', 'in_progress', 'delivered', 'accepted', 'closed', 'cancelled'] as const
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number]
export type WorkspaceRole = 'owner' | 'collaborator'
export type WorkspaceSource = 'dm_thread' | 'intro_request'
/** Milestones every participant has to confirm for themselves. */
export type Milestone = 'agreed' | 'accepted'

export const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  qualified: 'Qualified', proposal: 'Proposal', agreed: 'Agreed', in_progress: 'In progress',
  delivered: 'Delivered', accepted: 'Accepted', closed: 'Closed', cancelled: 'Cancelled',
}

const NEXT: Record<WorkspaceStatus, readonly WorkspaceStatus[]> = {
  qualified: ['proposal', 'cancelled'],
  proposal: ['agreed', 'qualified', 'cancelled'],
  agreed: ['in_progress', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: ['accepted', 'in_progress', 'cancelled'],
  accepted: ['closed'],
  closed: [],
  cancelled: [],
}

export const isWorkspaceStatus = (v: unknown): v is WorkspaceStatus => typeof v === 'string' && (WORKSPACE_STATUSES as readonly string[]).includes(v)
export const canTransition = (from: WorkspaceStatus, to: WorkspaceStatus) => NEXT[from].includes(to)
export const isFinished = (s: WorkspaceStatus) => s === 'closed' || s === 'cancelled'

/** The milestone a status move needs every participant to confirm, if any. */
export const milestoneFor = (to: WorkspaceStatus): Milestone | null => (to === 'agreed' || to === 'accepted' ? to : null)

export type StageAction =
  | { kind: 'move'; to: WorkspaceStatus }
  | { kind: 'confirm'; milestone: Milestone }

/**
 * What the signed-in participant may do from the current stage. Owners move the stage;
 * "agreed" and "accepted" are confirmations any active participant gives for themselves
 * (and have already given, when listed in `confirmed`).
 */
export function stageActions(status: WorkspaceStatus, role: WorkspaceRole | null, confirmed: readonly Milestone[] = [], hasScope = true): StageAction[] {
  if (!role) return []
  const out: StageAction[] = []
  if (status === 'proposal' && !confirmed.includes('agreed')) out.push({ kind: 'confirm', milestone: 'agreed' })
  if (status === 'delivered' && !confirmed.includes('accepted')) out.push({ kind: 'confirm', milestone: 'accepted' })
  if (role === 'owner') for (const to of NEXT[status]) if (!milestoneFor(to) && !(status === 'qualified' && to === 'proposal' && !hasScope)) out.push({ kind: 'move', to })
  return out
}

export const CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'chf', 'jpy'] as const

export interface WorkspaceInput { title: string; scope: string; nextAction: string; budget: string; currency: string; dueOn: string }
export interface ValidInput { title: string; scope: string; nextAction: string; budgetCents: number | null; currency: string | null; dueOn: string | null }

/** Major units ("12,500.50") to cents. Null when blank, NaN-free: invalid input returns undefined. */
export function parseBudget(raw: string): number | null | undefined {
  const t = raw.trim().replace(/,/g, '')
  if (!t) return null
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(t)) return undefined
  const cents = Math.round(Number(t) * 100)
  return cents <= 100_000_000_000 ? cents : undefined
}

export function validateWorkspaceInput(i: WorkspaceInput): { ok: true; value: ValidInput } | { ok: false; errors: Partial<Record<keyof WorkspaceInput, string>> } {
  const errors: Partial<Record<keyof WorkspaceInput, string>> = {}
  const title = i.title.trim()
  if (title.length < 3 || title.length > 160) errors.title = 'Give the workspace a title of 3 to 160 characters.'
  if (i.scope.trim().length > 4000) errors.scope = 'Keep the scope under 4,000 characters.'
  if (i.nextAction.trim().length > 500) errors.nextAction = 'Keep the next action under 500 characters.'
  const budget = parseBudget(i.budget)
  if (budget === undefined) errors.budget = 'Enter an amount like 12500 or 12500.50.'
  const currency = i.currency.trim().toLowerCase()
  if (budget != null && !/^[a-z]{3}$/.test(currency)) errors.currency = 'Choose a currency for the budget.'
  const dueOn = i.dueOn.trim()
  if (dueOn && (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`)) || new Date(`${dueOn}T00:00:00Z`).toISOString().slice(0, 10) !== dueOn)) errors.dueOn = 'Use a real date.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { title, scope: i.scope.trim(), nextAction: i.nextAction.trim(), budgetCents: budget ?? null, currency: budget == null ? null : currency, dueOn: dueOn || null } }
}

export function formatBudget(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents == null || !currency) return 'No budget set'
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100) } catch { return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}` }
}

/** Honest wording for what a stage does and does not mean. Nothing here records money moving. */
export function stageNote(s: WorkspaceStatus): string {
  switch (s) {
    case 'agreed': return 'Every participant confirmed the terms here. This is not a signed contract.'
    case 'accepted': return 'Every participant confirmed the delivery here. No payment is recorded.'
    case 'closed': return 'Closed. Payment is not tracked in this workspace.'
    case 'cancelled': return 'Cancelled by the owner.'
    default: return ''
  }
}
