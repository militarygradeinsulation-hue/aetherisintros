import { z } from 'zod';

export const deliverySchema = z.object({
  id: z.string().uuid(), draftId: z.string().uuid(), version: z.number().int().positive(),
  destination: z.enum(['calendar', 'post']), approved: z.literal(true),
  startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional(),
}).superRefine((data, ctx) => {
  if (data.destination === 'calendar' && (!data.startsAt || !data.endsAt || Date.parse(data.endsAt) <= Date.parse(data.startsAt))) {
    ctx.addIssue({code: 'custom', message: 'Choose a start and an end time after the start.'});
  }
});

/** Uses the authenticated member client, so existing feed/calendar RLS still applies. */
export async function deliverBusinessContent(db: any, userId: string, raw: unknown) {
  const data = deliverySchema.parse(raw);
  const {data: draft, error} = await db.from('business_tool_drafts').select('id,title,output,version').eq('id', data.draftId).eq('user_id', userId).maybeSingle();
  if (error || !draft || draft.version !== data.version) throw new Error('Reopen and review the latest saved content before continuing.');
  if (!draft.output.trim() || (data.destination === 'post' && draft.output.length > 10000)) throw new Error('A post needs between 1 and 10,000 characters. Review one content item at a time.');
  const table = data.destination === 'post' ? 'posts' : 'calendar_events';
  const owner = data.destination === 'post' ? 'author_id' : 'user_id';
  const row = data.destination === 'post'
    ? {id: data.id, author_id: userId, text: draft.output, detail: '', kind: 'Insight', visibility: 'network', is_demo: false, media: [], response_count: 0, when_label: 'Just now'}
    : {id: data.id, user_id: userId, title: draft.title, notes: draft.output, location: '', kind: 'personal', starts_at: data.startsAt, ends_at: data.endsAt, all_day: false};
  // A stable client operation ID makes a retry after a lost response safe.
  const findExisting = () => db.from(table).select('*').eq('id', data.id).eq(owner, userId).maybeSingle();
  const matches = (existing: any) => data.destination === 'post'
    ? existing.text === draft.output && existing.visibility === 'network'
    : existing.title === draft.title && existing.notes === draft.output && Date.parse(existing.starts_at) === Date.parse(data.startsAt!) && Date.parse(existing.ends_at) === Date.parse(data.endsAt!);
  const existing = await findExisting();
  if (existing.error) throw new Error('Could not verify this action. Your saved content is safe; retry shortly.');
  if (existing.data) {
    if (!matches(existing.data)) throw new Error('This action already exists with different content. Review it in your calendar or feed.');
    return {id: data.id, destination: data.destination};
  }
  const result = await db.from(table).insert(row).select('id').maybeSingle();
  if (result.error || !result.data) {
    const retry = await findExisting();
    if (!retry.error && retry.data && matches(retry.data)) return {id: data.id, destination: data.destination};
    throw new Error('Could not confirm completion. Your private review copy is saved. Retry this action or check your calendar/feed before starting another.');
  }
  return {id: result.data.id, destination: data.destination};
}
