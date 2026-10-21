import { supabase } from '@/integrations/supabase/client'
import { profileColumns, type ScanKey } from './linkedin-scan'
import type { Database } from '@/integrations/supabase/types'

export interface ProfileScanContext { userId: string; baseline: Record<string, unknown> }
const columns = [...Object.keys(profileColumns({ name: 'Member', title: 'Role', company: 'Company', location: 'Place', headline: 'Headline', about: 'About', focus: 'Focus', industries: 'Industry', expertise: 'Skill', can_help_with: 'Help', looking_for: 'Need', linkedin_url: 'linkedin.com/in/member' })), 'avatar_url']

export async function loadProfileScanContext(): Promise<ProfileScanContext> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in again before scanning your profile.')
  const { data: baseline, error: readError } = await supabase.from('profiles').select(columns.join(',')).eq('id', data.user.id).maybeSingle()
  if (readError || !baseline) throw new Error('Your saved profile could not be loaded. Nothing was scanned or saved.')
  return { userId: data.user.id, baseline: baseline as unknown as Record<string, unknown> }
}

/** RLS plus owner and per-column optimistic comparisons; no service-role writes. */
export async function saveReviewedProfileScan(patch: Partial<Record<ScanKey, string>>, context: ProfileScanContext, avatarUrl?: string): Promise<void> {
  const { data, error } = await supabase.auth.getUser()
  if (error || data.user?.id !== context.userId) throw new Error('Your account changed. Scan again before applying.')
  const changes = profileColumns(patch) as Database['public']['Tables']['profiles']['Update']
  if (avatarUrl) changes.avatar_url = avatarUrl
  if (!Object.keys(changes).length) throw new Error('No supported profile fields were selected.')
  let query = supabase.from('profiles').update(changes).eq('id', context.userId)
  for (const column of Object.keys(changes)) {
    if (!Object.hasOwn(context.baseline, column)) throw new Error('The review is incomplete. Scan again.')
    const value = context.baseline[column]
    query = value == null ? query.is(column, null) : query.eq(column, Array.isArray(value) ? `{${value.map(item => `"${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}` : value)
  }
  const { data: receipt, error: writeError } = await query.select('id').maybeSingle()
  if (writeError) throw new Error('Your selected profile fields could not be saved. Retry the review.')
  if (!receipt || receipt.id !== context.userId) throw new Error('Your profile changed during review. Scan again to protect your edits.')
}