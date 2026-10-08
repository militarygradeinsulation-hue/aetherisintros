import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { summariseCoverage } from '../company'

describe('summariseCoverage', () => {
  it('leads with relationships nobody holds any more', () => {
    const s = summariseCoverage([{ coverage: 'at_risk' }, { coverage: 'single_owner' }, { coverage: 'single_owner' }, { coverage: 'covered' }])
    expect(s).toMatchObject({ total: 4, atRisk: 1, singleOwner: 2, covered: 1 })
    expect(s.headline).toBe('1 relationship no longer held by anyone here, and 2 more depend on one person.')
  })
  it('names key-person risk when nothing is lost yet', () => {
    expect(summariseCoverage([{ coverage: 'single_owner' }]).headline).toBe('1 relationship depends on one person.')
    expect(summariseCoverage([{ coverage: 'single_owner' }, { coverage: 'single_owner' }]).headline).toBe('2 relationships depend on one person.')
  })
  it('says so when the network is well covered or empty', () => {
    expect(summariseCoverage([{ coverage: 'covered' }]).headline).toMatch(/more than one person/)
    expect(summariseCoverage([]).headline).toMatch(/No relationships shared/)
  })
})
