import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { parseEntitlements } from '@/aetheris/member-entitlements';
/** Preserve the existing verified-member entitlement contract. No service key. */
export async function requireBusinessWorkspace(db: SupabaseClient<Database>) {
  const gate = await db.rpc('is_live_member');
  if (gate.error || gate.data !== true) throw new Error('Live membership could not be confirmed.');
  // Match the existing entitlement contract. Only the explicit legacy missing-RPC
  // case retains the historical member access path; all other failures deny access.
  const entitlement = await (db as unknown as {
    rpc: (name: string) => Promise<{ data: unknown; error: { code?: string } | null }>
  }).rpc('my_member_entitlements');
  if (entitlement.error) {
    if (!['PGRST202', '42883'].includes(entitlement.error.code ?? '')) throw new Error('Membership permissions are unavailable.');
  } else if (!parseEntitlements(entitlement.data).business) {
    throw new Error('Business workspace access is required.');
  }
}
