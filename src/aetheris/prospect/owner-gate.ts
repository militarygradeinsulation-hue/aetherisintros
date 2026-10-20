// Fail-closed founder gate for Prospect Intelligence. Access only when the database's
// has_private_owner_grant exists AND returns true. No fallback to the admin role.
export const NOT_CONFIGURED = 'Founder authorization not yet configured. Prospect Intelligence stays closed until it is set up; the rest of your CRM works normally.'
export const DENIED = 'Private owner access required.'
export type GateRpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>
export async function requirePrivateOwner(rpc: GateRpc): Promise<void> {
  const { data, error } = await rpc('has_private_owner_grant', { p_capability: 'prospect_intelligence' })
  if (error) throw new Error(error.code === 'PGRST202' || error.code === '42883' ? NOT_CONFIGURED : DENIED)
  if (data !== true) throw new Error(DENIED)
}
