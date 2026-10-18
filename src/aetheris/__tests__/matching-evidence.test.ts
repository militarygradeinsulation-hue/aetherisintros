import { describe, expect, it } from 'vitest'
import { members } from '../social'
import { rankMatches, scoreMatch } from '../matching'
import type { MeProfile } from '../store'

const me = {
  industries: [], expertise: [], lookingFor: '', wantToMeet: '', focus: '',
  goals: [], canHelpWith: '',
} as unknown as MeProfile
const connector = { ...members[1]!, name: 'Verified Connector' }
const target = { ...members[0]!, mutuals: ['Verified Connector'],
  bestPath: ['You', 'Verified Connector', members[0]!.name],
  offers: [], needs: [], expertise: [], tags: [], lastInteractionDays: null,
  availability: '',
}

describe('evidence-grounded relationship matching', () => {
  it('does not score unverified listed mutual names or written paths as live trust edges', () => {
    const match = scoreMatch(me, target, { connections: [], members: [target, connector] })
    const trust = match.components.find(c => c.label === 'Trust path')
    expect(trust?.score).toBe(0)
    expect(trust?.evidence).toContain('no connecting edge')
    const timing = match.components.find(c => c.label === 'Timing')
    expect(timing?.score).toBe(0)
    const available = match.components.find(c => c.label === 'Availability')
    expect(available?.score).toBe(0)
  })
  it('recognizes an actual common contact in the recorded connection list', () => {
    const match = scoreMatch(me, target, {
      connections: [connector.id], members: [target, connector],
    })
    expect(match.components.find(c => c.label === 'Trust path')?.score).toBe(50)
    expect(match.mutualConnections).toEqual(['Verified Connector'])
  })
  it('recognizes direct connections without inventing indirect paths', () => {
    const match = scoreMatch(me, target, { connections: [target.id], members: [target] })
    expect(match.components.find(c => c.label === 'Trust path')?.score).toBe(100)
  })
  it('ranks tied candidates deterministically', () => {
    const x = { ...target, id: 'b' }
    const y = { ...target, id: 'a' }
    const result = rankMatches(me, [x, y], [])
    expect(result.map(r => r.member.id)).toEqual(['a', 'b'])
  })
})
