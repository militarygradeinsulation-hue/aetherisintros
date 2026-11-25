import { z } from 'zod';
import type { BriefAction } from './executive-brief';

/** User-supplied Golden Report interchange contract. Evidence is untrusted data,
 * not instructions. No automatic publication, spending, or estimated revenue.
 */
const field=(max:number)=>z.string().trim().min(1).max(max);
export const reportFindingSchema=z.object({
  id:z.string().trim().regex(/^[A-Za-z0-9_.:-]{1,100}$/),
  title:field(160),
  evidence:field(2500),
  proposedAction:field(500),
  metric:field(180),
  baseline:z.string().trim().max(200).optional(),
  target:z.string().trim().max(200).optional(),
}).strict();
export const reportImportSchema=z.object({
  reportReference:field(200),
  company:field(180),
  findings:z.array(reportFindingSchema).min(1).max(25),
}).strict().superRefine((value,ctx)=>{
  const ids=new Set<string>();
  for(const finding of value.findings){
    if(ids.has(finding.id))ctx.addIssue({code:'custom',message:'Each finding must have a unique ID.'});
    ids.add(finding.id);
  }
});
export type ReportImport=z.infer<typeof reportImportSchema>;
export type ReportFinding=z.infer<typeof reportFindingSchema>;
export const approvedReportActionSchema=z.object({
  owner:z.string().uuid(),approved:z.literal(true),
  reportReference:field(200),company:field(180),finding:reportFindingSchema,
  kind:z.enum(['task','opportunity']),companyId:z.string().uuid().nullable(),
  assignee:z.string().trim().max(120),
}).strict();
export type ApprovedReportAction=z.infer<typeof approvedReportActionSchema>;
export function parseGoldenReport(text:string):ReportImport {
  if(text.length>100_000)throw new Error('Import up to 100,000 characters at a time.');
  let data:unknown;
  try { data=JSON.parse(text); } catch {throw new Error('Use valid JSON in the displayed interchange format.');}
  const result=reportImportSchema.safeParse(data);
  if(!result.success)throw new Error(result.error.issues[0]?.message||'The report data is incomplete.');
  return result.data;
}
export function reportActionPreview(input: Pick<ApprovedReportAction,'reportReference'|'company'|'finding'|'kind'|'assignee'>) {
  const {finding,company,reportReference,kind,assignee}=input;
  return {
    title:kind==='task'?finding.proposedAction.slice(0,200):finding.title,
    detail:[
      'User-supplied Golden Report finding (not independently verified)',
      'Report reference: '+reportReference,'Company: '+company,'Finding ID: '+finding.id,
      'Finding: '+finding.title,'Recorded evidence: '+finding.evidence,'Proposed action: '+finding.proposedAction,
      'Measure: '+finding.metric,'Baseline: '+(finding.baseline||'Not supplied; establish before execution'),
      'Target: '+(finding.target||'Not supplied; agree before execution'),
      ...(kind==='task'&&assignee?['Responsible role/person label: '+assignee]:[]),
      'No financial result is claimed. Verify the evidence before action.'
    ].join('\n'),
  };
}
/** A review task is an internal reminder; never consent, send outreach or create a meeting. */
export const briefTaskSourceSchema=z.enum(['CRM opportunity','CRM contact','Meeting']);
export const approvedBriefTaskSchema=z.object({
  owner:z.string().uuid(),approved:z.literal(true),source:briefTaskSourceSchema,
  recordId:z.string().uuid(),reviewedText:field(4000),
}).strict();
export type ApprovedBriefTask=z.infer<typeof approvedBriefTaskSchema>;
export function briefTaskPreview(action:BriefAction) {
  const parsed=briefTaskSourceSchema.safeParse(action.source);
  if(!parsed.success)return null;
  return {
    source:parsed.data,recordId:action.recordId,
    title:('Review: '+action.title).slice(0,200),
    detail:['Executive brief — internal review only',action.source+' ID: '+action.recordId,'Record: '+action.title,
      'Reason: '+action.reason,...(action.missingEvidence.length?['Verify: '+action.missingEvidence.join(', ')]:[]),
      'Confirm current facts before making a commitment. This task does not send a message or change the source record.'
    ].join('\n'),
  };
}
export async function approvedActionId(owner:string,source:string,reference:string,kind:string) {
  const key=JSON.stringify(['askintros-reviewed-action-v1',owner,source,reference,kind]);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),'5'+hex.slice(13,16),'a'+hex.slice(17,20),hex.slice(20,32)].join('-');
}
