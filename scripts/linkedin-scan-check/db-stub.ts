// In-browser stand-in for the Supabase client: one signed-in member and the profiles table.
// Every profile update is recorded on window.__updates so the check can see what was written.
const w = window as unknown as { __updates: Array<Record<string, unknown>>; __failNext: boolean }
w.__updates = []
w.__failNext = false
const user = { id: '00000000-0000-4000-8000-00000000000a' }
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user } } }),
    getUser: async () => ({ data: { user } }),
  },
  from: (table: string) => ({
    update: (row: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => ({
        select: async () => {
          if (w.__failNext) { w.__failNext = false; return { data: null, error: { message: 'permission denied' } } }
          w.__updates.push({ table, id, row })
          return { data: [{ id }], error: null }
        },
      }),
    }),
  }),
}
