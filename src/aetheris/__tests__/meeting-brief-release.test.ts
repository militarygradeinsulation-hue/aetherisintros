import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const source = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('private meeting brief release', () => {
  it('shows profile prep only for a real conversation and real member', () => {
    const ui = source('../../intros-ui/views/LiveMessagesView.tsx')
    expect(ui).toContain('isUuid(person.id) && isUuid(active.id)')
    expect(ui).toContain('<MeetingBriefPanel key={person.id}')
    expect(ui).toContain('Pre-meeting brief')
  })
  it('keeps meeting briefs authenticated, owner-scoped and bound to actual meetings', () => {
    const api = source('../../lib/meetingBrief.functions.ts')
    expect(api.match(/\.middleware\(\[requireAuthContract\]\)/g)).toHaveLength(2)
    expect(api).toContain('user_id: userId')
    expect(api).toContain(".eq('user_id', context.userId)")
    expect(api).toContain(".eq('meeting_id', data.meetingId)")
    expect(api).toContain(".eq('other_user_id', data.otherUserId)")
    expect(api).toContain('onConflict:')
    expect(api).toContain('meeting_personal_briefs')
    // A messaging preview has no meeting and must not be stored as a real meeting brief.
    expect(api).toContain('if (!data.meetingId)')
    expect(api).toContain('ephemeral: true')
  })
  it('protects the dedicated private table using member-scoped RLS', () => {
    const migration = source('../../../drizzle/migrations/0111_meeting_personal_briefs.sql')
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('TO authenticated')
    expect(migration).toContain('user_id=(select auth.uid())')
    expect(migration).toContain('public.is_meeting_participant(meeting_id)')
    expect(migration).toContain('meeting_personal_briefs_insert')
  })
})
