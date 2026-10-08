/**
 * A tiny stand-in for the Supabase client, shared by every tab of one browser through
 * localStorage, with just the queries and functions the meeting room uses. Realtime goes
 * through the BroadcastChannel transport from ../meeting-call-check.
 */
import { fakeTransport } from '../meeting-call-check/fake-transport'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const read = (t: string): Row[] => JSON.parse(localStorage.getItem(`db:${t}`) ?? '[]')
const write = (t: string, rows: Row[]) => localStorage.setItem(`db:${t}`, JSON.stringify(rows))
export const me = () => new URLSearchParams(location.search).get('user') ?? 'anon'

class Query implements PromiseLike<{ data: unknown; error: null }> {
  private filters: Array<(r: Row) => boolean> = []
  private one = false
  private insertRows: Row[] | null = null
  constructor(private table: string) {}
  select() { return this }
  order() { return this }
  limit() { return this }
  eq(k: string, v: unknown) { this.filters.push(r => r[k] === v); return this }
  in(k: string, v: unknown[]) { this.filters.push(r => v.includes(r[k])); return this }
  is(k: string, v: unknown) { this.filters.push(r => (r[k] ?? null) === v); return this }
  not() { return this }
  or() { return this }
  gte() { return this }
  lte() { return this }
  neq(k: string, v: unknown) { this.filters.push(r => r[k] !== v); return this }
  maybeSingle() { this.one = true; return this }
  single() { this.one = true; return this }
  insert(rows: Row | Row[]) { this.insertRows = Array.isArray(rows) ? rows : [rows]; return this }
  then<T>(resolve: (v: { data: unknown; error: null }) => T) {
    if (this.insertRows) {
      const added = this.insertRows.map(r => ({ id: crypto.randomUUID(), speaker_id: me(), spoken_at: new Date().toISOString(), ...r }))
      write(this.table, [...read(this.table), ...added])
      return Promise.resolve({ data: added, error: null }).then(resolve)
    }
    const rows = read(this.table).filter(r => this.filters.every(f => f(r)))
    return Promise.resolve({ data: this.one ? rows[0] ?? null : rows, error: null }).then(resolve)
  }
}

const update = (t: string, match: (r: Row) => boolean, patch: (r: Row) => Row) => write(t, read(t).map(r => (match(r) ? patch(r) : r)))

const rpcs: Record<string, (a: Row) => unknown> = {
  mark_meeting_joined: a => update('meeting_participants', r => r.meeting_id === a.p_meeting && r.user_id === me(), r => ({ ...r, joined_at: r.joined_at ?? new Date().toISOString() })),
  set_meeting_notes_consent: a => update('meeting_participants', r => r.meeting_id === a.p_meeting && r.user_id === me(), r => ({ ...r, notes_consent: !!a.p_on })),
  set_meeting_recording: a => {
    if (a.p_on) {
      update('meetings', r => r.id === a.p_meeting, r => ({ ...r, recording_started_at: r.recording_started_at ?? new Date().toISOString(), recording_started_by: r.recording_started_by ?? me() }))
      update('meeting_participants', r => r.meeting_id === a.p_meeting && r.user_id === me(), r => ({ ...r, notes_consent: true }))
    } else {
      update('meetings', r => r.id === a.p_meeting, r => ({ ...r, recording_started_at: null, recording_started_by: null }))
      update('meeting_participants', r => r.meeting_id === a.p_meeting, r => ({ ...r, notes_consent: false }))
    }
  },
  invite_to_meeting: a => write('meeting_participants', [...read('meeting_participants'), { meeting_id: a.p_meeting, user_id: a.p_user, role: 'guest', notes_consent: false }]),
  end_meeting: a => update('meetings', r => r.id === a.p_meeting, r => ({ ...r, ended_at: new Date().toISOString() })),
}

export const supabase = {
  from: (t: string) => new Query(t),
  rpc: async (name: string, args: Row) => { rpcs[name]?.(args); return { data: null, error: null } },
  channel: fakeTransport.channel,
  removeChannel: fakeTransport.removeChannel,
  realtime: { setAuth: async () => undefined },
  auth: {
    getSession: async () => ({ data: { session: { user: { id: me() }, access_token: 'x' } } }),
    getUser: async () => ({ data: { user: { id: me() } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  storage: { from: () => ({ download: async () => ({ data: null, error: null }) }) },
}
