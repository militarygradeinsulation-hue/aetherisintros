/**
 * Deal rooms: the rules, without React or a database. Mirrors 0058_deal_rooms.sql so the
 * room only offers actions the database will accept, and so the /demo showcase room can be
 * clicked through locally with the same rules.
 */

export const DEAL_STAGES = ['interested', 'proposal', 'agreed', 'in_progress', 'delivered', 'closed', 'cancelled', 'disputed'] as const
export type DealStage = typeof DEAL_STAGES[number]
export type DealOutcome = 'won' | 'lost' | 'withdrawn'
export type DealRole = 'owner' | 'buyer' | 'provider' | 'introducer' | 'guest'
export type DealSide = 'buyer' | 'provider'
export type DealSourceKind = 'intro' | 'ask' | 'thread' | 'opportunity' | 'manual'
export type ProposalStatus = 'submitted' | 'accepted' | 'declined' | 'superseded'
export type MilestoneStatus = 'open' | 'submitted' | 'accepted' | 'changes_requested'

/** The happy path, in order: what the stepper shows. */
export const STEPPER: DealStage[] = ['interested', 'proposal', 'agreed', 'in_progress', 'delivered', 'closed']

export const stageLabel: Record<DealStage, string> = {
  interested: 'Interested', proposal: 'Proposal', agreed: 'Agreed', in_progress: 'In progress',
  delivered: 'Delivered', closed: 'Closed', cancelled: 'Cancelled', disputed: 'Disputed',
}
export const roleLabel: Record<DealRole, string> = { owner: 'Owner', buyer: 'Buyer', provider: 'Provider', introducer: 'Introducer', guest: 'Guest' }
export const sourceLabel: Record<DealSourceKind, string> = {
  intro: 'Introduction', ask: 'Reply to an ask', thread: 'Conversation', opportunity: 'CRM opportunity', manual: 'Started from scratch',
}
export const outcomeLabel: Record<DealOutcome, string> = { won: 'Won', lost: 'Lost', withdrawn: 'Withdrawn' }

/** Every allowed move. 'agreed' is only reached by accepting a proposal. */
export const TRANSITIONS: Record<DealStage, DealStage[]> = {
  interested: ['proposal', 'cancelled'],
  proposal: ['agreed', 'cancelled'],
  agreed: ['in_progress', 'cancelled'],
  in_progress: ['delivered', 'disputed', 'cancelled'],
  delivered: ['closed', 'disputed', 'cancelled'],
  disputed: ['in_progress', 'closed', 'cancelled'],
  closed: [],
  cancelled: [],
}

export const canTransition = (from: DealStage, to: DealStage) => TRANSITIONS[from].includes(to)
export const isOpen = (stage: DealStage) => stage !== 'closed' && stage !== 'cancelled'

/** Which side of the deal a member is on. Owners are on the side they chose. */
export function sideOf(role: DealRole | null | undefined, ownerSide: DealSide): DealSide | null {
  if (role === 'owner') return ownerSide
  if (role === 'buyer' || role === 'provider') return role
  return null
}

/** The role the counterpart gets when the owner is on `side`. */
export const opposite = (side: DealSide): DealSide => (side === 'buyer' ? 'provider' : 'buyer')

export interface StageContext {
  stage: DealStage
  role: DealRole | null
  ownerSide: DealSide
  /** Sides with an accepted member in the room. */
  sidesPresent: DealSide[]
}

export interface StageAction { to: DealStage; label: string; outcome?: 'won' | 'lost'; tone: 'primary' | 'secondary' | 'quiet' }

/**
 * Who may make a move, or why not (same rules as advance_deal_stage). Returns null when
 * allowed, otherwise the reason in plain words.
 */
export function stageBlock(ctx: StageContext, to: DealStage): string | null {
  if (!ctx.role || ctx.role === 'guest') return 'Only the people doing this deal can move it.'
  if (to === 'agreed') return 'Terms are agreed by accepting a proposal.'
  if (!canTransition(ctx.stage, to)) return `A deal cannot move from ${stageLabel[ctx.stage]} to ${stageLabel[to]}.`
  const side = sideOf(ctx.role, ctx.ownerSide)
  if (to === 'delivered' && side !== 'provider' && ctx.sidesPresent.includes('provider')) return 'The provider marks the work delivered.'
  if (to === 'closed' && ctx.stage === 'delivered' && side !== 'buyer' && ctx.sidesPresent.includes('buyer')) return 'The buyer confirms delivery and closes the deal.'
  return null
}

const ACTION_LABEL: Partial<Record<DealStage, string>> = {
  proposal: 'Move to proposal', in_progress: 'Start the work', delivered: 'Mark delivered', disputed: 'Raise a dispute', cancelled: 'Cancel the deal',
}

/** The stage moves this member can make right now, most useful first. */
export function nextActions(ctx: StageContext): StageAction[] {
  const out: StageAction[] = []
  for (const to of TRANSITIONS[ctx.stage]) {
    if (to === 'agreed' || stageBlock(ctx, to)) continue
    if (to === 'closed') {
      out.push({ to, label: 'Close — won', outcome: 'won', tone: 'primary' })
      out.push({ to, label: 'Close — lost', outcome: 'lost', tone: 'secondary' })
      continue
    }
    if (to === 'in_progress' && ctx.stage === 'disputed') { out.push({ to, label: 'Resolve and resume', tone: 'secondary' }); continue }
    out.push({ to, label: ACTION_LABEL[to] ?? stageLabel[to], tone: to === 'cancelled' || to === 'disputed' ? 'quiet' : 'primary' })
  }
  return out
}

/** Where the stepper is: done, current, or ahead. Side stages (cancelled/disputed) mark the last reached step. */
export function stepperState(stage: DealStage, reached: DealStage[] = []): Array<{ stage: DealStage; state: 'done' | 'current' | 'ahead' }> {
  const at = STEPPER.indexOf(stage)
  const furthest = at >= 0 ? at : Math.max(-1, ...reached.map(s => STEPPER.indexOf(s)))
  return STEPPER.map((s, i) => ({ stage: s, state: at >= 0 ? (i < at ? 'done' : i === at ? 'current' : 'ahead') : i <= furthest ? 'done' : 'ahead' }))
}

export interface ProposalRef { id: string; author: string | null; status: ProposalStatus; version: number }

/** Why this member cannot decide on this proposal, or null when they can (same as decide_proposal). */
export function proposalBlock(p: ProposalRef, me: string, stage: DealStage, mySide: DealSide | null, authorSide: DealSide | null, accept: boolean): string | null {
  if (p.status !== 'submitted') return 'This proposal was already decided or replaced.'
  if (p.author === me) return 'You cannot accept or decline your own proposal.'
  if (!mySide) return 'Only the buyer or provider side decides on a proposal.'
  if (authorSide && authorSide === mySide) return 'The other side decides on this proposal.'
  if (accept && stage !== 'proposal') return 'Terms can only be agreed while proposals are open.'
  return null
}

export const canPropose = (stage: DealStage, mySide: DealSide | null) => !!mySide && (stage === 'interested' || stage === 'proposal')

export interface MilestoneRef { status: MilestoneStatus; submittedBy: string | null }

export function milestoneSubmitBlock(m: MilestoneRef, stage: DealStage, mySide: DealSide | null, role: DealRole | null, sidesPresent: DealSide[]): string | null {
  if (!role || role === 'guest' || !isOpen(stage)) return 'Only the people doing this deal can submit work.'
  if (mySide !== 'provider' && sidesPresent.includes('provider')) return 'The provider submits milestones.'
  if (m.status !== 'open' && m.status !== 'changes_requested') return 'Already submitted.'
  if (stage !== 'agreed' && stage !== 'in_progress') return 'Milestones are submitted once terms are agreed and before delivery.'
  return null
}

export function milestoneReviewBlock(m: MilestoneRef, me: string, stage: DealStage, mySide: DealSide | null, role: DealRole | null, sidesPresent: DealSide[]): string | null {
  if (!role || role === 'guest' || !isOpen(stage)) return 'Only the people doing this deal can review work.'
  if (m.status !== 'submitted') return 'Only a submitted milestone can be reviewed.'
  if (m.submittedBy === me) return 'Someone else reviews what you submitted.'
  if (mySide !== 'buyer' && sidesPresent.includes('buyer')) return 'The buyer accepts milestones.'
  return null
}

export const milestoneLabel: Record<MilestoneStatus, string> = { open: 'Open', submitted: 'Submitted for review', accepted: 'Accepted', changes_requested: 'Changes requested' }
export const proposalLabel: Record<ProposalStatus, string> = { submitted: 'Awaiting decision', accepted: 'Accepted', declined: 'Declined', superseded: 'Replaced by a newer version' }

/** Rooms grouped for the list: open stages in pipeline order, then finished ones. */
export function groupByStage<T extends { stage: DealStage }>(rooms: T[]): Array<{ stage: DealStage; rooms: T[] }> {
  const order: DealStage[] = ['interested', 'proposal', 'agreed', 'in_progress', 'delivered', 'disputed', 'closed', 'cancelled']
  return order.map(stage => ({ stage, rooms: rooms.filter(r => r.stage === stage) })).filter(g => g.rooms.length > 0)
}

export function formatMoney(n: number | null | undefined, currency = 'USD'): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return ''
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n) } catch { return `${currency} ${Math.round(n).toLocaleString('en-US')}` }
}

export function formatBudget(low: number | null, high: number | null, currency = 'USD'): string {
  if (low === null && high === null) return 'No budget set'
  if (low !== null && high !== null) return low === high ? formatMoney(low, currency) : `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`
  return low !== null ? `From ${formatMoney(low, currency)}` : `Up to ${formatMoney(high, currency)}`
}

/** A typed amount, or null for empty. Throws away anything that is not a non-negative number. */
export function parseAmount(raw: string): number | null | 'invalid' {
  const t = raw.replace(/[,$\s]/g, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 && n <= 1e12 ? n : 'invalid'
}

export interface DetailsInput { title: string; scope: string; deliverables: string; budgetLow: string; budgetHigh: string; currency: string; targetDate: string }

/** Validates the editable terms (same limits as the database); returns the row patch or an error. */
export function validateDetails(d: DetailsInput): { patch?: Record<string, unknown>; error?: string } {
  const title = d.title.trim()
  if (title.length < 2 || title.length > 160) return { error: 'Give the room a title (2 to 160 characters).' }
  if (d.scope.length > 4000 || d.deliverables.length > 4000) return { error: 'Keep scope and deliverables under 4,000 characters each.' }
  const low = parseAmount(d.budgetLow)
  const high = parseAmount(d.budgetHigh)
  if (low === 'invalid' || high === 'invalid') return { error: 'Budget amounts must be numbers.' }
  if (low !== null && high !== null && high < low) return { error: 'The top of the budget must be at least the bottom.' }
  const currency = d.currency.trim().toUpperCase() || 'USD'
  if (!/^[A-Z]{3}$/.test(currency)) return { error: 'Use a three-letter currency code, like USD.' }
  if (d.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(d.targetDate)) return { error: 'Pick a target date.' }
  return { patch: { title, scope: d.scope, deliverables: d.deliverables, budget_low: low, budget_high: high, currency, target_date: d.targetDate || null } }
}

/** Only a real web link; returns the cleaned URL or null. */
export function cleanLink(raw: string): string | null {
  const u = raw.trim()
  return /^https?:\/\/\S+$/i.test(u) && u.length <= 500 ? u : null
}

/* ── Opening a room from somewhere else ─────────────────────────────────────────────── */

/** What an entry point hands the create form. Nothing is created until the member confirms. */
export interface DealDraft {
  sourceKind: DealSourceKind
  sourceId: string | null
  title: string
  need: string
  /** Real member (auth user) id of the other person, when the source has one. */
  counterpartId: string | null
  counterpartName?: string
  side?: DealSide
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (id: string | null | undefined): id is string => !!id && UUID.test(id)

/** A draft the database can accept: source ids must be real rows, counterparts real members. */
export function cleanDraft(d: DealDraft): DealDraft {
  const sourceOk = d.sourceKind !== 'manual' && isUuid(d.sourceId)
  return {
    ...d,
    sourceKind: sourceOk ? d.sourceKind : 'manual',
    sourceId: sourceOk ? d.sourceId : null,
    title: d.title.trim().slice(0, 160),
    need: d.need.trim().slice(0, 4000),
    counterpartId: isUuid(d.counterpartId) ? d.counterpartId : null,
  }
}

export const draftTitle = (kind: DealSourceKind, name?: string) => {
  const who = name?.trim()
  if (!who) return ''
  return kind === 'ask' ? `Working with ${who} on your ask` : `Deal with ${who}`
}

const DRAFT_KEY = 'aetheris:deal-draft'
const OPEN_KEY = 'aetheris:deal-open'

export function queueDealDraft(d: DealDraft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* storage blocked: the form opens empty */ }
}
export function takeDealDraft(): DealDraft | null {
  try { const raw = sessionStorage.getItem(DRAFT_KEY); sessionStorage.removeItem(DRAFT_KEY); return raw ? (JSON.parse(raw) as DealDraft) : null } catch { return null }
}
export function queueDealRoom(id: string) {
  try { sessionStorage.setItem(OPEN_KEY, id) } catch { /* the list still shows it */ }
}
export function takeDealRoom(): string | null {
  try { const id = sessionStorage.getItem(OPEN_KEY); sessionStorage.removeItem(OPEN_KEY); return id } catch { return null }
}

/* ── Timeline wording ───────────────────────────────────────────────────────────────── */

export interface DealEventLike { kind: string; detail: Record<string, unknown> }

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

/** One plain sentence per event; `who` is the actor's name (or "You"). */
export function describeEvent(e: DealEventLike, who: string, nameOf: (id: string) => string = () => 'a member'): string {
  const d = e.detail ?? {}
  switch (e.kind) {
    case 'created': return `${who} opened the room${d['source_kind'] && d['source_kind'] !== 'manual' ? ` from ${sourceLabel[d['source_kind'] as DealSourceKind]?.toLowerCase() ?? 'a source'}` : ''}.`
    case 'stage_changed': {
      const to = stageLabel[d['to'] as DealStage] ?? str(d['to'])
      const outcome = d['outcome'] ? ` (${outcomeLabel[d['outcome'] as DealOutcome] ?? str(d['outcome'])})` : ''
      return `${who} moved the deal to ${to}${outcome}.${d['note'] ? ` “${str(d['note'])}”` : ''}`
    }
    case 'proposal_submitted': return `${who} sent proposal v${str(d['version'])}${typeof d['amount'] === 'number' ? ` for ${formatMoney(d['amount'] as number)}` : ''}.`
    case 'proposal_accepted': return `${who} accepted proposal v${str(d['version'])}.`
    case 'proposal_declined': return `${who} declined proposal v${str(d['version'])}.`
    case 'milestone_added': return `${who} added the milestone “${str(d['title'])}”.`
    case 'milestone_submitted': return `${who} submitted “${str(d['title'])}” for review.${d['note'] ? ` “${str(d['note'])}”` : ''}`
    case 'milestone_accepted': return `${who} accepted “${str(d['title'])}”.`
    case 'milestone_changes_requested': return `${who} asked for changes on “${str(d['title'])}”.${d['note'] ? ` “${str(d['note'])}”` : ''}`
    case 'member_invited': return `${who} invited ${nameOf(str(d['user_id']))} as ${roleLabel[d['role'] as DealRole]?.toLowerCase() ?? 'a member'}.`
    case 'member_joined': return `${who} joined the room.`
    case 'member_declined': return `${who} declined the invitation.`
    case 'member_removed': return `${who} removed ${nameOf(str(d['user_id']))}.`
    case 'details_updated': return `${who} updated ${(Array.isArray(d['fields']) ? (d['fields'] as string[]) : []).map(f => f.replace('_', ' ')).join(', ') || 'the terms'}.`
    case 'note': return `${who}: ${str(d['text'])}`
    case 'link': return `${who} shared a link${d['label'] ? `: ${str(d['label'])}` : ''}.`
    case 'intro_outcome_recorded': return `${who}’s outcome was recorded on the introduction (private to them).`
    default: return `${who} updated the room.`
  }
}
