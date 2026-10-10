import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { profileToMember, provenStrengthOf, type LiveProfileRow } from '../live'
import { knownInteractionDays } from '../lib/engine'

const row: LiveProfileRow = {
  id: 'u2', name: 'Pat Lee', initials: 'PL', title: 'COO', company: 'Acme', location: '', focus: '', thesis: '', bio: '',
  looking_for: '', can_help_with: '', want_to_meet: '', availability: '', industries: [], expertise: [], avatar_url: null,
  onboarded: true, created_at: '2026-01-01T00:00:00Z', what_i_do: '', building: '', open_to: [], scheduling_enabled: false,
}

describe('live relationship evidence', () => {
  it('never implies a recent or strong relationship without evidence', () => {
    const m = profileToMember(row, null)
    expect(knownInteractionDays(m)).toBeNull()
    expect(m.relationshipStatus).toBe('unknown')
    expect(m.score.trust).toBe(0)
    expect(m.score.relationshipStrength).toBe(0)
    expect(m.relationshipEvidence?.provenStrength).toBeNull()
    expect(m.introState).toBe('recommended')
  })

  it('derives strength and state from messages, connections and intros', () => {
    const base = {
      lastInteractionAt: new Date().toISOString(), lastInteractionDays: 2, messageCount: 4,
      directConnection: true, mutualConnections: 1,
      intros: [{ id: 'i1', direction: 'sent' as const, status: 'connected', createdAt: '', acceptedAt: '', outcome: { stage: 'met', category: null, occurredOn: '' } }],
    }
    const provenStrength = provenStrengthOf(base)
    expect(provenStrength).toBe(12 + 10 + 15 + 20 + 10 + 4)
    const m = profileToMember(row, null, { ...base, provenStrength }, ['Sam Roe'])
    expect(m.lastInteractionDays).toBe(2)
    expect(m.relationshipStatus).toBe('strong')
    expect(m.introState).toBe('conversing')
    expect(m.bestPath).toEqual(['You', 'Sam Roe', 'Pat Lee'])
  })

  it('caps intro-only evidence below the dormant/at-risk thresholds', () => {
    const s = provenStrengthOf({ lastInteractionAt: null, lastInteractionDays: null, messageCount: 0, directConnection: true, mutualConnections: 9, intros: [{ id: 'i', direction: 'received', status: 'accepted', createdAt: '', acceptedAt: null, outcome: { stage: 'outcome', category: null, occurredOn: '' } }] })
    expect(s).toBeLessThan(65)
  })
})
