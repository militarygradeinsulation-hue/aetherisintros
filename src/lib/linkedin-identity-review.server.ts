import { applyOidcConsent, oidcSuggestionFromIdentities, type OidcConsent } from '@/aetheris/linkedin-oidc'
import type { IdentityProfile, LinkedInIdentityDraft, IdentityReceipt } from '@/aetheris/linkedin-identity-review'
// Adapter is server-only; the caller binds the user ID to validated authentication.
export interface IdentityDb { auth: { getUser: () => Promise<any> }; from: (table: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any
/** Read only the authenticated member's provider identity and their own profile. */
export async function loadLinkedInIdentityDraft(db: IdentityDb, userId: string): Promise<LinkedInIdentityDraft | null> {
  const { data, error } = await db.auth.getUser()
  if (error || !data.user || data.user.id !== userId) throw new Error('Sign in again to review your LinkedIn identity.')
  const suggestion = oidcSuggestionFromIdentities(data.user.identities)
  if (!suggestion) return null
  const { data: current, error: readError } = await db.from('profiles').select('name,email,avatar_url').eq('id', data.user.id).maybeSingle()
  if (readError || !current) throw new Error('Your profile could not be loaded. Retry before applying LinkedIn details.')
  return { userId: data.user.id, suggestion, current }
}

/** One account-bound, optimistic write; never update the authentication email. */
export async function saveLinkedInIdentityDraft(db: IdentityDb, userId: string, draft: LinkedInIdentityDraft, consent: OidcConsent): Promise<IdentityReceipt> {
  const fresh = await loadLinkedInIdentityDraft(db, userId)
  if (!fresh || fresh.userId !== draft.userId) throw new Error('Your account changed. Reload the LinkedIn review before applying.')
  if ((['name','email','photoUrl'] as const).some(key=>fresh.suggestion[key] !== draft.suggestion[key])) throw new Error('Your LinkedIn details changed. Reload the review before applying.')
  const picked = applyOidcConsent(fresh.suggestion, consent)
  const patch: { name?: string; email?: string; avatar_url?: string; initials?: string } = {}
  if (picked.name) patch.name = picked.name
  if (picked.email) patch.email = picked.email
  if (picked.photoUrl) patch.avatar_url = picked.photoUrl
  const columns = Object.keys(patch) as Array<keyof IdentityProfile>
  if (picked.name) patch.initials = picked.name.split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase() || 'M'
  if (!columns.length) throw new Error('Select at least one LinkedIn detail first.')
  if (columns.some(key=>fresh.current[key] !== draft.current[key])) throw new Error('Your profile changed while this review was open. Reload it to protect your edits.')
  let query = db.from('profiles').update(patch).eq('id', draft.userId)
  for (const key of columns) query = draft.current[key] == null ? query.is(key, null) : query.eq(key, draft.current[key]!)
  const { data, error } = await query.select('id,name,email,avatar_url').maybeSingle()
  if (error) throw new Error('The selected LinkedIn details could not be saved. Your selections are kept for retry.')
  if (!data || data.id !== draft.userId) throw new Error('Your profile changed before the save completed. Reload the review.')
  return { userId: data.id, name: data.name, email: data.email, avatarUrl: data.avatar_url, changed: columns }
}
