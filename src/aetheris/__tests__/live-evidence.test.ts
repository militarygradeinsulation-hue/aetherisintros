import { describe, expect, it, vi } from 'vitest'
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))
import { profileToMember, type LiveProfileRow, type RelationshipEvidence } from '../live'
import { knownInteractionDays } from '../lib/engine'
const row: LiveProfileRow = {
  id:'u2',name:'Pat Lee',initials:'PL',title:'COO',company:'Acme',location:'',focus:'',thesis:'',bio:'',
  looking_for:'',can_help_with:'',want_to_meet:'',availability:'',industries:[],expertise:[],avatar_url:null,
  onboarded:true,created_at:'2026-01-01T00:00:00Z',what_i_do:'',building:'',open_to:[],scheduling_enabled:false,verified_role:null,
}
const baseline: RelationshipEvidence = {member_id:'u2',message_count:0,last_message_at:null,introduction_count:0,accepted_intro_count:0,joined_meetings:0,last_meeting_at:null,connection_saved:false}
describe('live relationship evidence through the canonical RPC shape',()=>{
  it('never implies recent contact or earned trust without evidence',()=>{
    const m=profileToMember(row,null)
    expect(knownInteractionDays(m)).toBeNull()
    expect(m.score.trust).toBe(0)
    expect(m.score.relationshipStrength).toBe(0)
    expect(m.bestPath).toEqual([])
    expect(m.introState).toBe('recommended')
  })
  it('derives relationship state and recency from recorded exchanges',()=>{
    const m=profileToMember(row,null,{...baseline,message_count:4,joined_meetings:2,accepted_intro_count:1,introduction_count:1,last_message_at:new Date(Date.now()-2*86400000).toISOString()})
    expect(knownInteractionDays(m)).toBe(2)
    expect(m.relationshipStatus).toBe('strong')
    expect(m.score.trust).toBeGreaterThan(0)
    expect(m.score.relationshipStrength).toBeGreaterThan(profileToMember(row,null).score.relationshipStrength)
    expect(m.introState).toBe('introduced')
  })
  it('does not infer a stale exchange from an accepted introduction alone',()=>{
    const m=profileToMember(row,null,{...baseline,introduction_count:1,accepted_intro_count:1,connection_saved:true})
    expect(knownInteractionDays(m)).toBeNull()
    expect(m.score.relationshipStrength).toBeLessThan(65)
    expect(m.radar).not.toBe('at_risk')
    expect(m.radar).not.toBe('dormant')
  })
})
