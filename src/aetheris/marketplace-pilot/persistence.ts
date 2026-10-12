/** Persist research intent for the signed-in member only.
 * This RPC never creates a public listing or authorizes partner outreach.
 */
import { supabase } from '@/integrations/supabase/client'
import type { PilotInterestSubmit } from './pilot-interest'

export const saveMarketplacePilotInterest: PilotInterestSubmit = async (payload) => {
  // The RPC signature is introduced in migration 0081.
  const { data, error } = await (supabase as any).rpc('submit_marketplace_pilot_interest', {
    p_response: payload,
  }) // eslint-disable-line @typescript-eslint/no-explicit-any
  if (error || typeof data !== 'string') {
    throw new Error('Marketplace interest could not be saved')
  }
}
