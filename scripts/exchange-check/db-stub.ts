export const A = '00000000-0000-4000-8000-00000000000a'
export const B = '00000000-0000-4000-8000-00000000000b'
export const C = '00000000-0000-4000-8000-00000000000c'
let uid = A
let listener: ((_event: string, session: { user: { id: string } }) => void) | null = null
export function switchUser(id: string) { uid = id; listener?.('SIGNED_IN', { user: { id } }) }
type Row = Record<string, any>
let rows: Row[] = JSON.parse(localStorage.getItem('exchange-browser-fixture') ?? '[]')
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: uid } } } }),
    onAuthStateChange: (fn: typeof listener) => { listener = fn; return { data: { subscription: { unsubscribe() { listener = null } } } } },
  },
  async rpc(name: string, args: Row = {}) {
    if ((window as any).__failExchange) return { data: null, error: { message: 'fixture network failure' } }
    if (name === 'list_exchange_opportunities') return { error: null, data: rows.filter(r => r.ownerId === uid || r.visibility === 'network').map(r => ({ ...r, saved: r.saves.includes(uid), interest: r.interest.filter((i: Row) => r.ownerId === uid || i.memberId === uid) })) }
    if (name === 'publish_exchange_opportunity') {
      const id = crypto.randomUUID()
      rows.push({ ...args.p_input, id, ownerId: uid, status: 'open', createdAt: new Date().toISOString(), interest: [], saves: [], saved: false })
      localStorage.setItem('exchange-browser-fixture', JSON.stringify(rows))
      return { error: null, data: id }
    }
    const row = rows.find(r => r.id === args.p_id)!
    if (args.p_action === 'save') row.saves = [...new Set([...row.saves, uid])]
    if (args.p_action === 'unsave') row.saves = row.saves.filter((id: string) => id !== uid)
    if (args.p_action === 'close') row.status = 'closed'
    if (args.p_action === 'interest') row.interest.push({ memberId: uid, note: args.p_note, when: new Date().toISOString() })
    localStorage.setItem('exchange-browser-fixture', JSON.stringify(rows))
    return { error: null, data: null }
  },
}
