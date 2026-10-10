/**
 * Deal rooms data access. Live rooms read and write Supabase (every rule is enforced there,
 * see 0058_deal_rooms.sql); the /demo showcase uses a local example room that never leaves
 * the browser. Both sit behind the same small API so the page has one code path.
 */
import { supabase } from '@/integrations/supabase/client'
import type { DealDraft, DealRole, DealSide, DealStage } from './deals-core'
import {
  createDealEngine, emptyDealState,
  type DealEventRow, type DealMemberRow, type DealMilestoneRow, type DealProposalRow, type DealRoomRow, type DealState,
} from './deals-engine'

export type { DealEventRow, DealMemberRow, DealMilestoneRow, DealProposalRow, DealRoomRow }

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface RoomBundle {
  room: DealRoomRow
  members: DealMemberRow[]
  proposals: DealProposalRow[]
  milestones: DealMilestoneRow[]
  events: DealEventRow[]
}

export type Result<T = unknown> = { error: string; data?: T }

export type DetailsPatch = Partial<Pick<DealRoomRow, 'title' | 'scope' | 'deliverables' | 'budget_low' | 'budget_high' | 'currency' | 'target_date'>>

export interface DealsApi {
  mode: 'live' | 'showcase'
  me(): Promise<string | null>
  listMine(): Promise<Result<{ rooms: DealRoomRow[]; members: DealMemberRow[] }>>
  loadRoom(id: string): Promise<Result<RoomBundle | null>>
  names(ids: string[]): Promise<Record<string, string>>
  people(): Promise<Array<{ id: string; name: string }>>
  findForSource(kind: string, id: string): Promise<string | null>
  create(d: DealDraft & { side: DealSide; invite: boolean }): Promise<Result<string>>
  respond(room: string, accept: boolean): Promise<Result>
  invite(room: string, user: string, role: DealRole): Promise<Result>
  remove(room: string, user: string): Promise<Result>
  advance(room: string, to: DealStage, note: string, outcome: 'won' | 'lost' | null): Promise<Result>
  propose(room: string, summary: string, amount: number | null): Promise<Result>
  decide(proposal: string, accept: boolean): Promise<Result>
  addMilestone(room: string, title: string, due: string | null): Promise<Result>
  submitMilestone(id: string, note: string): Promise<Result>
  reviewMilestone(id: string, accept: boolean, note: string): Promise<Result>
  updateDetails(room: string, patch: DetailsPatch): Promise<Result>
  addNote(room: string, text: string): Promise<Result>
  addLink(room: string, url: string, label: string): Promise<Result>
}

const msg = (e: unknown) => {
  const m = (e as { message?: string } | null)?.message ?? (e instanceof Error ? e.message : '')
  return m || 'That did not go through. Please try again.'
}
const rpc = async (name: string, args: Record<string, unknown>): Promise<Result<any>> => {
  const r = await db.rpc(name, args)
  return r.error ? { error: msg(r.error) } : { error: '', data: r.data }
}

/* ── Live ───────────────────────────────────────────────────────────────────────────── */

export const liveDeals: DealsApi = {
  mode: 'live',
  async me() {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  },
  async listMine() {
    const rooms = await db.from('deal_rooms').select('*').order('updated_at', { ascending: false })
    if (rooms.error) return { error: msg(rooms.error), data: { rooms: [], members: [] } }
    const ids = (rooms.data ?? []).map((r: DealRoomRow) => r.id)
    const members = ids.length ? await db.from('deal_room_members').select('*').in('room_id', ids) : { data: [] }
    return { error: '', data: { rooms: rooms.data ?? [], members: members.data ?? [] } }
  },
  async loadRoom(id) {
    const room = await db.from('deal_rooms').select('*').eq('id', id).maybeSingle()
    if (room.error) return { error: msg(room.error), data: null }
    if (!room.data) return { error: '', data: null }
    const [members, proposals, milestones, events] = await Promise.all([
      db.from('deal_room_members').select('*').eq('room_id', id),
      db.from('deal_proposals').select('*').eq('room_id', id).order('version', { ascending: true }),
      db.from('deal_milestones').select('*').eq('room_id', id).order('sort', { ascending: true }),
      db.from('deal_events').select('*').eq('room_id', id).order('created_at', { ascending: true }),
    ])
    return {
      error: '',
      data: { room: room.data, members: members.data ?? [], proposals: proposals.data ?? [], milestones: milestones.data ?? [], events: events.data ?? [] },
    }
  },
  async names(ids) {
    const unique = [...new Set(ids)].filter(Boolean)
    if (!unique.length) return {}
    const r = await db.from('profiles').select('id, name').in('id', unique)
    return Object.fromEntries((r.data ?? []).map((p: { id: string; name: string | null }) => [p.id, (p.name ?? '').trim() || 'A member']))
  },
  async people() {
    const r = await db.from('profiles').select('id, name').order('name', { ascending: true }).limit(500)
    return (r.data ?? []).filter((p: { name: string | null }) => (p.name ?? '').trim()).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name.trim() }))
  },
  async findForSource(kind, id) {
    const r = await db.from('deal_rooms').select('id, stage').eq('source_kind', kind).eq('source_id', id)
    const open = (r.data ?? []).find((x: { stage: DealStage }) => x.stage !== 'closed' && x.stage !== 'cancelled')
    return open?.id ?? null
  },
  async create(d) {
    return rpc('create_deal_room', {
      p_source_kind: d.sourceKind, p_source_id: d.sourceId, p_title: d.title, p_need: d.need, p_side: d.side,
      p_counterpart: d.invite ? d.counterpartId : null,
    })
  },
  respond: (room, accept) => rpc('respond_deal_invite', { p_room: room, p_accept: accept }),
  invite: (room, user, role) => rpc('invite_deal_member', { p_room: room, p_user: user, p_role: role }),
  remove: (room, user) => rpc('remove_deal_member', { p_room: room, p_user: user }),
  advance: (room, to, note, outcome) => rpc('advance_deal_stage', { p_room: room, p_to: to, p_note: note, p_outcome: outcome }),
  propose: (room, summary, amount) => rpc('submit_deal_proposal', { p_room: room, p_summary: summary, p_amount: amount }),
  decide: (proposal, accept) => rpc('decide_proposal', { p_proposal: proposal, p_accept: accept }),
  addMilestone: (room, title, due) => rpc('add_deal_milestone', { p_room: room, p_title: title, p_due: due }),
  submitMilestone: (id, note) => rpc('submit_deal_milestone', { p_milestone: id, p_note: note }),
  reviewMilestone: (id, accept, note) => rpc('review_deal_milestone', { p_milestone: id, p_accept: accept, p_note: note }),
  async updateDetails(room, patch) {
    const r = await db.from('deal_rooms').update(patch).eq('id', room).select('id')
    if (r.error) return { error: msg(r.error) }
    // RLS filters a write you may not make down to zero rows rather than an error.
    if (!(r.data ?? []).length) return { error: 'Only the people doing this deal can change its terms while it is open.' }
    return { error: '' }
  },
  async addNote(room, text) {
    const r = await db.from('deal_events').insert({ room_id: room, kind: 'note', detail: { text } })
    return { error: r.error ? msg(r.error) : '' }
  },
  async addLink(room, url, label) {
    const r = await db.from('deal_events').insert({ room_id: room, kind: 'link', detail: label ? { url, label } : { url } })
    return { error: r.error ? msg(r.error) : '' }
  },
}

/* ── Showcase ───────────────────────────────────────────────────────────────────────── */

export const SHOWCASE_YOU = 'showcase-you'
export const SHOWCASE_THEM = 'showcase-provider'

/** One example room, mid-negotiation, so every step can be tried. Never sent anywhere. */
export function showcaseState(): DealState {
  const state = emptyDealState()
  state.people = { [SHOWCASE_YOU]: 'Jordan Blake (example buyer)', [SHOWCASE_THEM]: 'Marcus Lee (example provider)', 'showcase-advisor': 'Sarah Chen (example advisor)' }
  const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString()
  let t = -12
  const engine = createDealEngine(state, () => days(t++ / 2))
  const room = engine.create(SHOWCASE_YOU, {
    sourceKind: 'intro', sourceId: 'showcase-intro', side: 'buyer', counterpart: SHOWCASE_THEM,
    title: 'Fractional CFO for the Series B',
    need: 'Introduced because you need a fractional CFO to get the data room and model ready for a Series B in Q1; Marcus has run three raises as an interim CFO.',
  })
  engine.respond(SHOWCASE_THEM, room, true)
  engine.updateDetails(SHOWCASE_YOU, room, {
    scope: 'Twelve weeks, two days a week: financial model, data room, investor Q&A support.',
    deliverables: 'Three-statement model · data room index · weekly raise update',
    budget_low: 40000, budget_high: 60000, target_date: days(80).slice(0, 10),
  })
  engine.propose(SHOWCASE_THEM, room, 'Twelve weeks at two days a week, model and data room by week six.', 54000)
  engine.addEvent(SHOWCASE_THEM, room, 'note', { text: 'Happy to start the week of the 3rd.' })
  return state
}

/** The local API for the showcase. `as()` lets the visitor see the other side. */
export function createShowcaseDeals(state: DealState = showcaseState()) {
  const engine = createDealEngine(state)
  let acting = SHOWCASE_YOU
  const run = async <T>(fn: () => T): Promise<Result<T>> => {
    try { return { error: '', data: fn() } } catch (e) { return { error: msg(e) } }
  }
  const api: DealsApi & { as(user: string): void; acting(): string } = {
    mode: 'showcase',
    as(user) { acting = user },
    acting: () => acting,
    me: async () => acting,
    listMine: async () => ({ error: '', data: { rooms: engine.visibleRooms(acting), members: state.members.filter(m => engine.visibleRooms(acting).some(r => r.id === m.room_id)) } }),
    async loadRoom(id) {
      const room = state.rooms.find(r => r.id === id)
      if (!room || !engine.visibleRooms(acting).includes(room)) return { error: '', data: null }
      const full = engine.canRead(id, acting)
      return {
        error: '',
        data: {
          room,
          members: state.members.filter(m => m.room_id === id && (full || m.user_id === acting)),
          proposals: full ? state.proposals.filter(p => p.room_id === id).sort((a, b) => a.version - b.version) : [],
          milestones: full ? state.milestones.filter(m => m.room_id === id).sort((a, b) => a.sort - b.sort) : [],
          events: full ? state.events.filter(e => e.room_id === id) : [],
        },
      }
    },
    names: async ids => Object.fromEntries(ids.map(id => [id, state.people[id] ?? 'A member'])),
    people: async () => Object.entries(state.people).map(([id, name]) => ({ id, name })),
    findForSource: async (kind, id) => state.rooms.find(r => r.source_kind === kind && r.source_id === id && r.stage !== 'closed' && r.stage !== 'cancelled')?.id ?? null,
    create: d => run(() => engine.create(acting, { sourceKind: d.sourceKind, sourceId: d.sourceId, title: d.title, need: d.need, side: d.side, counterpart: d.invite ? d.counterpartId : null })),
    respond: (room, accept) => run(() => { engine.respond(acting, room, accept) }),
    invite: (room, user, role) => run(() => { engine.invite(acting, room, user, role) }),
    remove: (room, user) => run(() => { engine.remove(acting, room, user) }),
    advance: (room, to, note, outcome) => run(() => { engine.advance(acting, room, to, note, outcome) }),
    propose: (room, summary, amount) => run(() => { engine.propose(acting, room, summary, amount) }),
    decide: (proposal, accept) => run(() => { engine.decide(acting, proposal, accept) }),
    addMilestone: (room, title, due) => run(() => { engine.addMilestone(acting, room, title, due) }),
    submitMilestone: (id, note) => run(() => { engine.submitMilestone(acting, id, note) }),
    reviewMilestone: (id, accept, note) => run(() => { engine.reviewMilestone(acting, id, accept, note) }),
    updateDetails: (room, patch) => run(() => { engine.updateDetails(acting, room, patch) }),
    addNote: (room, text) => run(() => { engine.addEvent(acting, room, 'note', { text }) }),
    addLink: (room, url, label) => run(() => { engine.addEvent(acting, room, 'link', label ? { url, label } : { url }) }),
  }
  return api
}

export type ShowcaseDeals = ReturnType<typeof createShowcaseDeals>
