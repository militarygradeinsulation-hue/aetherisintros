// In-browser stand-in for the Supabase client: one signed-in member and the profiles table.
// Every profile update is recorded on window.__updates so the check can see what was written.
const w = window as unknown as { __updates: Array<Record<string, unknown>>; __failNext: boolean }
w.__updates = []
w.__failNext = false
const user = { id: '00000000-0000-4000-8000-00000000000a' }
const baseline: Record<string, unknown> = { name: 'Maya Okafor', initials: 'MO', title: 'Founder', company: '', location: 'Lagos, Lagos State, Nigeria', thesis: '', bio: '', what_i_do: '', focus: '', building: '', industries: [], expertise: [], can_help_with: '', looking_for: '', linkedin_url: '', avatar_url: null }
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user } } }),
    getUser: async () => ({ data: { user } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: (table: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...baseline }, error: null }) }) }),
    update: (row: Record<string, unknown>) => {
      let id = ''
      const query = {
        eq: (col: string, value: unknown) => { if (col === 'id') id = String(value); return query },
        is: () => query,
        select: () => ({ maybeSingle: async () => {
          if (w.__failNext) { w.__failNext = false; return { data: null, error: { message: 'permission denied' } } }
          w.__updates.push({ table, id, row })
          Object.assign(baseline, row)
          return { data: { id }, error: null }
        } }),
      }
      return query
    },
  }),
}
