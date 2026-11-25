import { describe, expect, it } from 'vitest';
import { buildExecutiveBrief, type BriefInputs, type Slice } from './executive-brief';
const now = Date.parse('2026-11-24T12:00:00Z');
const ready = <T>(rows: T[] = []): Slice<T> => ({ rows, state: 'ready', limited: false });
const empty = (): BriefInputs => ({ tasks: ready(), opportunities: ready(), meetings: ready(), introductions: ready(), contacts: ready(), connections: ready(), notes: ready(), mindprint: 'not-recorded' });
describe('private executive brief', () => {
  it('ranks recorded overdue tasks before incomplete opportunities and excludes completed tasks', () => {
    const brief = buildExecutiveBrief({ ...empty(), tasks: ready([
      {id:'done',title:'Finished',due_at:'2026-11-23',priority:'high',status:'done'},
      {id:'open',title:'Call supplier',due_at:'2026-11-23',priority:'high',status:'open'},
    ]), opportunities: ready([{id:'o',name:'Partner deal',next_action:'',expected_close:null,status:'open',detail:'',person_id:null,source:'',updated_at:'2026-11-22'}]) },now);
    expect(brief.actions.map(a=>a.recordId)).toEqual(['open','o']);
    expect(brief.actions[1]?.missingEvidence).toContain('Next action');
    expect(brief.actions[1]?.missingEvidence).toContain('Recorded need or context');
  });
  it('distinguishes a failed source from empty data and ignores invalid dates', () => {
    const result = buildExecutiveBrief({ ...empty(), contacts: { state:'unavailable', rows:[{id:'c',full_name:'not authorized',company_name:'',last_activity_at:'2020-01-01'}],limited:false },
      meetings:ready([{id:'bad',title:'Bad',scheduled_for:'not a date',intro_request_id:null,ended_at:null}]), mindprint:'unavailable' },now);
    expect(result.actions).toEqual([]);
    expect(result.sources.find(s=>s.key==='contacts')).toMatchObject({state:'unavailable',sample:null});
    expect(result.mindprint).toBe('unavailable');
  });
  it('suggests only participant-side review, not outreach or claims about trust', () => {
    const result=buildExecutiveBrief({...empty(),introductions:ready([
      {id:'pending',created_at:'2026-11-24',status:'requested',requester_opt_in:true,member_opt_in:false},
      {id:'accepted',created_at:'2026-11-24',status:'accepted',requester_opt_in:true,member_opt_in:true}
    ]),contacts:ready([{id:'stale',full_name:'Contact',company_name:'Company',last_activity_at:'2026-09-01'},{id:'unknown',full_name:'Unknown',company_name:'',last_activity_at:null}])},now);
    expect(result.actions.map(a=>a.recordId)).toEqual(['pending','stale']);
    expect(result.actions[1]?.reason).toContain('recorded CRM activity');
  });
  it('surfaces an upcoming meeting and labels forecast dates without a revenue claim', () => {
    const result=buildExecutiveBrief({...empty(),meetings:ready([{id:'m',title:'Planning',scheduled_for:'2026-11-25T10:00:00Z',intro_request_id:'i',ended_at:null}]),
      opportunities:ready([{id:'o',name:'Forecast',next_action:'Review',expected_close:'2026-11-25',status:'open',detail:'Need',person_id:'p',source:'meeting',updated_at:'2026-11-24'}])},now);
    expect(result.actions.map(a=>a.recordId)).toEqual(['m','o']);
    expect(result.actions[1]?.reason).toContain('forecast');
  });
});
