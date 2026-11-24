import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Database } from '@/integrations/supabase/types';
import { approvedReportActionSchema, briefTaskPreview } from '@/aetheris/domain/reviewed-business-actions';
import { buildExecutiveBrief, type BriefInputs, type Slice } from '@/aetheris/domain/executive-brief';
import { saveReportAction, saveBriefTask } from './reviewed-business-actions.server';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const COMPANY='33333333-3333-4333-8333-333333333333';
const PIPELINE='44444444-4444-4444-8444-444444444444';
const STAGE='55555555-5555-4555-8555-555555555555';
const OPP='66666666-6666-4666-8666-666666666666';
const report=approvedReportActionSchema.parse({owner:OWNER,approved:true,reportReference:'GR-1',company:'Example',finding:{id:'f1',title:'Review quotes',evidence:'Open quotes lack next steps',proposedAction:'Contact quote owners after review',metric:'Next step completeness'},kind:'task',companyId:null,assignee:'Sales manager'});
const opp={id:OPP,name:'Recorded opportunity',next_action:'',expected_close:null,status:'open',detail:'',person_id:null,source:'',updated_at:'2026-11-24'};

type Row=Record<string,unknown>;
function fixture({member=true,business=true,ownedCompany=true}={}) {
  const reads:{path:string;method:string;url:URL;body:Row|null}[]=[];
  const records=new Map<string,Row>();
  const db=createClient<Database>('https://approved-action-test.supabase.co','fixture-key',{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:async (input,init)=>{
      const url=new URL(String(input));const path=url.pathname.split('/').at(-1)!;
      const method=init?.method??'GET';
      const body=typeof init?.body==='string'?JSON.parse(init.body) as Row:null;
      reads.push({path,method,url,body});
      let value:unknown=[];
      if(path==='is_live_member')value=member;
      else if(path==='my_member_entitlements')value=business?{level:'paid',business:true,networking:true,blackCard:true,linkedinVerified:false}:{level:'basic',business:false,networking:false,blackCard:false,linkedinVerified:false};
      else if(path==='crm_companies')value=ownedCompany?[{id:COMPANY}]:[];
      else if(path==='crm_pipelines')value=[{id:PIPELINE}];
      else if(path==='crm_pipeline_stages')value=[{id:STAGE,name:'Discovery'}];
      else if(path==='crm_tasks'||path==='crm_opportunities'){
        if(method==='POST'&&body){
          records.set(String(body.id),body);value={id:body.id};
        }else if(url.searchParams.has('id')){
          const id=url.searchParams.get('id')!.replace('eq.','');
          const found=records.get(id);value=found&&url.searchParams.get('owner_id')==='eq.'+found.owner_id?[found]:[];
        }else if(path==='crm_opportunities')value=[opp];
      }
      return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
    }}
  });
  return {db,reads,records};
}
const writes=(f:ReturnType<typeof fixture>)=>f.reads.filter(r=>r.method==='POST'&&['crm_tasks','crm_opportunities'].includes(r.path));
describe('approved business action write authority',()=>{
  it('denies stale account and revoked membership before any record write',async()=>{
    const f=fixture();
    await expect(saveReportAction(f.db,OTHER,report)).rejects.toThrow('Account changed');
    expect(f.reads).toHaveLength(0);
    const blocked=fixture({member:false});
    await expect(saveReportAction(blocked.db,OWNER,report)).rejects.toThrow('membership');
    expect(writes(blocked)).toHaveLength(0);
    const basic=fixture({business:false});
    await expect(saveReportAction(basic.db,OWNER,report)).rejects.toThrow('Business workspace access');
    expect(writes(basic)).toHaveLength(0);
  });
  it('requires an owner-scoped company and never overwrites a previously saved finding',async()=>{
    const foreign=fixture({ownedCompany:false});
    await expect(saveReportAction(foreign.db,OWNER,{...report,companyId:COMPANY})).rejects.toThrow('Selected company');
    expect(writes(foreign)).toHaveLength(0);
    const f=fixture();
    const first=await saveReportAction(f.db,OWNER,{...report,companyId:COMPANY});
    const second=await saveReportAction(f.db,OWNER,{...report,companyId:COMPANY,finding:{...report.finding,title:'Edited source'}});
    expect(second).toMatchObject({id:first.id,existing:true});
    expect(writes(f)).toHaveLength(1);
    expect(writes(f)[0]?.body).toMatchObject({owner_id:OWNER,company_id:COMPANY,assignee:'Sales manager',status:'open'});
    expect(writes(f)[0]?.body?.detail).toContain('User-supplied Golden Report');
    expect(f.reads.find(r=>r.path==='crm_companies')?.url.searchParams.get('owner_id')).toBe('eq.'+OWNER);
  });
  it('saves only an unquantified opportunity in the existing owner pipeline',async()=>{
    const f=fixture();
    const result=await saveReportAction(f.db,OWNER,{...report,kind:'opportunity'});
    expect(result.kind).toBe('opportunity');
    expect(writes(f)[0]?.body).toMatchObject({owner_id:OWNER,pipeline_id:PIPELINE,stage_id:STAGE,amount:0,probability:0,value_state:'unquantified',status:'open',source:'User-supplied Golden Report'});
    expect(f.reads.find(r=>r.path==='crm_pipeline_stages')?.url.searchParams.get('owner_id')).toBe('eq.'+OWNER);
  });
  it('revalidates a current brief before saving an internal task and rejects a modified preview',async()=>{
    const ready=<T>(rows:T[]=[]):Slice<T>=>({rows,state:'ready',limited:false});
    const input:BriefInputs={tasks:ready(),opportunities:ready([opp]),meetings:ready(),introductions:ready(),contacts:ready(),connections:ready(),notes:ready(),mindprint:'not-recorded'};
    const action=buildExecutiveBrief(input).actions[0]!;
    const preview=briefTaskPreview(action)!;
    const f=fixture();
    const approval={owner:OWNER,approved:true as const,source:preview.source,recordId:preview.recordId,reviewedText:preview.detail};
    await expect(saveBriefTask(f.db,OWNER,{...approval,reviewedText:'Changed without reviewing'})).rejects.toThrow('source changed');
    expect(writes(f)).toHaveLength(0);
    const saved=await saveBriefTask(f.db,OWNER,approval);
    expect(saved.kind).toBe('task');
    expect(writes(f)[0]?.body).toMatchObject({owner_id:OWNER,opportunity_id:OPP});
  });
});
