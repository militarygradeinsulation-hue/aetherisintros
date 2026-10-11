/**
 * Sign in with LinkedIn (OpenID Connect). We request only the `openid profile email` scopes and
 * read only the claims LinkedIn returns for them. Nothing is applied to a profile until the
 * member ticks each item: signing in alone never fills anything.
 *
 * Pure: maps the identity data of an already-authenticated Supabase user to suggestions.
 */
import { isLinkedInPhotoUrl } from './linkedin-import'

export const LINKEDIN_OIDC_PROVIDER = 'linkedin_oidc' as const
export const LINKEDIN_OIDC_SCOPES = 'openid profile email'

export interface OidcSuggestion {
  name: string
  photoUrl: string
  /** Present only when LinkedIn reports the address as verified. */
  email: string
}

export type OidcConsent = Partial<Record<keyof OidcSuggestion, boolean>>

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[^\s@<>]{2,24}$/

interface IdentityLike { provider?: unknown; identity_data?: unknown }

/** Maps OIDC claims (sub, name, given_name, family_name, picture, email, email_verified) to suggestions. */
export function mapOidcClaims(claims: unknown): OidcSuggestion {
  const c = (claims && typeof claims === 'object' ? claims : {}) as Record<string, unknown>
  const joined = [text(c['given_name'], 60), text(c['family_name'], 60)].filter(Boolean).join(' ')
  const name = text(c['name'], 120) || joined
  const picture = text(c['picture'] ?? c['avatar_url'], 600)
  const email = text(c['email'], 254).toLowerCase()
  const verified = c['email_verified'] === true || c['email_verified'] === 'true'
  return { name, photoUrl: isLinkedInPhotoUrl(picture) ? picture : '', email: verified && EMAIL.test(email) ? email : '' }
}

/** Suggestions from the user's LinkedIn OIDC identity, or null when they have not signed in with LinkedIn. */
export function oidcSuggestionFromIdentities(identities: readonly IdentityLike[] | null | undefined): OidcSuggestion | null {
  const identity = (identities ?? []).find(i => i?.provider === LINKEDIN_OIDC_PROVIDER)
  if (!identity) return null
  const s = mapOidcClaims(identity.identity_data)
  return s.name || s.photoUrl || s.email ? s : null
}

/** Only the items the member explicitly ticked. No consent, nothing. */
export function applyOidcConsent(s: OidcSuggestion, consent: OidcConsent): Partial<OidcSuggestion> {
  const out: Partial<OidcSuggestion> = {}
  for (const key of ['name', 'photoUrl', 'email'] as const) if (consent[key] === true && s[key]) out[key] = s[key]
  return out
}
