import { createServerFn } from '@tanstack/react-start';
import { requireAuthContract } from './auth-gate';
import { readExecutiveBrief } from './executive-brief.server';
export const getExecutiveBrief = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(({ context }) => readExecutiveBrief(context.supabase, context.userId));
