import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'

/** Private storage buckets where members keep files under a folder named by their id. */
const MEMBER_BUCKETS = ['avatars', 'journal', 'dm-files', 'verification-proof']

/**
 * Permanently deletes the signed-in member's account. Their files are removed from storage,
 * then the account itself; everything they own is deleted with it by the database. Only the
 * fact that an account was deleted (id and time) is kept. The member must type DELETE.
 */
export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { confirm: string }) => {
    if (data?.confirm !== 'DELETE') throw new Error('Type DELETE to confirm.')
    return data
  })
  .handler(async ({ context }): Promise<{ deleted: boolean; error?: string }> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const uid = context.userId

    for (const bucket of MEMBER_BUCKETS) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 })
        const paths = ((files ?? []) as Array<{ name: string }>).map(f => `${uid}/${f.name}`)
        if (paths.length) await admin.storage.from(bucket).remove(paths)
      } catch { /* a missing bucket or folder is fine */ }
    }

    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) {
      console.error('account deletion failed', error)
      // Accounts that created cohorts or organizations must hand them over first.
      return { deleted: false, error: 'Your account could not be deleted automatically, usually because you created an organization or invite cohort others still use. Contact the Ask Intros team and we will complete it.' }
    }
    await admin.from('account_deletions').insert({ user_id: uid })
    return { deleted: true }
  })
