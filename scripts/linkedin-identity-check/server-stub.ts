import { supabase } from './db-stub'
import { loadLinkedInIdentityDraft, saveLinkedInIdentityDraft } from '../../src/lib/linkedin-identity-review.server'
export const readLinkedInIdentity=()=>loadLinkedInIdentityDraft(supabase, (window as any).__identityUser)
export const applyLinkedInIdentity=({data}:any)=>saveLinkedInIdentityDraft(supabase,(window as any).__identityUser,data.draft,data.consent)
