import { describe, expect, it } from 'vitest'
import { basicEntitlements, membershipPageRequirement, parseEntitlements } from '../member-entitlements'

describe('three membership levels', () => {
  it('Basic allows profile and browsing but no networking or business actions', () => {
    expect(basicEntitlements.networking).toBe(false)
    expect(basicEntitlements.business).toBe(false)
    expect(basicEntitlements.blackCard).toBe(false)
    expect(membershipPageRequirement('people')).toBeNull()
    expect(membershipPageRequirement('workspace', 'profile')).toBeNull()
    expect(membershipPageRequirement('messages')).toBe('networking')
    expect(membershipPageRequirement('intros')).toBe('networking')
    expect(membershipPageRequirement('workspace', 'crm')).toBe('business')
  })
  it('LinkedIn verified networking does not imply paid business tools or a black card', () => {
    const e = parseEntitlements({ level: 'linkedin_verified', networking: true, business: false, blackCard: false, linkedinVerified: true })
    expect(e.networking).toBe(true)
    expect(e.business).toBe(false)
    expect(e.blackCard).toBe(false)
  })
  it('paid membership grants member features and black card, not an admin role', () => {
    const e = parseEntitlements({ level: 'paid', networking: true, business: true, blackCard: true, linkedinVerified: false, isAdmin: true })
    expect(e.business).toBe(true)
    expect(e.blackCard).toBe(true)
    expect(e).not.toHaveProperty('isAdmin')
  })
  it('rejects profile URLs or incomplete client flags as entitlement evidence', () => {
    expect(() => parseEntitlements({ linkedin_url: 'https://www.linkedin.com/in/owner' })).toThrow()
    expect(() => parseEntitlements({ level: 'paid' })).toThrow()
  })
})