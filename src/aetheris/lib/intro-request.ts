/** Atomic, consent-safe introduction requests to verified live member IDs.
 * A server-confirmed request is pending, NOT accepted or routed to mutuals.
 */
import { supabase } from '@/integrations/supabase/client'

export const isIntroTargetId = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export async function submitIntroRequest(targetId: string, note: string): Promise<'created' | 'existing'> {
  if (!isIntroTargetId(targetId)) {
    throw new Error('This profile is not linked to a verified live account. Refresh People and try again.')
  }
  const { data: identity, error: authError } = await supabase.auth.getUser()
  if (authError || !identity.user) throw new Error('Sign in before requesting an introduction.')
  if (identity.user.id === targetId) throw new Error('You cannot request an introduction to yourself.')

  // SQL migration 0084 enforces membership, counterpart visibility, double
  // opt-in state and idempotency in one transaction, preventing lost requests.
  const message = note.trim() || 'I would like to explore a mutually useful introduction.'
  const { data, error } = await (supabase as any).rpc('request_verified_intro', {
    p_target: targetId, p_note: message.slice(0, 1000),
  }) // eslint-disable-line @typescript-eslint/no-explicit-any
  if (error) {
    throw new Error(error.message || 'Not sent. No introduction request was confirmed. Retry.')
  }
  if (!data?.id || !['created', 'existing'].includes(data?.state)) {
    throw new Error('Not sent. The server did not confirm an introduction. Retry.')
  }
  return data.state as 'created' | 'existing'
}
