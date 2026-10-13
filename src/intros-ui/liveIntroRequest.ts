/** All live introductions require a server acknowledgement before being described as sent.
 * The target receives an introduction notification from the existing trigger.
 * A pending request is NOT an accepted introduction or an automatic mutual referral.
 */
import { supabase } from '@/integrations/supabase/client'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function submitIntroRequest(targetId: string, note: string): Promise<'created' | 'existing'> {
  if (!UUID.test(targetId)) throw new Error('This is a sample profile, not a live member.')
  const { data: identity, error: authError } = await supabase.auth.getUser()
  if (authError || !identity.user) throw new Error('Sign in before requesting an introduction.')
  if (identity.user.id === targetId) throw new Error('You cannot request an introduction to yourself.')
  const existing = await supabase.from('intro_requests')
    .select('id').eq('user_id', identity.user.id).eq('member_id', targetId).maybeSingle()
  if (existing.error) throw new Error('Unable to check previous requests. Try again.')
  if (existing.data) return 'existing'
  const { data, error } = await supabase.from('intro_requests').insert({
    user_id: identity.user.id, member_id: targetId,
    target_user_id: targetId, status: 'requested', requester_opt_in: true,
    member_opt_in: false, reason: note.trim().slice(0, 1000),
  }).select('id').maybeSingle()
  if (error) {
    // Network retries or simultaneous tabs can race. A confirmed existing row
    // is still a valid success; any other uncertainty must remain visible.
    if (error.code === '23505') {
      const raced = await supabase.from('intro_requests').select('id')
        .eq('user_id',identity.user.id).eq('member_id',targetId).maybeSingle()
      if (!raced.error && raced.data?.id) return 'existing'
    }
    throw new Error('Not sent. Your introduction request was not confirmed by the server. Retry.')
  }
  if (!data?.id) throw new Error('Not sent. No saved introduction request was returned.')
  return 'created'
}
