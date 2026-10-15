import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const simple = readFileSync(new URL('../pages/SimpleViewPage.tsx', import.meta.url), 'utf8')
const opportunity = readFileSync(new URL('../opportunity-ui.tsx', import.meta.url), 'utf8')

describe('secondary conversation and opportunity write acknowledgements', () => {
  it('keeps compact message draft until the server confirms delivery and keeps retry ID', () => {
    const sheet = simple.split('function ThreadSheet(')[1]?.split('function NeedSheet(')[0] ?? ''
    expect(sheet).toContain('await net.sendMessage(threadId, body, id)')
    expect(sheet).toContain('setFailed({ text: body, id')
    expect(sheet).toContain('This message has not been delivered.')
    expect(sheet).toContain('send(failed.text, failed.id)')
    expect(sheet).not.toContain("net.sendMessage(thread!.id, body)\n    setText('')")
  })
  it('uses guarded idempotent intro creation and never claims demo requests were sent', () => {
    expect(opportunity).toContain('await submitIntroRequest(member.id, draft.why_exists)')
    expect(opportunity).toContain('Preview only. No introduction has been sent.')
    expect(opportunity).not.toContain("db.from('intro_requests').insert({ user_id: graph.userId")
  })
  it('checks the result of recipient approval and does not fabricate acceptance', () => {
    expect(opportunity).toContain("intro.target_user_id !== graph.userId")
    expect(opportunity).toContain('if (accepted.error || !accepted.data?.member_opt_in)')
    expect(opportunity).toContain('Context approval saved, but your introduction acceptance was not confirmed.')
  })
})
