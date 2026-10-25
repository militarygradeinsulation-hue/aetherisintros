import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireAuthContract } from './auth-gate';
import { routeLlmChat } from './aiGateway.server';
import { findBusinessTool } from '@/features/business-tools/catalog';
import { validateToolInput, type ToolDraft } from '@/features/business-tools/drafts';

import { captureSpecterWebsite } from './specter.server';
import { collectToolEvidence, evidenceReport, generationPrompt } from './businessTools.engine';
import { generateBusinessImage } from './businessTools.images.server';

const requestSchema = z.object({ toolId: z.string().max(80), inputs: z.record(z.string(), z.string().max(16000)) });
async function memberProfile(context: any) {
  const {data,error}=await context.supabase.from('profiles').select('id,name,company,title,what_i_do').eq('id',context.userId).maybeSingle();
  if(error) throw new Error('Your profile could not be loaded. Please try again.');
  if(!data) throw new Error('Create your Ask Intros profile before using Business Tools.');
  return data;
}
export const loadBusinessTools = createServerFn({method:'GET'}).middleware([requireAuthContract]).handler(async({context})=>{
  const c=context as any;const profile=await memberProfile(c);
  const {data,error}=await c.supabase.from('business_tool_drafts').select('id,tool_id,title,inputs,output,version,updated_at').eq('user_id',c.userId).order('updated_at',{ascending:false}).limit(100);
  return {profile,aiAvailable:Boolean(process.env['ROUTELLM_API_KEY']),imageAvailable:Boolean(process.env['OPENAI_API_KEY']),drafts:(data??[]) as ToolDraft[],storageError:error?'Saved work could not be loaded. Retry before saving changes.':null};
});
export const refineBusinessTool = createServerFn({method:'POST'}).middleware([requireAuthContract]).inputValidator(requestSchema).handler(async({data,context})=>{
  const profile=await memberProfile(context);const inputs=validateToolInput(data.toolId,data.inputs);const tool=findBusinessTool(data.toolId)!;
  const evidence = await collectToolEvidence(tool.id, inputs, captureSpecterWebsite);
  const sourceReport = evidence.length ? evidenceReport(evidence) : '';
  if (!process.env['ROUTELLM_API_KEY']) {
    if (evidence.length) return {output: sourceReport};
    throw new Error('Content generation is not connected. Your administrator must configure the AI provider. Your current work is unchanged.');
  }
  let output: string;
  try {
    output = await routeLlmChat({system:generationPrompt(tool, evidence.length > 0),messages:[{role:'user',content:JSON.stringify({profile:{name:profile.name,company:profile.company,title:profile.title,whatIDo:profile.what_i_do},brief:inputs,capturedEvidence:evidence})}],maxSteps:1});
  } catch {
    if (evidence.length) return {output: `AI analysis was unavailable. The public page capture completed successfully.\n\n${sourceReport}`};
    throw new Error('Content generation failed. Your current work is unchanged. Try again shortly.');
  }
  if(!output.trim()||output.length>36000) throw new Error('The response was empty or too long. Please try a shorter brief.');
  return {output: sourceReport ? `${output}\n\nPUBLIC PAGE CAPTURE\n${sourceReport}`.slice(0,50000) : output};
});
export const createBusinessImage = createServerFn({method:'POST'}).middleware([requireAuthContract]).inputValidator(requestSchema).handler(async({data,context})=>{
  await memberProfile(context);
  if(data.toolId !== 'image-studio' && data.toolId !== 'creation-studio') throw new Error('Choose Image Studio or Creation Studio to generate an image.');
  const inputs=validateToolInput(data.toolId,data.inputs);
  const image=await generateBusinessImage(`Create one polished business visual from this brief. Do not include instructions or UI controls. Brief: ${JSON.stringify(inputs).slice(0,10000)}`);
  return {image};
});
const saveSchema=requestSchema.extend({id:z.string().uuid().optional(),version:z.number().int().positive().optional(),title:z.string().trim().min(1).max(180),output:z.string().max(50000)});
export const saveBusinessTool = createServerFn({method:'POST'}).middleware([requireAuthContract]).inputValidator(saveSchema).handler(async({data,context})=>{
  const c=context as any;await memberProfile(c);const inputs=validateToolInput(data.toolId,data.inputs);
  const row={user_id:c.userId,tool_id:data.toolId,title:data.title,inputs,output:data.output,updated_at:new Date().toISOString()};
  if(data.id&&!data.version) throw new Error('Reload this draft before saving it.');
  const query=data.id?c.supabase.from('business_tool_drafts').update({...row,version:data.version!+1}).eq('id',data.id).eq('user_id',c.userId).eq('version',data.version):c.supabase.from('business_tool_drafts').insert(row);
  const {data:saved,error}=await query.select('id,tool_id,title,inputs,output,version,updated_at').maybeSingle();
  if(error) throw new Error('Your draft was not saved. Keep this page open or download a copy and try again.');
  if(!saved) throw new Error('This draft changed on another device. Download your current work, then reopen the saved copy before editing.');
  return saved as ToolDraft;
});
export const deleteBusinessTool = createServerFn({method:'POST'}).middleware([requireAuthContract]).inputValidator(z.object({id:z.string().uuid(),version:z.number().int().positive()})).handler(async({data,context})=>{
  const c=context as any;await memberProfile(c);
  const {data:removed,error}=await c.supabase.from('business_tool_drafts').delete().eq('id',data.id).eq('user_id',c.userId).eq('version',data.version).select('id').maybeSingle();
  if(error||!removed) throw new Error('The draft was not deleted. It may have changed; reload and try again.');
  return {deleted:true};
});
