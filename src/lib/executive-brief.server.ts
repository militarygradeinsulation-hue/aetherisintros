import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireBusinessWorkspace } from './business-workspace-access.server';
import { BRIEF_LIMIT, buildExecutiveBrief, type Slice, type ExecutiveBrief, type BriefInputs } from '@/aetheris/domain/executive-brief';

type Result<T> = { data: T[] | null; error: unknown };
const LIMIT = BRIEF_LIMIT + 1;
const unavailable = <T>(): Slice<T> => ({ rows: [], state: 'unavailable', limited: false });
async function read<T>(query: PromiseLike<Result<T>>): Promise<Slice<T>> {
  try {
    const result = await query;
    if (result.error || !result.data) return unavailable<T>();
    return { rows: result.data.slice(0, BRIEF_LIMIT), state: 'ready', limited: result.data.length > BRIEF_LIMIT };
  } catch { return unavailable<T>(); }
}

/** Uses the authenticated request client, never a service role. All private reads
 * have an explicit owner filter; meetings also require current participant RLS.
 * Call only on explicit request; no polling, writes or external provider calls.
 */
export async function readExecutiveBrief(db: SupabaseClient<Database>, userId: string, now = Date.now()): Promise<ExecutiveBrief> {
  await requireBusinessWorkspace(db);
  const day = 86400000;
  const start = new Date(now).toISOString();
  const upcoming = new Date(now + 7 * day).toISOString();
  const stale = new Date(now - 45 * day).toISOString();
  const meetings = async (): Promise<BriefInputs['meetings']> => {
    const rows = await read(db.from('meetings')
      .select('id,title,scheduled_for,intro_request_id,ended_at,meeting_participants!inner(user_id)')
      .eq('meeting_participants.user_id', userId).is('deleted_at', null).is('archived_at', null).is('ended_at', null)
      .gte('scheduled_for', start).lte('scheduled_for', upcoming).order('scheduled_for').limit(LIMIT));
    return rows.state === 'ready' ? { ...rows, rows: rows.rows.map(({ id, title, scheduled_for, intro_request_id, ended_at }) => ({ id, title, scheduled_for, intro_request_id, ended_at })) } : unavailable();
  };
  const [tasks, opportunities, meetingRows, introductions, contacts, connections, notes, mindprint, outcomes] = await Promise.all([
    read(db.from('crm_tasks').select('id,title,due_at,priority,status').eq('owner_id', userId).in('status', ['open','doing'])
      .or('due_at.lte.' + upcoming + ',priority.eq.high').order('due_at', { ascending: true, nullsFirst: false }).limit(LIMIT)),
    read(db.from('crm_opportunities').select('id,name,next_action,expected_close,status,detail,person_id,source,updated_at')
      .eq('owner_id', userId).eq('archived', false).eq('status', 'open').order('expected_close', { ascending: true, nullsFirst: false }).limit(LIMIT)),
    meetings(),
    read(db.from('intro_requests').select('id,created_at,status,requester_opt_in,member_opt_in')
      .eq('target_user_id', userId).eq('requester_opt_in', true).eq('member_opt_in', false)
      .in('status',['requested','pending','new']).order('created_at').limit(LIMIT)),
    read(db.from('crm_people').select('id,full_name,company_name,last_activity_at').eq('owner_id', userId)
      .eq('archived', false).is('deleted_at', null).lt('last_activity_at', stale).order('last_activity_at').limit(LIMIT)),
    read(db.from('relationships').select('id').eq('user_id', userId).eq('kind','connection').limit(LIMIT)),
    read(db.from('memories').select('id').eq('user_id', userId).eq('scope','private').eq('kind','saved-note').limit(LIMIT)),
    read(db.from('memories').select('text').eq('user_id', userId).eq('scope','private').eq('category','Personal Mindprint')
      .eq('source','Member-confirmed LinkedIn professional baseline').order('created_at',{ ascending:false }).limit(1)),
    read(db.from('intro_outcomes').select('intro_request_id,stage,attribution,outcome_category,created_at')
      .eq('author_id',userId).eq('stage','outcome').order('created_at',{ascending:false}).limit(LIMIT)),
  ]);
  let mindprintState: BriefInputs['mindprint'] = 'unavailable';
  if (mindprint.state === 'ready') {
    if (!mindprint.rows.length) mindprintState = 'not-recorded';
    else {
      try {
        const value = JSON.parse(mindprint.rows[0]!.text);
        if (value?.version === 1 && value.status === 'member_confirmed') mindprintState = 'available';
      } catch { /* unreadable is not absent */ }
    }
  }
  return buildExecutiveBrief({ tasks, opportunities, meetings: meetingRows, introductions, contacts, connections, notes, mindprint: mindprintState, outcomes }, now);
}
