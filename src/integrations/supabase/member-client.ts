import { createClient } from '@supabase/supabase-js'
import { supabase } from './client'
import type { Database } from './types'

/** Bind one operation to its initiating account, even if browser auth changes. */
export async function memberClient(expectedUserId: string) {
  const { data, error } = await supabase.auth.getSession()
  const session = data.session
  if (error || !session?.access_token || session.user.id !== expectedUserId) {
    throw new Error('The account changed. Sign in again before saving.')
  }
  const url = import.meta.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL']
  const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY']
  if (!url || !key) throw new Error('Account storage is unavailable.')
  const token = session.access_token
  return createClient<Database>(url, key, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
