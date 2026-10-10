/**
 * An in-memory deal-room store that follows the same rules as the database functions in
 * 0058_deal_rooms.sql. It powers the /demo showcase room (nothing leaves the browser) and
 * the browser check's stand-in database. Live rooms never use it.
 */
import {
  canTransition, isOpen, opposite, sideOf,
  type DealOutcome, type DealRole, type DealSide, type DealSourceKind, type DealStage, type MilestoneStatus, type ProposalStatus,
} from './deals-core'

export interface DealRoomRow {
  id: string; created_by: string | null; title: string; stage: DealStage; outcome: DealOutcome | null; owner_side: DealSide
  source_kind: DealSourceKind; source_id: string | null; need: string; scope: string; deliverables: string
  budget_low: number | null; budget_high: number | null; currency: string; target_date: string | null; created_at: string; updated_at: string
}
export interface DealMemberRow { room_id: string; user_id: string; role: DealRole; invited_by: string | null; accepted_at: string | null; created_at: string }
export interface DealProposalRow {
  id: string; room_id: string; version: number; author: string | null; summary: string; amount: number | null
  status: ProposalStatus; created_at: string; decided_by: string | null; decided_at: string | null
}
export interface DealMilestoneRow {
  id: string; room_id: string; title: string; due_date: string | null; status: MilestoneStatus
  submitted_at: string | null; submitted_by: string | null; accepted_at: string | null; sort: number; created_at: string
}
export interface DealEventRow { id: string; room_id: string; actor: string | null; kind: string; detail: Record<string, unknown>; created_at: string }

export interface DealState {
  rooms: DealRoomRow[]
  members: DealMemberRow[]
  proposals: DealProposalRow[]
  milestones: DealMilestoneRow[]
  events: DealEventRow[]
  /** Real members who may be invited (id → name). */
  people: Record<string, string>
}

export const emptyDealState = (): DealState => ({ rooms: [], members: [], proposals: [], milestones: [], events: [], people: {} })

let seq = 0
/** A fresh uuid-shaped id (unique within the page even when created in the same millisecond). */
const newId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  seq += 1
  return `00000000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`
}

class DealError extends Error {}
const fail = (msg: string): never => { throw new DealError(msg) }

/** Same access rules as the database. */
export function createDealEngine(state: DealState, clock: () => string = () => new Date().toISOString()) {
  const member = (room: string, user: string) => state.members.find(m => m.room_id === room && m.user_id === user)
  const accepted = (room: string, user: string) => { const m = member(room, user); return m?.accepted_at ? m : undefined }
  const roomOf = (id: string) => state.rooms.find(r => r.id === id) ?? fail('Room not found')
  const isMember = (room: string, user: string) => !!accepted(room, user) || roomOf(room).created_by === user
  const sideFor = (room: string, user: string | null) => (user ? sideOf(accepted(room, user)?.role, roomOf(room).owner_side) : null)
  const sidePresent = (room: string, side: DealSide) => state.members.some(m => m.room_id === room && m.accepted_at && sideFor(room, m.user_id) === side)
  const canEdit = (room: string, user: string) => { const m = accepted(room, user); return !!m && m.role !== 'guest' && isOpen(roomOf(room).stage) }
  const log = (room: string, actor: string, kind: string, detail: Record<string, unknown> = {}) => {
    const at = clock()
    state.events.push({ id: newId(), room_id: room, actor, kind, detail, created_at: at })
    roomOf(room).updated_at = at
  }

  return {
    /** Rooms this user can see: accepted member, creator, or invitee. */
    visibleRooms(user: string) {
      return state.rooms.filter(r => r.created_by === user || state.members.some(m => m.room_id === r.id && m.user_id === user))
    },
    canRead(room: string, user: string) { return isMember(room, user) },

    create(user: string, a: { sourceKind: DealSourceKind; sourceId: string | null; title: string; need: string; side: DealSide; counterpart: string | null }) {
      const title = a.title.trim()
      if (title.length < 2 || title.length > 160) fail('Give the room a title (2 to 160 characters)')
      if (a.sourceKind === 'manual' && a.sourceId) fail('A room started from scratch has no source')
      if (a.sourceKind !== 'manual') {
        const existing = state.rooms.find(r => r.source_kind === a.sourceKind && r.source_id === a.sourceId && isOpen(r.stage) && member(r.id, user))
        if (existing) return existing.id
      }
      if (a.counterpart === user) fail('You are already in the room')
      if (a.counterpart && !state.people[a.counterpart]) fail('That member was not found')
      const at = clock()
      const id = newId()
      state.rooms.push({
        id, created_by: user, title, stage: 'interested', outcome: null, owner_side: a.side, source_kind: a.sourceKind,
        source_id: a.sourceKind === 'manual' ? null : a.sourceId, need: a.need.trim().slice(0, 4000), scope: '', deliverables: '',
        budget_low: null, budget_high: null, currency: 'USD', target_date: null, created_at: at, updated_at: at,
      })
      state.members.push({ room_id: id, user_id: user, role: 'owner', invited_by: user, accepted_at: at, created_at: at })
      log(id, user, 'created', { source_kind: a.sourceKind, source_id: a.sourceId, side: a.side })
      if (a.counterpart) {
        const role = opposite(a.side)
        state.members.push({ room_id: id, user_id: a.counterpart, role, invited_by: user, accepted_at: null, created_at: at })
        log(id, user, 'member_invited', { user_id: a.counterpart, role })
      }
      return id
    },

    invite(user: string, room: string, who: string, role: DealRole) {
      if (accepted(room, user)?.role !== 'owner') fail('Only the room owner can invite people')
      if (!['buyer', 'provider', 'introducer', 'guest'].includes(role)) fail('Choose a role')
      if (!isOpen(roomOf(room).stage)) fail('This room is finished')
      if (!state.people[who]) fail('That member was not found')
      if (member(room, who)) fail('They are already in this room or invited')
      state.members.push({ room_id: room, user_id: who, role, invited_by: user, accepted_at: null, created_at: clock() })
      log(room, user, 'member_invited', { user_id: who, role })
    },

    respond(user: string, room: string, accept: boolean) {
      const m = member(room, user)
      if (!m || m.accepted_at) fail('There is no invitation to answer')
      if (accept) { m!.accepted_at = clock(); log(room, user, 'member_joined', { role: m!.role }) }
      else { state.members = state.members.filter(x => x !== m); log(room, user, 'member_declined') }
    },

    remove(user: string, room: string, who: string) {
      if (accepted(room, user)?.role !== 'owner') fail('Only the room owner can remove people')
      if (who === user) fail('The owner stays in the room')
      const m = member(room, who) ?? fail('They are not in this room')
      state.members = state.members.filter(x => x !== m)
      log(room, user, 'member_removed', { user_id: who })
    },

    advance(user: string, room: string, to: DealStage, note = '', outcome: 'won' | 'lost' | null = null) {
      const m = accepted(room, user)
      if (!m || m.role === 'guest') fail('Only the people doing this deal can move it')
      const r = roomOf(room)
      if (to === 'agreed') fail('Terms are agreed by accepting a proposal')
      if (!canTransition(r.stage, to)) fail(`A deal cannot move from ${r.stage} to ${to}`)
      const side = sideFor(room, user)
      if (to === 'delivered' && side !== 'provider' && sidePresent(room, 'provider')) fail('The provider marks the work delivered')
      if (to === 'closed' && r.stage === 'delivered' && side !== 'buyer' && sidePresent(room, 'buyer')) fail('The buyer confirms delivery and closes the deal')
      let o: DealOutcome | null = null
      if (to === 'closed') { if (outcome !== 'won' && outcome !== 'lost') fail('Say whether the deal was won or lost'); o = outcome }
      else if (to === 'cancelled') o = 'withdrawn'
      const from = r.stage
      r.stage = to; r.outcome = o
      log(room, user, 'stage_changed', { from, to, ...(note.trim() ? { note: note.trim() } : {}), ...(o ? { outcome: o } : {}) })
      return to
    },

    propose(user: string, room: string, summary: string, amount: number | null) {
      const side = sideFor(room, user)
      if (!side) fail('Only the buyer or provider side can propose terms')
      if (summary.trim().length < 3 || summary.length > 4000) fail('Describe the proposal (3 to 4,000 characters)')
      if (amount !== null && (amount < 0 || amount > 1e12)) fail('That amount is not valid')
      const r = roomOf(room)
      if (r.stage !== 'interested' && r.stage !== 'proposal') fail('Proposals are made before terms are agreed')
      const version = Math.max(0, ...state.proposals.filter(p => p.room_id === room).map(p => p.version)) + 1
      for (const p of state.proposals) if (p.room_id === room && p.status === 'submitted') p.status = 'superseded'
      const id = newId()
      state.proposals.push({ id, room_id: room, version, author: user, summary: summary.trim(), amount, status: 'submitted', created_at: clock(), decided_by: null, decided_at: null })
      if (r.stage === 'interested') { r.stage = 'proposal'; log(room, user, 'stage_changed', { from: 'interested', to: 'proposal' }) }
      log(room, user, 'proposal_submitted', { proposal_id: id, version, ...(amount !== null ? { amount } : {}) })
      return id
    },

    decide(user: string, proposal: string, accept: boolean) {
      const p = state.proposals.find(x => x.id === proposal)
      if (!p || !isMember(p.room_id, user)) fail('Proposal not found')
      const r = roomOf(p!.room_id)
      if (p!.status !== 'submitted') fail('This proposal was already decided or replaced')
      if (p!.author === user) fail('You cannot accept or decline your own proposal')
      const side = sideFor(r.id, user)
      if (!side) fail('Only the buyer or provider side decides on a proposal')
      if (sideFor(r.id, p!.author) === side) fail('The other side decides on this proposal')
      const at = clock()
      if (accept) {
        if (r.stage !== 'proposal') fail('Terms can only be agreed while proposals are open')
        p!.status = 'accepted'; p!.decided_by = user; p!.decided_at = at
        for (const q of state.proposals) if (q.room_id === r.id && q.id !== p!.id && q.status === 'submitted') q.status = 'superseded'
        const from = r.stage
        r.stage = 'agreed'
        log(r.id, user, 'proposal_accepted', { proposal_id: p!.id, version: p!.version })
        log(r.id, user, 'stage_changed', { from, to: 'agreed' })
      } else {
        p!.status = 'declined'; p!.decided_by = user; p!.decided_at = at
        log(r.id, user, 'proposal_declined', { proposal_id: p!.id, version: p!.version })
      }
    },

    addMilestone(user: string, room: string, title: string, due: string | null) {
      if (!canEdit(room, user)) fail('Only the people doing this deal can add milestones to an open room')
      if (title.trim().length < 2 || title.length > 200) fail('Name the milestone (2 to 200 characters)')
      const sort = Math.max(0, ...state.milestones.filter(m => m.room_id === room).map(m => m.sort)) + 1
      const id = newId()
      state.milestones.push({ id, room_id: room, title: title.trim(), due_date: due || null, status: 'open', submitted_at: null, submitted_by: null, accepted_at: null, sort, created_at: clock() })
      log(room, user, 'milestone_added', { milestone_id: id, title: title.trim(), ...(due ? { due } : {}) })
      return id
    },

    submitMilestone(user: string, id: string, note = '') {
      const m = state.milestones.find(x => x.id === id)
      if (!m || !canEdit(m.room_id, user)) fail('Milestone not found')
      if (sideFor(m!.room_id, user) !== 'provider' && sidePresent(m!.room_id, 'provider')) fail('The provider submits milestones')
      if (m!.status !== 'open' && m!.status !== 'changes_requested') fail('This milestone is already submitted or accepted')
      const stage = roomOf(m!.room_id).stage
      if (stage !== 'agreed' && stage !== 'in_progress') fail('Milestones are submitted once terms are agreed and before delivery')
      m!.status = 'submitted'; m!.submitted_at = clock(); m!.submitted_by = user
      log(m!.room_id, user, 'milestone_submitted', { milestone_id: id, title: m!.title, ...(note.trim() ? { note: note.trim() } : {}) })
    },

    reviewMilestone(user: string, id: string, accept: boolean, note = '') {
      const m = state.milestones.find(x => x.id === id)
      if (!m || !canEdit(m.room_id, user)) fail('Milestone not found')
      if (m!.status !== 'submitted') fail('Only a submitted milestone can be reviewed')
      if (m!.submitted_by === user) fail('Someone else reviews what you submitted')
      if (sideFor(m!.room_id, user) !== 'buyer' && sidePresent(m!.room_id, 'buyer')) fail('The buyer accepts milestones')
      if (accept) { m!.status = 'accepted'; m!.accepted_at = clock(); log(m!.room_id, user, 'milestone_accepted', { milestone_id: id, title: m!.title }) }
      else { m!.status = 'changes_requested'; log(m!.room_id, user, 'milestone_changes_requested', { milestone_id: id, title: m!.title, ...(note.trim() ? { note: note.trim() } : {}) }) }
    },

    updateDetails(user: string, room: string, patch: Partial<Pick<DealRoomRow, 'title' | 'scope' | 'deliverables' | 'budget_low' | 'budget_high' | 'currency' | 'target_date'>>) {
      if (!canEdit(room, user)) fail('Only the people doing this deal can change its terms while it is open')
      const r = roomOf(room)
      const fields: string[] = []
      if (patch.title !== undefined && patch.title !== r.title) fields.push('title')
      if (patch.scope !== undefined && patch.scope !== r.scope) fields.push('scope')
      if (patch.deliverables !== undefined && patch.deliverables !== r.deliverables) fields.push('deliverables')
      if ((patch.budget_low !== undefined && patch.budget_low !== r.budget_low) || (patch.budget_high !== undefined && patch.budget_high !== r.budget_high) || (patch.currency !== undefined && patch.currency !== r.currency)) fields.push('budget')
      if (patch.target_date !== undefined && patch.target_date !== r.target_date) fields.push('target_date')
      Object.assign(r, patch)
      r.updated_at = clock()
      if (fields.length) log(room, user, 'details_updated', { fields })
    },

    addEvent(user: string, room: string, kind: 'note' | 'link', detail: Record<string, unknown>) {
      if (!isMember(room, user)) fail('Only members of the room can add to it')
      if (kind === 'note' && !String(detail['text'] ?? '').trim()) fail('Write a note first')
      if (kind === 'link' && !/^https?:\/\/\S+$/i.test(String(detail['url'] ?? ''))) fail('Use a web link starting with https://')
      log(room, user, kind, detail)
    },
  }
}

export type DealEngine = ReturnType<typeof createDealEngine>
export { DealError }
