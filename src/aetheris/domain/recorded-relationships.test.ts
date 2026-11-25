import {describe,expect,it} from 'vitest';
import {summarizeRecordedRelationships} from './recorded-relationships';
describe('relationship outcome reporting',()=>{
  it('deduplicates introduction IDs and keeps the most recent recorded outcome attribution',()=>{
    const row={intro_request_id:'a',stage:'outcome',attribution:'direct',outcome_category:'customer',created_at:'2026-10-01'};
    expect(summarizeRecordedRelationships([row,{...row,attribution:'influenced',created_at:'2026-10-02'},{...row,intro_request_id:'b',stage:'met'},{...row,intro_request_id:'c',created_at:'invalid'}])).toEqual({recordedOutcomes:1,direct:0,influenced:1,contextual:0});
  });
  it('does not claim financial return from self-reported outcome bands',()=>{
    expect(summarizeRecordedRelationships([])).toEqual({recordedOutcomes:0,direct:0,influenced:0,contextual:0});
  });
});
