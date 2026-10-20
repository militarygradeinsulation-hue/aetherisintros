import { supabase } from '@/integrations/supabase/client'
import { LINKEDIN_OIDC_PROVIDER, LINKEDIN_OIDC_SCOPES } from './linkedin-oidc'

/** Start the existing provider flow; this never applies claims to profile fields. */
export async function startLinkedInAuthentication(intent: 'signin' | 'link', redirectTo: string): Promise<void> {
  const options = { provider: LINKEDIN_OIDC_PROVIDER, options: { scopes: LINKEDIN_OIDC_SCOPES, redirectTo } }
  const result = intent === 'link'
    ? await supabase.auth.linkIdentity(options)
    : await supabase.auth.signInWithOAuth(options)
  if (result.error) throw new Error('LinkedIn could not connect. Try email sign-in or upload your LinkedIn PDF instead.')
  if (!result.data?.url) throw new Error('LinkedIn did not return a sign-in link. Please retry or use email.')
}
