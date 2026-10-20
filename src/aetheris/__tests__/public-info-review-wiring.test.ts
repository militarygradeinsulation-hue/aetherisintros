import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { reviewedPublicProfilePatch } from '../public-info-review'
import type { PublicSuggestion } from '../public-info'

const mk = (field: PublicSuggestion['field'], value: string): PublicSuggestion =>
  ({ field, value, quote: 'Sourced statement about Jane', sourceUrl: 'https://example.test/jane', sourceTitle: 'Profile' })

describe('reviewed own-profile public information', () => {
  const items = [
    mk('title', 'CEO'), mk('company', 'Acme'), mk('location', 'Chicago'),
    mk('thesis', 'Building safer factories'), mk('whatIDo', 'I make industrial tools'),
    mk('building', 'Acme HQ'),
  ]

  it('never alters a profile without a selection', () => {
    expect(reviewedPublicProfilePatch(items, new Set())).toEqual({})
  })

  it('maps only consent-selected, supported fields and never the unsupported building suggestion', () => {
    expect(reviewedPublicProfilePatch(items, new Set([0, 3, 5]))).toEqual({
      title: 'CEO', headline: 'Building safer factories',
    })
    expect(reviewedPublicProfilePatch(items, new Set([1, 2, 4]))).toEqual({
      company: 'Acme', location: 'Chicago', about: 'I make industrial tools',
    })
    expect(reviewedPublicProfilePatch(items, new Set([5]))).toEqual({})
  })

  it('ignores invalid indexes rather than applying anything else', () => {
    expect(reviewedPublicProfilePatch(items, new Set([-1, 300]))).toEqual({})
  })

  it('keeps search opt-in, source evidence, human review, and manual LinkedIn actions wired into the existing importer', () => {
    const ui = readFileSync(new URL('../linkedin-import-ui.tsx', import.meta.url), 'utf8')
    expect(ui).toContain("findPublicInformation({ data: { confirmed: true } })")
    expect(ui).toContain('publicConfirmed')
    expect(ui).toContain("Apply selected public fields")
    expect(ui).toContain('reviewedPublicProfilePatch(publicMatches, pickedPublic)')
    expect(ui).toContain('item.quote')
    expect(ui).toContain('item.sourceUrl')
    expect(ui).not.toMatch(/sendLinkedInInvite|sendConnectionRequest|autoConnectLinkedIn/)
  })
})
