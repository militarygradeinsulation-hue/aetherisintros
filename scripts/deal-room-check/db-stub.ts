// In-browser stand-in for the Supabase client: two signed-in members (switchable through
// window.__uid) and the deal-room tables, with the same rules as the database functions via
// the local deal engine. Every write is counted in window.__writes.
import { createDealEngine, emptyDealState, type DealState } from '../../src/aetheris/deals-engine'

export const A = '00000000-0000-4000-8000-00000000000a'
export const B = '00000000-0000-4000-8000-00000000000b'

const w = window as unknown as { __uid: string; __writes: number; __state: DealState }
w.__uid = A
w.__writes = 0
const state = emptyDealState()
state.people = { [A]: 'Ana Diaz', [B]: 'Ben Okafor' }
w.__state = state
const engine = createDealEngine(state)

type Row = Record<string, unknown>
const visible = (table: string): Row[] => {
  const me = w.__uid
  const rooms = engine.visibleRooms(me)
  const readable = (room: unknown) => engine.canRead(String(room), me)
  switch (table) {
    case 'deal_rooms': return rooms as unknown as Row[]
    case 'deal_room_members': return state.members.filter(m => readable(m.room_id) || m.user_id === me) as unknown as Row[]
    case 'deal_proposals': return state.proposals.filter(p => readable(p.room_id)) as unknown as Row[]
    case 'deal_milestones': return state.milestones.filter(p => readable(p.room_id)) as unknown as Row[]
    case 'deal_events': return state.events.filter(p => readable(p.room_id)) as unknown as Row[]
    case 'profiles': return Object.entries(state.people).map(([id, name]) => ({ id, name }))
    default: return []
  }
}

const fail = (e: unknown) => ({ data: null, error: { message: e instanceof Error ? e.message : String(e) } })

class Query {
  private filters: Array<(r: Row) => boolean> = []
  private sort: { col: string; asc: boolean } | null = null
  private patch: Row | null = null
  private one = false
  constructor(private table: string) {}
  select() { return this }
  eq(col: string, v: unknown) { this.filters.push(r => r[col] === v); return this }
  in(col: string, vs: unknown[]) { this.filters.push(r => vs.includes(r[col])); return this }
  order(col: string, o?: { ascending?: boolean }) { this.sort = { col, asc: o?.ascending !== false }; return this }
  limit() { return this }
  maybeSingle() { this.one = true; return this }
  update(patch: Row) { this.patch = patch; return this }
  async insert(row: Row) {
    w.__writes++
    try {
      if (this.table !== 'deal_events') throw new Error('not allowed')
      engine.addEvent(w.__uid, String(row['room_id']), row['kind'] as 'note' | 'link', row['detail'] as Record<string, unknown>)
      return { data: null, error: null }
    } catch (e) { return fail(e) }
  }
  private run() {
    if (this.patch) {
      w.__writes++
      const id = String((visible(this.table).find(r => this.filters.every(f => f(r))) ?? {})['id'] ?? '')
      try { engine.updateDetails(w.__uid, id, this.patch); return { data: [{ id }], error: null } } catch { return { data: [], error: null } }
    }
    let rows = visible(this.table).filter(r => this.filters.every(f => f(r)))
    if (this.sort) { const { col, asc } = this.sort; rows = [...rows].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1)) }
    return { data: this.one ? rows[0] ?? null : rows, error: null }
  }
  then<T>(res: (v: { data: unknown; error: unknown }) => T, rej?: (e: unknown) => T) { return Promise.resolve(this.run()).then(res, rej) }
}

const rpcs: Record<string, (a: Record<string, any>) => unknown> = { // eslint-disable-line @typescript-eslint/no-explicit-any
  create_deal_room: a => engine.create(w.__uid, { sourceKind: a.p_source_kind, sourceId: a.p_source_id, title: a.p_title, need: a.p_need, side: a.p_side, counterpart: a.p_counterpart }),
  respond_deal_invite: a => engine.respond(w.__uid, a.p_room, a.p_accept),
  invite_deal_member: a => engine.invite(w.__uid, a.p_room, a.p_user, a.p_role),
  remove_deal_member: a => engine.remove(w.__uid, a.p_room, a.p_user),
  advance_deal_stage: a => {
    const to = engine.advance(w.__uid, a.p_room, a.p_to, a.p_note, a.p_outcome)
    // As in the database: a finished room from an introduction records the closer's outcome once.
    const room = state.rooms.find(r => r.id === a.p_room)
    const already = state.events.some(e => e.room_id === a.p_room && e.kind === 'intro_outcome_recorded' && e.actor === w.__uid)
    if ((to === 'closed' || to === 'cancelled') && room?.source_kind === 'intro' && !already) {
      state.events.push({ id: crypto.randomUUID(), room_id: a.p_room, actor: w.__uid, kind: 'intro_outcome_recorded', detail: { stage: a.p_outcome === 'won' ? 'outcome' : 'no_outcome' }, created_at: new Date().toISOString() })
    }
    return to
  },
  submit_deal_proposal: a => engine.propose(w.__uid, a.p_room, a.p_summary, a.p_amount),
  decide_proposal: a => engine.decide(w.__uid, a.p_proposal, a.p_accept),
  add_deal_milestone: a => engine.addMilestone(w.__uid, a.p_room, a.p_title, a.p_due),
  submit_deal_milestone: a => engine.submitMilestone(w.__uid, a.p_milestone, a.p_note),
  review_deal_milestone: a => engine.reviewMilestone(w.__uid, a.p_milestone, a.p_accept, a.p_note),
}

export const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: w.__uid } } }) },
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    w.__writes++
    const fn = rpcs[name]
    if (!fn) return fail(`unknown function ${name}`)
    try { return { data: fn(args) ?? null, error: null } } catch (e) { return fail(e) }
  },
}
