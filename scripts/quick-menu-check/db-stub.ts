// In-browser stand-in for the Supabase client: one signed-in member and the quick-menu table.
const w = window as unknown as { __saved: { items: string[] } | null; __writes: number; __notes: Array<Record<string, unknown>>; __noteFailure: boolean; __guest: boolean }
w.__saved = null
w.__notes = []
w.__writes = 0
w.__noteFailure = false
w.__guest = false
const table = {
  select: () => ({ maybeSingle: async () => ({ data: w.__saved, error: null }) }),
  upsert: async (row: { items: string[] }) => { w.__saved = { items: row.items }; w.__writes++; return { error: null } },
  insert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => {
    if (w.__noteFailure) return { data: null, error: { message: 'Fixture write denied' } }
    w.__notes.push(row)
    return { data: { id: `note-${w.__notes.length}` }, error: null }
  } }) }),
  delete: () => ({ eq: async () => { w.__saved = null; w.__writes++; return { error: null } } }),
}
export const supabase = {
  auth: { getUser: async () => ({ data: { user: w.__guest ? null : { id: '00000000-0000-4000-8000-00000000000a' } }, error: null }) },
  from: () => table,
}
