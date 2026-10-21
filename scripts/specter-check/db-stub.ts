const session = {user: {id:'member-1'}};
export const supabase = { auth: {
  getSession: async () => ({data:{session}}),
  onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
} };
