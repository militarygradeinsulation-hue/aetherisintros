import {describe,expect,it} from 'vitest';
import {buildWarmReferralCandidates} from './warm-referral-evidence';
const owner={id:'a',looking_for:'Titanium machining supplier'};
const connector={id:'b',name:'Connector',expertise:['Precision machining']};
const target={id:'c',name:'Target',can_help_with:'Titanium machining fixtures'};
describe('referral evidence',()=>{
  it('requires goal and connector topic evidence without claiming an unverified relationship',()=>{
    const result=buildWarmReferralCandidates(owner,[connector],[target]);
    expect(result[0]).toMatchObject({target_user_id:'c',connector_user_id:'b'});
    expect(result[0]?.shared_context).toContain('No verified connector-to-target relationship');
    expect(result[0]?.path_explanation).toContain('Confirm whether');
  });
  it('does not invent candidates from generic language, unknown goals or no connections',()=>{
    expect(buildWarmReferralCandidates({id:'a'},[connector],[target])).toEqual([]);
    expect(buildWarmReferralCandidates(owner,[],[target])).toEqual([]);
    expect(buildWarmReferralCandidates({id:'a',looking_for:'business services help'},[connector],[target])).toEqual([]);
    expect(buildWarmReferralCandidates(owner,[{id:'d',expertise:['Accounting']}],[target])).toEqual([]);
  });
  it('does not suggest self or already-connected targets',()=>{
    expect(buildWarmReferralCandidates(owner,[connector],[owner,connector])).toEqual([]);
  });
});
