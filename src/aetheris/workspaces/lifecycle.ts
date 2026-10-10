/**
 * Deal workspace rules, mirrored from drizzle/migrations/0057_deal_workspaces.sql. The database
 * is the authority; these helpers only decide what the UI offers and validate input before a
 * write is attempted, so a member gets a clear message instead of a rejected call.
 */

export const WORKSPACE_STATUSES = ['qualified', 'proposal', 'agreed', 'in_progress', 'delivered', 'accepted', 'closed', 'cancelled'] as const
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number]
export type WorkspaceRole = 'owner' | 'counterparty'
export type WorkspaceSource = 'dm_thread' | 'intro_request'
export type WorkspaceAction =
  | 'edit_draft' | 'submit_proposal' | 'move_stage' | 'manage_roster' | 'step' | 'next_action'
  | 'approve_proposal' | 'decline_proposal' | 'accept_delivery' | 'leave'

/** Role matrix, mirrored from deal_workspace_role_may(). Nobody approves their own proposal or accepts their own delivery. */
const MAY: Record<WorkspaceRole, readonly WorkspaceAction[]> = {
  owner: ['edit_draft', 'submit_proposal', 'move_stage', 'manage_roster', 'step', 'next_action'],
  counterparty: ['approve_proposal', 'decline_proposal', 'accept_delivery', 'step', 'next_action', 'leave'],
}
export const roleMay = (role: WorkspaceRole | null, action: WorkspaceAction) => !!role && MAY[role].includes(action)

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

/** Stages reached only through a proposal, its approval or the recipient's acceptance, never by a plain move. */
export const GUARDED_STAGES: readonly WorkspaceStatus[] = ['proposal', 'agreed', 'accepted']

export type StageAction =
  | { kind: 'move'; to: WorkspaceStatus }
  | { kind: 'accept_delivery' }

/**
 * Plain stage moves and the delivery acceptance the signed-in participant may make. The owner
 * moves work forward; only the counterparty accepts delivery. Proposals and their approval are
 * separate actions (see canSubmitProposal and canDecideProposal).
 */
export function stageActions(status: WorkspaceStatus, role: WorkspaceRole | null): StageAction[] {
  if (!role) return []
  const out: StageAction[] = []
  if (status === 'delivered' && roleMay(role, 'accept_delivery')) out.push({ kind: 'accept_delivery' })
  if (roleMay(role, 'move_stage')) for (const to of NEXT[status]) if (!GUARDED_STAGES.includes(to)) out.push({ kind: 'move', to })
  return out
}

/** The owner proposes terms before work starts, and may propose a versioned change until delivery is accepted. */
export const canSubmitProposal = (status: WorkspaceStatus, role: WorkspaceRole | null) =>
  roleMay(role, 'submit_proposal') && !['accepted', 'closed', 'cancelled'].includes(status)
/** Terms are edited in place only while the workspace is still a draft. */
export const canEditDraft = (status: WorkspaceStatus, role: WorkspaceRole | null) => roleMay(role, 'edit_draft') && status === 'qualified'
export const canDecideProposal = (role: WorkspaceRole | null, hasOpenProposal: boolean) => hasOpenProposal && roleMay(role, 'approve_proposal')

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
    case 'agreed': return 'The counterparty approved the proposal here. This is not a signed contract.'
    case 'accepted': return 'The recipient recorded acceptance of the delivery here. No payment is recorded.'
    case 'closed': return 'Closed. Payment is not tracked in this workspace.'
    case 'cancelled': return 'Cancelled by the owner.'
    default: return ''
  }
}
