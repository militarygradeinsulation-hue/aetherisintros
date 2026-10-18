import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('existing pre-meeting intelligence release', () => {
  it('only exposes the action for a real member in a real thread', () => {
    const page = file('../../intros-ui/views/LiveMessagesView.tsx')
    expect(page).toContain('isUuid(person.id) && isUuid(active.id)')
    expect(page).toContain('<MeetingBriefPanel key={person.id} otherUserId={person.id} otherName={person.name} />')
    expect(page).toContain('briefThreadId === active.id')
  })
  it('keeps backend session-scoped and rejects replacing it with a global browser client', () => {
    const server = file('../../lib/meetingBrief.functions.ts')
    expect(server).toContain('.middleware([requireAuthContract])')
    expect(server).toContain('const db = (context as any).supabase')
    expect(server).not.toContain("import { supabase } from '@/integrations/supabase/client'")
  })
  it('keeps generated briefs private to their signed-in owner', () => {
    const server = file('../../lib/meetingBrief.functions.ts')
    expect(server).toContain(".eq('user_id', (context as any).userId)")
    expect(server).toContain('user_id: userId')
  })
})
