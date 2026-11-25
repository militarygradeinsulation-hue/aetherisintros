/** Private decision support. All inputs must be account-authorized records.
 * No AI calls, writes, outreach or inferred revenue. Missing evidence stays missing.
 */
import { summarizeRecordedRelationships, type ReportedOutcome } from './recorded-relationships';
export const BRIEF_LIMIT = 12;
const DAY = 86_400_000;
export type Slice<T> = { rows: readonly T[]; state: 'ready' | 'unavailable'; limited: boolean };
export type BriefTask = { id: string; title: string; due_at: string | null; priority: string; status: string };
export type BriefOpportunity = { id: string; name: string; next_action: string; expected_close: string | null; status: string; detail: string; person_id: string | null; source: string; updated_at: string };
export type BriefMeeting = { id: string; title: string; scheduled_for: string | null; intro_request_id: string | null; ended_at: string | null };
export type BriefIntro = { id: string; created_at: string; status: string; requester_opt_in: boolean; member_opt_in: boolean };
export type BriefContact = { id: string; full_name: string; company_name: string; last_activity_at: string | null };
export type BriefInputs = {
  tasks: Slice<BriefTask>;
  opportunities: Slice<BriefOpportunity>;
  meetings: Slice<BriefMeeting>;
  introductions: Slice<BriefIntro>;
  contacts: Slice<BriefContact>;
  connections: Slice<{ id: string }>;
  notes: Slice<{ id: string }>;
  mindprint: 'available' | 'not-recorded' | 'unavailable';
  outcomes?: Slice<ReportedOutcome>;
};
export type Destination = 'tasks' | 'pipeline' | 'meetings' | 'intros' | 'contacts';
export type BriefAction = {
  id: string; recordId: string; title: string; reason: string;
  source: 'CRM task' | 'CRM opportunity' | 'Meeting' | 'Introduction' | 'CRM contact';
  destination: Destination; urgency: 'urgent' | 'next' | 'review';
  missingEvidence: string[];
};
const time = (value: string | null) => value ? Date.parse(value) : NaN;
const clean = (value: string, fallback: string) => value.trim().slice(0, 160) || fallback;
const present = (value: string | null) => Boolean(value?.trim());
const order = { urgent: 0, next: 1, review: 2 } as const;
export function opportunityEvidenceGaps(o: Pick<BriefOpportunity,'detail'|'next_action'|'expected_close'|'person_id'|'source'>): string[] {
  return [
    ...(!present(o.detail) ? ['Recorded need or context'] : []),
    ...(!present(o.next_action) ? ['Next action'] : []),
    ...(!Number.isFinite(time(o.expected_close)) ? ['Expected close date'] : []),
    ...(!o.person_id ? ['Linked CRM contact'] : []),
    ...(!present(o.source) ? ['Source'] : []),
  ];
}
export function buildExecutiveBrief(input: BriefInputs, now = Date.now()) {
  const actions: BriefAction[] = [];
  const add = (a: Omit<BriefAction, 'id'>) => actions.push({ ...a, id: a.source + ':' + a.recordId });
  for (const t of input.tasks.state === 'ready' ? input.tasks.rows : []) {
    if (!['open', 'doing'].includes(t.status)) continue;
    const due = time(t.due_at);
    if (Number.isFinite(due) && due <= now + 7 * DAY) add({
      recordId: t.id, title: clean(t.title, 'Untitled task'), source: 'CRM task', destination: 'tasks',
      urgency: due < now ? 'urgent' : 'next', reason: due < now ? 'Recorded due date has passed.' : 'Recorded due date is within seven days.', missingEvidence: [],
    });
    else if (t.priority === 'high') add({
      recordId: t.id, title: clean(t.title, 'Untitled task'), source: 'CRM task', destination: 'tasks',
      urgency: 'review', reason: 'Marked high priority in your CRM.', missingEvidence: Number.isFinite(due) ? [] : ['Due date'],
    });
  }
  for (const o of input.opportunities.state === 'ready' ? input.opportunities.rows : []) {
    if (o.status !== 'open') continue;
    const due = time(o.expected_close);
    const missingEvidence = opportunityEvidenceGaps(o);
    const closeDue = Number.isFinite(due) && due <= now + 7 * DAY;
    if (!missingEvidence.length && !closeDue) continue;
    add({
      recordId: o.id, title: clean(o.name, 'Untitled opportunity'), source: 'CRM opportunity', destination: 'pipeline',
      urgency: closeDue && due < now ? 'urgent' : closeDue || !present(o.next_action) ? 'next' : 'review',
      reason: closeDue ? (due < now ? 'Your forecast close date has passed; verify status.' : 'Your forecast close date is within seven days; confirm timing.') : 'Review the missing CRM evidence before making a recommendation.',
      missingEvidence,
    });
  }
  for (const m of input.meetings.state === 'ready' ? input.meetings.rows : []) {
    const due = time(m.scheduled_for);
    if (m.ended_at || !Number.isFinite(due) || due < now || due > now + 7 * DAY) continue;
    add({ recordId: m.id, title: clean(m.title, 'Scheduled meeting'), source: 'Meeting', destination: 'meetings',
      urgency: due <= now + DAY ? 'urgent' : 'next', reason: 'Scheduled meeting: review the attendee context and prepare a brief.',
      missingEvidence: [] });
  }
  for (const i of input.introductions.state === 'ready' ? input.introductions.rows : []) {
    if (!i.requester_opt_in || i.member_opt_in || !['requested', 'pending', 'new'].includes(i.status)) continue;
    add({ recordId: i.id, title: 'Introduction awaiting your review', source: 'Introduction', destination: 'intros',
      urgency: 'next', reason: 'The requester opted in; your separate consent is still needed.', missingEvidence: ['Your consent'] });
  }
  for (const c of input.contacts.state === 'ready' ? input.contacts.rows : []) {
    const last = time(c.last_activity_at);
    if (!Number.isFinite(last) || last > now - 45 * DAY) continue;
    add({ recordId: c.id, title: clean(c.full_name, 'CRM contact'), source: 'CRM contact', destination: 'contacts',
      urgency: 'review', reason: 'No recorded CRM activity for at least 45 days. Confirm whether a follow-up is appropriate.', missingEvidence: [] });
  }
  actions.sort((a,b) => order[a.urgency] - order[b.urgency] || a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
  const sources = (['tasks','opportunities','meetings','introductions','contacts','connections','notes'] as const).map(key => ({
    key, state: input[key].state, sample: input[key].state === 'ready' ? input[key].rows.length : null, limited: input[key].limited,
  }));
  const relationshipResults = input.outcomes?.state==='ready' ? { ...summarizeRecordedRelationships(input.outcomes.rows), limited: input.outcomes.limited } : null;
  return { asOf: new Date(now).toISOString(), actions: actions.slice(0, BRIEF_LIMIT), moreActions: actions.length > BRIEF_LIMIT, sources, mindprint: input.mindprint, relationshipResults };
}
export type ExecutiveBrief = ReturnType<typeof buildExecutiveBrief>;
