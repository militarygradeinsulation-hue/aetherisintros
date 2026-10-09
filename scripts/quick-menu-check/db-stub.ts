// In-browser stand-in for the Supabase client: one signed-in member and the quick-menu table.
const w = window as unknown as { __saved: { items: string[] } | null; __writes: number }
w.__saved = null
w.__writes = 0
const table = {
  select: () => ({ maybeSingle: async () => ({ data: w.__saved, error: null }) }),
  upsert: async (row: { items: string[] }) => { w.__saved = { items: row.items }; w.__writes++; return { error: null } },
  delete: () => ({ eq: async () => { w.__saved = null; w.__writes++; return { error: null } } }),
}
export const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-4000-8000-00000000000a' } } }) },
  from: () => table,
}
