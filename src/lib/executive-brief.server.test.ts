import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Database } from '@/integrations/supabase/types';
import { readExecutiveBrief } from './executive-brief.server';

const owner='11111111-1111-4111-8111-111111111111';
const now=Date.parse('2026-11-24T12:00:00Z');
const paid={level:'paid',business:true,networking:true,blackCard:true,linkedinVerified:false};
function database({member=true,entitlements=paid, failContacts=false}={}) {
  const requests: { url: URL; method: string }[] = [];
  const db=createClient<Database>('https://brief-test.supabase.co','test-key',{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:async (input,init)=>{
      const url=new URL(String(input));
      requests.push({url,method:init?.method || 'GET'});
      const path=url.pathname.split('/').at(-1);
      if (path==='crm_people' && failContacts) return new Response(JSON.stringify({message:'permission denied'}),{status:403});
      const data = path==='is_live_member' ? member : path==='my_member_entitlements' ? entitlements : [];
      return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    }}
  });
  return {db,requests};
}
describe('executive brief authorization',()=>{
  it('rejects a nonmember before reading any record',async()=>{
    const {db,requests}=database({member:false});
    await expect(readExecutiveBrief(db,owner,now)).rejects.toThrow('membership');
    expect(requests.map(r=>r.url.pathname)).toEqual(['/rest/v1/rpc/is_live_member']);
  });
  it('honors business entitlements before accessing private workspaces',async()=>{
    const {db,requests}=database({entitlements:{level:'basic',business:false,networking:false,blackCard:false,linkedinVerified:false}});
    await expect(readExecutiveBrief(db,owner,now)).rejects.toThrow('Business workspace access');
    expect(requests).toHaveLength(2);
  });
  it('bounds every read and explicitly scopes every private record to the current owner or participant',async()=>{
    const {db,requests}=database({failContacts:true});
    const brief=await readExecutiveBrief(db,owner,now);
    const byTable=(table:string)=>requests.filter(r=>r.url.pathname.endsWith('/'+table)).map(r=>r.url.searchParams);
    for(const table of ['crm_tasks','crm_opportunities','crm_people']) expect(byTable(table)[0]?.get('owner_id')).toBe('eq.'+owner);
    expect(byTable('meetings')[0]?.get('meeting_participants.user_id')).toBe('eq.'+owner);
    expect(byTable('intro_requests')[0]?.get('target_user_id')).toBe('eq.'+owner);
    for(const table of ['memories','relationships']) for(const q of byTable(table)) expect(q.get('user_id')).toBe('eq.'+owner);
    expect(byTable('memories').every(q=>q.get('scope')==='eq.private')).toBe(true);
    expect(byTable('crm_people')[0]?.get('deleted_at')).toBe('is.null');
    expect(requests.filter(r=>r.method==='GET').every(r=>Number(r.url.searchParams.get('limit'))>0 && Number(r.url.searchParams.get('limit'))<=13)).toBe(true);
    expect(brief.sources.find(s=>s.key==='contacts')).toMatchObject({state:'unavailable',sample:null});
    expect(brief.mindprint).toBe('not-recorded');
  });
});
