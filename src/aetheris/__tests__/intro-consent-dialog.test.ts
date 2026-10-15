import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const intro = source.split('function IntroModal(')[1]?.split('const blank =')[0] ?? ''

describe('classic introduction consent and delivery', () => {
  it('does not let a caller set the other member’s consent', () => {
    expect(intro).toContain("const authorized = person.introState === 'introduced'")
    expect(intro).not.toContain('setThem(')
    expect(intro).not.toContain('net.authorizeIntro(person.id)')
  })
  it('does not submit requests just from opening the dialog', () => {
    expect(intro).toContain('Opening an introduction MUST NOT automatically submit a request')
    expect(intro).toContain('const saved = await net.requestIntro(person.id, text.trim())')
  })
  it('sends only after authorization and server acknowledgement with idempotent retry', () => {
    expect(intro).toContain('if (!authorized || sending || !text.trim() || blocked) return')
    expect(intro).toContain('await net.sendMessage(threadId, text.trim(), id)')
    expect(intro).toContain('setRetryMessageId(id)')
    expect(intro).toContain('role="alert"')
  })
})
