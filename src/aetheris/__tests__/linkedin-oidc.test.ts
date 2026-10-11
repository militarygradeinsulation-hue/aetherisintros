import { describe, expect, it } from 'vitest'

import { applyOidcConsent, LINKEDIN_OIDC_SCOPES, mapOidcClaims, oidcSuggestionFromIdentities } from '../linkedin-oidc'

const claims = {
  sub: 'abc123', name: 'Jane Example', given_name: 'Jane', family_name: 'Example',
  picture: 'https://media.licdn.com/dms/image/v2/synthetic/profile.jpg', email: 'Jane@Example.test', email_verified: true,
}

describe('LinkedIn OIDC mapping', () => {
  it('requests only openid, profile and email', () => {
    expect(LINKEDIN_OIDC_SCOPES.split(' ').sort()).toEqual(['email', 'openid', 'profile'])
  })
  it('maps verified name, photo and email', () => {
    expect(mapOidcClaims(claims)).toEqual({ name: 'Jane Example', photoUrl: claims.picture, email: 'jane@example.test' })
  })
  it('falls back to given and family name', () => {
    expect(mapOidcClaims({ given_name: 'Jane', family_name: 'Example' }).name).toBe('Jane Example')
  })
  it('drops unverified or malformed email and non-LinkedIn photos', () => {
    expect(mapOidcClaims({ ...claims, email_verified: false }).email).toBe('')
    expect(mapOidcClaims({ ...claims, email_verified: undefined }).email).toBe('')
    expect(mapOidcClaims({ ...claims, email: 'not an email' }).email).toBe('')
    expect(mapOidcClaims({ ...claims, picture: 'https://evil.test/dms/image/x.jpg' }).photoUrl).toBe('')
  })
  it('survives missing or hostile claims', () => {
    expect(mapOidcClaims(null)).toEqual({ name: '', photoUrl: '', email: '' })
    expect(mapOidcClaims({ name: 42, email: {} })).toEqual({ name: '', photoUrl: '', email: '' })
  })
  it('finds the LinkedIn identity only', () => {
    expect(oidcSuggestionFromIdentities([{ provider: 'google', identity_data: { name: 'Other' } }])).toBeNull()
    expect(oidcSuggestionFromIdentities(undefined)).toBeNull()
    expect(oidcSuggestionFromIdentities([{ provider: 'google', identity_data: {} }, { provider: 'linkedin_oidc', identity_data: claims }])?.name).toBe('Jane Example')
  })
})

describe('LinkedIn OIDC consent', () => {
  const s = mapOidcClaims(claims)
  it('applies nothing without consent', () => {
    expect(applyOidcConsent(s, {})).toEqual({})
    expect(applyOidcConsent(s, { name: false, email: false })).toEqual({})
  })
  it('applies only the ticked items', () => {
    expect(applyOidcConsent(s, { name: true })).toEqual({ name: 'Jane Example' })
    expect(applyOidcConsent({ ...s, email: '' }, { email: true })).toEqual({})
  })
})
