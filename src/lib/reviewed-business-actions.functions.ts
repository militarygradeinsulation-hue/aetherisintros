import { createServerFn } from '@tanstack/react-start';
import { requireAuthContract } from './auth-gate';
import { approvedReportActionSchema, approvedBriefTaskSchema } from '@/aetheris/domain/reviewed-business-actions';
import { saveReportAction, saveBriefTask } from './reviewed-business-actions.server';
export const approveReportAction = createServerFn({method:'POST'}).middleware([requireAuthContract])
  .inputValidator(approvedReportActionSchema)
  .handler(({context,data})=>saveReportAction(context.supabase,context.userId,data));
export const approveBriefTask = createServerFn({method:'POST'}).middleware([requireAuthContract])
  .inputValidator(approvedBriefTaskSchema)
  .handler(({context,data})=>saveBriefTask(context.supabase,context.userId,data));
