import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'
import type { LinkedInIdentityDraft } from '@/aetheris/linkedin-identity-review'
import type { OidcConsent } from '@/aetheris/linkedin-oidc'

export const readLinkedInIdentity = createServerFn({method:'GET'})
  .middleware([requireAuthContract])
  .handler(async ({context}) => {
    const { loadLinkedInIdentityDraft } = await import('./linkedin-identity-review.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    // Claims are read with the authenticated client; only this member's private profile
    // is read through the server client. Email is deliberately not exposed in public ACLs.
    return loadLinkedInIdentityDraft({auth:context.supabase.auth,from:table=>supabaseAdmin.from(table as 'profiles')},context.userId)
  })

export const applyLinkedInIdentity = createServerFn({method:'POST'})
  .middleware([requireAuthContract])
  .validator((data: {draft:LinkedInIdentityDraft;consent:OidcConsent}) => {
    if (!data?.draft || !data.consent || typeof data.draft.userId !== 'string' || !data.draft.current || !data.draft.suggestion) throw new Error('Reload your LinkedIn review.')
    return {draft:data.draft,consent:{name:data.consent.name===true,email:data.consent.email===true,photoUrl:data.consent.photoUrl===true}}
  })
  .handler(async ({context,data}) => {
    const { saveLinkedInIdentityDraft } = await import('./linkedin-identity-review.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    return saveLinkedInIdentityDraft({auth:context.supabase.auth,from:table=>supabaseAdmin.from(table as 'profiles')},context.userId,data.draft,data.consent)
  })
