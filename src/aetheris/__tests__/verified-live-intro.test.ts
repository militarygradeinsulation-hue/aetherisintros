import { describe, expect, it } from 'vitest'
import { isIntroTargetId } from '@/aetheris/lib/intro-request'
import { profileToMember, type LiveProfileRow } from '../live'
import { deriveWeather } from '../domain/engine'
import type { RelationshipWeather } from '../domain/models'

const LIVE_ID = '11111111-1111-4111-8111-111111111111'
const profile: LiveProfileRow = {
  id: LIVE_ID, name: 'Example Member', initials: 'EM', title: 'Founder',
  company: 'Example Company', location: 'Midwest', focus: 'Distribution',
  thesis: '', bio: '', looking_for: 'Regional partners', can_help_with: 'Manufacturing',
  want_to_meet: '', availability: 'Available', industries: ['Manufacturing'],
  expertise: ['Distribution'], avatar_url: null, onboarded: true, created_at: '2026-01-01T00:00:00Z',
  what_i_do: 'Manufacturing partnerships', building: '', open_to: [],
  scheduling_enabled: false, verified_role: 'founder',
}
describe('live introductions and relationship trust boundaries', () => {
  it('accepts canonical member IDs, never demo slugs', () => {
    expect(isIntroTargetId(LIVE_ID)).toBe(true)
    expect(isIntroTargetId('marcus-lee')).toBe(false)
    expect(isIntroTargetId('sample-person')).toBe(false)
  })
  it('does not invent a prior conversation for a new member', () => {
    const member = profileToMember(profile, null)
    expect(member.id).toBe(LIVE_ID)
    expect(member.lastInteractionDays).toBeNull()
    expect(member.relationshipStatus).toBe('new')
    expect(member.score.trust).toBe(0)
    expect(member.score.relationshipStrength).toBe(0)
  })
  it('ignores stale 9999-day cached weather when no exchange exists', () => {
    const member = profileToMember(profile, null)
    const stale = {
      id: `w-${member.id}`, memberId: member.id, state: 'Dormant',
      recencyDays: 9999, why: 'No exchange in 9999 days',
    } as RelationshipWeather
    const weather = deriveWeather(member, [], stale)
    expect(weather.state).not.toBe('Dormant')
    expect(weather.state).toBe('Building')
    expect(weather.recencyDays).toBeNull()
    expect(weather.why).not.toContain('9999')
  })
  it('treats the old 9999-day placeholder as never exchanged', () => {
    const member = { ...profileToMember(profile, null), lastInteractionDays: 9999 }
    const weather = deriveWeather(member, [])
    expect(weather.state).toBe('Building')
    expect(weather.recencyDays).toBeNull()
    expect(weather.why).not.toContain('9999')
  })

})
