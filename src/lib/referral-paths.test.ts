import { describe, expect, it } from 'vitest'
import { verifiedReferralPath } from './referral-paths'

const connectors = [
  { id: 'connector-1', name: 'Taylor Smith' },
  { id: 'connector-2', name: 'Morgan Lee' },
]
const targets = [
  { id: 'target-1', name: 'Casey Chen' },
  { id: 'target-2', name: 'Jordan Patel' },
]
const observed = [
  { follower_id: 'connector-1', followee_id: 'target-1' },
]

describe('warm referral identity and relationship evidence', () => {
  it('accepts a path only when the exact connector-to-target edge exists', () => {
    expect(verifiedReferralPath(
      { connector_name: 'Taylor Smith', target_name: 'Casey Chen' },
      connectors, targets, observed,
    )).toEqual({ connector: connectors[0], target: targets[0] })
    expect(verifiedReferralPath(
      { connector_name: 'Taylor Smith', target_name: 'Jordan Patel' },
      connectors, targets, observed,
    )).toBeNull()
  })
  it('rejects an AI-invented connector or missing relationship evidence', () => {
    expect(verifiedReferralPath(
      { connector_name: 'Nobody', target_name: 'Casey Chen' },
      connectors, targets, observed,
    )).toBeNull()
    expect(verifiedReferralPath(
      { connector_name: 'Taylor Smith', target_name: 'Casey Chen' },
      connectors, targets, [],
    )).toBeNull()
  })
  it('does not guess identities with duplicate display names', () => {
    expect(verifiedReferralPath(
      { connector_name: 'Taylor Smith', target_name: 'Casey Chen' },
      connectors, [...targets, { id: 'target-3', name: 'Casey Chen' }], observed,
    )).toBeNull()
  })
  it('ignores harmless name case or surrounding whitespace differences', () => {
    expect(verifiedReferralPath(
      { connector_name: '  taylor smith ', target_name: 'CASEY CHEN' },
      connectors, targets, observed,
    )?.target.id).toBe('target-1')
  })
})
