import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const source = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
describe('private meeting brief release', () => {
 it('is only shown for a real conversation and real member', () => {
  const ui=source('../../intros-ui/views/LiveMessagesView.tsx')
  expect(ui).toContain('isUuid(person.id) && isUuid(active.id)')
  expect(ui).toContain('<MeetingBriefPanel key={person.id}')
  expect(ui).toContain('Pre-meeting brief')
 })
 it('retains authenticated user-scoped server storage', () => {
  const api=source('../../lib/meetingBrief.functions.ts')
  expect(api.match(/\.middleware\(\[requireAuthContract\]\)/g)).toHaveLength(2)
  expect(api).toContain(".eq('user_id', (context as any).userId)")
  expect(api).toContain('user_id: userId')
 })
})
