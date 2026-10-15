import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Regression contract: an earlier merge silently restored the old optimistic
// store. These assertions protect the actual call sites used by the live app.
const store = readFileSync(new URL('../store.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const handshake = readFileSync(new URL('../pages/Handshake.tsx', import.meta.url), 'utf8')
const inbox = readFileSync(new URL('../../intros-ui/views/LiveMessagesView.tsx', import.meta.url), 'utf8')

describe('acknowledged live writes', () => {
  it('waits for server message acknowledgement, never replays unconfirmed DMs', () => {
    expect(store).toMatch(/sendMessage:\s*async\s*\(threadId, text, messageId\)/)
    expect(store).toContain('await sendLiveMessage(actualThread, userId, text, messageId)')
    expect(store).not.toContain("fire(supabase.from('dm_messages')")
    expect(store).not.toContain('sendLiveMessage(threadId, userId, message.text, message.id)')
    expect(store).toContain('if (!live) {\n      for (const [threadId, messages]')
    expect(inbox).toContain('This message has not been delivered.')
    expect(inbox).toContain('failed.id')
  })

  it('protects the classic editor and attachment send path too', () => {
    expect(app).toContain('await net.sendMessage(threadId, message, id)')
    expect(app).toContain('This message has not been delivered.')
    expect(app).toContain('sendConfirmed(failedSend.threadId, failedSend.text, failedSend.id)')
    expect(app).not.toContain("net.sendMessage(thread.id, final); setText('')")
  })

  it('never requests introductions on modal open or impersonates the other side', () => {
    const modal = app.slice(app.indexOf('function IntroModal('), app.indexOf('const blank = { goal:'))
    expect(modal).not.toContain("if (person.introState === 'recommended') net.requestIntro")
    expect(modal).not.toContain('net.authorizeIntro(')
    expect(modal).not.toContain('net.declineIntro(')
    expect(modal).not.toContain('net.sendMessage(')
    expect(modal).toContain('await net.requestIntro(person.id, text.trim())')
    expect(modal).toContain('Only the other member can grant their consent.')
    expect(handshake).toContain('if (!saved)')
    expect(handshake).toContain('setRequestError')
  })

  it('confirms introductions and social activity before showing success', () => {
    expect(store).toContain('await submitIntroRequest(id')
    expect(store).toContain('if (!live) for (const [memberId, status]')
    expect(store).not.toContain('saveIntro(userId, memberId, status)\n      }\n    }')
    for (const action of ['Connection', 'Follow', 'Like', 'Comment', 'Repost']) {
      expect(store).toContain("verifiedWrite('" + action + "'")
    }
    expect(store).toContain('__aetherisNetworkCtx')
  })
})
