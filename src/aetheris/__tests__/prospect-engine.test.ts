import { describe,expect,it,vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { canTransition,draftNote,initialWorkflow,isDuplicate,openManualProfile,reviewNote,scoreProspect,starter } from '../prospect/core'
import { validateProspectFile,validateProspectGrid } from '../prospect/upload'
import type { CrmPerson,CrmCompany } from '../crm/types'
const person:CrmPerson={id:'p',fullName:'Alex Smith',email:'alex@example.test',phone:'',title:'CEO',companyName:'Actual Co',companyId:'c',lifecycle:'Lead',location:'Austin',linkedinUrl:'https://www.linkedin.com/in/alex-smith',source:'Manual',notes:'',tags:[],memberId:null,profileId:null,directoryContactId:null,lastActivityAt:null,archived:false,createdAt:'',updatedAt:''}
const company:CrmCompany={id:'c',name:'Actual Co',domain:'',industry:'industrial',employees:'11-50',revenueBand:'1M-5M',location:'Austin',website:'',phone:'',notes:'',directoryCompanyId:null,networkCompanyId:null,archived:false,createdAt:'',updatedAt:''}
describe('deterministic prospect fit',()=>{
  it('scores a complete matching configured ICP at 100',()=>{expect(scoreProspect({...starter,locations:'Austin',employees:'11-50',revenue:'1M-5M',keywords:'CEO'},person,company).score).toBe(100)})
  it('never fills missing firmographics or treats them as matches',()=>{const result=scoreProspect(starter,person);expect(result.score).toBe(55);expect(result.confidence).toBe(55);expect(result.breakdown.find(b=>b.label==='Industry')?.known).toBe(false)})
  it('does not infer verified evidence, timing or readiness from CRM fields',()=>{const result=scoreProspect(starter,person,company);expect(result.readiness.ready).toBe(false);expect(result.readiness.verifiedEvidence).toBe(0)})
  it('excludes current clients',()=>{expect(scoreProspect(starter,{...person,lifecycle:'Customer'},company).score).toBe(0)})
  it('allows the owner to disable client exclusion',()=>{expect(scoreProspect({...starter,excludeClients:false},{...person,lifecycle:'Customer'},company).score).toBe(100)})
  it('excludes already contacted people',()=>{expect(scoreProspect(starter,person,company,true).excluded).toBe('Already contacted')})
  it('applies editable disqualifiers',()=>{expect(scoreProspect({...starter,disqualifiers:'Actual Co'},person,company).score).toBe(0)})
  it('does not match CEO within an unrelated word',()=>{expect(scoreProspect({...starter,industries:''},{...person,title:'ceology'}).score).toBe(0)})
  it('returns zero when no criteria exist',()=>{expect(scoreProspect({...starter,titles:'',industries:''},person,company).score).toBe(0)})
})
describe('identity and safe manual workflow',()=>{
  it('deduplicates email ignoring case',()=>{expect(isDuplicate({email:'ALEX@example.test'},[person])).toBe(true)})
  it('deduplicates canonical LinkedIn profile URLs',()=>{expect(isDuplicate({linkedinUrl:'https://linkedin.com/in/alex-smith/'},[person])).toBe(true)})
  it('deduplicates name plus company without an email',()=>{expect(isDuplicate({fullName:' alex smith ',companyName:'Actual Co'},[person])).toBe(true)})
  it('does not merge names at different companies',()=>{expect(isDuplicate({fullName:'Alex Smith',companyName:'Other Co'},[person])).toBe(false)})
  it('cannot mark invited before approval',()=>{expect(canTransition('new','invited')).toBe(false);expect(canTransition('draft','invited')).toBe(false);expect(canTransition('approved','invited')).toBe(true)})
  it('cannot skip invited to acceptance or reopen a declined prospect',()=>{expect(canTransition('approved','accepted')).toBe(false);expect(canTransition('not_appropriate','draft')).toBe(false)})
  it('permits approved notes to return to review after editing',()=>{expect(canTransition('approved','draft')).toBe(true)})
  it('opens only a profile and leaves invitation status unchanged',()=>{const open=vi.fn();const state={...initialWorkflow};expect(openManualProfile(person.linkedinUrl,open)).toBe(true);expect(open).toHaveBeenCalledTimes(1);expect(open.mock.calls[0]?.[1]).toBe('_blank');expect(state.status).toBe('new')})
  it('rejects executable and non-profile URLs',()=>{const open=vi.fn();expect(openManualProfile('javascript:alert(1)',open)).toBe(false);expect(openManualProfile('https://evil.test/in/a',open)).toBe(false);expect(open).not.toHaveBeenCalled()})
  it('drafts only from supplied data with no invented experience',()=>{const note=draftNote(person,{...starter,valueOffer:'I can share useful operating checklists.'});expect(note).toContain('Actual Co');expect(note.length).toBeLessThanOrEqual(300);expect(reviewNote(note)).toEqual([]);expect(reviewNote('We met last week')).not.toEqual([])})
})
describe('defensive CRM upload',()=>{
  it('rejects files above 2MB',()=>{expect(()=>validateProspectFile({name:'a.csv',size:2097153})).toThrow()})
  it('rejects non CSV/TSV files',()=>{expect(()=>validateProspectFile({name:'a.exe',size:1})).toThrow()})
  it('rejects more than 500 records',()=>{expect(()=>validateProspectGrid(Array.from({length:502},()=>['Name']))).toThrow()})
  it('rejects malformed dimensions and oversized cells',()=>{expect(()=>validateProspectGrid([['a','b'],['one']])).toThrow();expect(()=>validateProspectGrid([['a'],['x'.repeat(10001)]])).toThrow()})
  it('accepts a bounded rectangular file',()=>{expect(()=>validateProspectGrid([['Name','Company'],['Alex','Actual Co']])).not.toThrow()})
})
describe('persisted role and ownership boundary',()=>{
  const sql=readFileSync(new URL('../../../drizzle/migrations/0093_private_icp_workspace.sql',import.meta.url),'utf8')
  it('requires the existing server-validated admin role',()=>{expect(sql).toContain("u IS NULL OR NOT public.has_role(u,'admin')");expect(sql).toContain("NEW.user_id<>auth.uid()")})
  it('looks up the canonical person with the requesting owner',()=>{expect(sql).toContain('WHERE id=person AND owner_id=u AND NOT archived')})
  it('serializes writes and rejects stale versions',()=>{expect(sql).toContain('pg_advisory_xact_lock');expect(sql).toContain('coalesce(v,0)<>p_expected')})
  it('records invitation contact only after explicit status transitions',()=>{expect(sql).toContain("b<>a AND b=ANY(ARRAY['invited','accepted','follow_up'])");expect(sql).toContain('INSERT INTO public.crm_activities');expect(sql).toContain('INSERT INTO public.entity_events')})
})