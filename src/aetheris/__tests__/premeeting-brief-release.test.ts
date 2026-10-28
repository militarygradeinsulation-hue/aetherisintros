import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const file = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('existing pre-meeting intelligence release', () => {
  it('keeps the profile-preview action tied to a real member and conversation', () => {
    const page = file('../../intros-ui/views/LiveMessagesView.tsx')
    expect(page).toContain('isUuid(person.id) && isUuid(active.id)')
    expect(page).toContain('<MeetingBriefPanel key={person.id} otherUserId={person.id} otherName={person.name} />')
    expect(page).toContain('briefThreadId === active.id')
  })
  it('keeps generation on the authenticated server rather than a global browser client', () => {
    const server = file('../../lib/meetingBrief.functions.ts')
    expect(server.match(/\.middleware\(\[requireAuthContract\]\)/g)).toHaveLength(2)
    expect(server).toContain('const db = context.supabase as any')
    expect(server).toContain('context.userId')
    expect(server).not.toContain("import { supabase } from '@/integrations/supabase/client'")
  })
  it('never shares another attendee\'s saved meeting prep', () => {
    const server = file('../../lib/meetingBrief.functions.ts')
    expect(server).toContain(".eq('user_id', context.userId)")
    expect(server).toContain(".eq('meeting_id', data.meetingId)")
    expect(server).toContain('user_id: userId')
    expect(server).toContain('This attendee is not available in your meeting.')
    expect(server).toContain('ephemeral: true')
  })
})
