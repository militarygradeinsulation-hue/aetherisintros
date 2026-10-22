const session = {user: {id:'member-1'}};
export const supabase = { auth: {
  getSession: async () => ({data:{session}}),
  onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
}, rpc: async () => ({ data: null, error: { message: 'not available in the check harness' } }) };
