// Only synthetic member data. This fixture never opens a production session.
const rows = Array.from({ length: 12 }, (_, index) => ({
  id: '00000000-0000-4000-8000-' + (index + 1).toString().padStart(12, '0'),
  kind: index % 2 ? 'intro_request' : 'message',
  text: index === 0
    ? 'A very long introduction request describing an important opportunity with specific participants and a next step that must wrap inside the phone screen.'
    : index % 2 ? 'Example person requested an introduction. Both members must opt in.' : 'An executive sent you a new message.',
  link: '', read: index > 2, created_at: new Date(Date.now() - index * 60000).toISOString(),
}))
type Query = { select: (column: string, options?: { count?: string; head?: boolean }) => Query; order: () => Query; limit: () => Query; eq: () => Query; then: (resolve: (value: any) => unknown, reject?: (error: unknown) => unknown) => Promise<unknown> }
const query = (): Query => {
  let count = false
  const api: Query = {
    select: (_column, opts) => { count = Boolean(opts?.count); return api },
    order: () => api, limit: () => api, eq: () => api,
    then: (resolve, reject) => Promise.resolve(count ? { count: 3, data: null, error: null } : { data: rows, error: null }).then(resolve, reject),
  }
  return api
}
export const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'fixture-member' } } }) },
  from: (_table: string) => query(),
  rpc: async () => ({ data: 3, error: null }),
}
