import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireBusinessWorkspace } from './business-workspace-access.server';
import { readExecutiveBrief } from './executive-brief.server';
import { approvedActionId, reportActionPreview, briefTaskPreview, type ApprovedReportAction, type ApprovedBriefTask } from '@/aetheris/domain/reviewed-business-actions';

type Db=SupabaseClient<Database>;
const accountCheck=(expected:string,actual:string)=>{if(expected!==actual)throw new Error('Account changed. Review the action again.');};
async function existingTask(db:Db,owner:string,id:string) {
  const result=await db.from('crm_tasks').select('id,detail').eq('owner_id',owner).eq('id',id).maybeSingle();
  if(result.error)throw new Error('Could not check existing CRM task.');
  return result.data;
}
async function existingOpportunity(db:Db,owner:string,id:string) {
  const result=await db.from('crm_opportunities').select('id,detail').eq('owner_id',owner).eq('id',id).maybeSingle();
  if(result.error)throw new Error('Could not check existing CRM opportunity.');
  return result.data;
}
const receipt=(id:string,kind:'task'|'opportunity',existing:boolean)=>({id,kind,existing,receipt:existing?`A CRM ${kind} for this finding or source already exists. It was not overwritten.`:`CRM ${kind} saved.`});
async function storeTask(db:Db,owner:string,id:string,payload:Database['public']['Tables']['crm_tasks']['Insert']) {
  if(await existingTask(db,owner,id))return receipt(id,'task',true);
  const result=await db.from('crm_tasks').insert({...payload,id,owner_id:owner}).select('id').single();
  if(result.error?.code==='23505' && await existingTask(db,owner,id))return receipt(id,'task',true);
  if(result.error||result.data?.id!==id)throw new Error('Task save was not confirmed. Retry the same approved action.');
  return receipt(id,'task',false);
}
/** Only explicit user approval endpoints call these writes. The language model
 * has no write tool for these actions; RLS and current membership remain in force.
 */
export async function saveReportAction(db:Db,userId:string,input:ApprovedReportAction) {
  accountCheck(input.owner,userId);
  await requireBusinessWorkspace(db);
  const preview=reportActionPreview(input);
  const id=await approvedActionId(userId,'golden-report',JSON.stringify([input.reportReference,input.finding.id]),input.kind);
  if(input.companyId) {
    const lookup=await db.from('crm_companies').select('id').eq('owner_id',userId).eq('id',input.companyId).eq('archived',false).maybeSingle();
    if(lookup.error||lookup.data?.id!==input.companyId)throw new Error('Selected company is not available in your CRM.');
  }
  if(input.kind==='task')return storeTask(db,userId,id,{title:preview.title,detail:preview.detail,company_id:input.companyId,assignee:input.assignee,status:'open',priority:'medium'});
  if(await existingOpportunity(db,userId,id))return receipt(id,'opportunity',true);
  // Use only the existing owner-scoped active default pipeline; do not silently
  // create a pipeline or assign a deal to a foreign account.
  const pipeline=await db.from('crm_pipelines').select('id').eq('owner_id',userId).eq('archived',false).eq('is_default',true).order('position').limit(1).maybeSingle();
  if(pipeline.error||!pipeline.data)throw new Error('Open CRM to initialize your default pipeline before approving this opportunity.');
  const stage=await db.from('crm_pipeline_stages').select('id,name').eq('owner_id',userId).eq('pipeline_id',pipeline.data.id).eq('is_won',false).eq('is_lost',false).order('position').limit(1).maybeSingle();
  if(stage.error||!stage.data)throw new Error('An active pipeline stage is required.');
  const result=await db.from('crm_opportunities').insert({
    id,owner_id:userId,name:preview.title,detail:preview.detail,company_id:input.companyId,
    pipeline_id:pipeline.data.id,stage_id:stage.data.id,stage_name:stage.data.name,
    source:'User-supplied Golden Report',next_action:input.finding.proposedAction,amount:0,value_state:'unquantified',
    probability:0,status:'open',
  }).select('id').single();
  if(result.error?.code==='23505'&&await existingOpportunity(db,userId,id))return receipt(id,'opportunity',true);
  if(result.error||result.data?.id!==id)throw new Error('Opportunity save was not confirmed. Retry the same approved action.');
  return receipt(id,'opportunity',false);
}
export async function saveBriefTask(db:Db,userId:string,input:ApprovedBriefTask) {
  accountCheck(input.owner,userId);
  // Rebuild the bounded current brief using the authenticated member's permissions.
  const brief=await readExecutiveBrief(db,userId);
  const id=await approvedActionId(userId,'executive-brief',JSON.stringify([input.source,input.recordId]),'task');
  if(await existingTask(db,userId,id))return receipt(id,'task',true);
  const action=brief.actions.find(a=>a.source===input.source&&a.recordId===input.recordId);
  const preview=action&&briefTaskPreview(action);
  if(!preview||preview.detail!==input.reviewedText)throw new Error('The source changed or is no longer available. Refresh and review the new brief.');
  return storeTask(db,userId,id,{
    title:preview.title,detail:preview.detail,status:'open',priority:'medium',
    ...(input.source==='CRM opportunity'?{opportunity_id:input.recordId}:{}),
    ...(input.source==='CRM contact'?{person_id:input.recordId}:{}),
  });
}
