import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const auth = source('../../routes/auth.tsx')
const landing = source('../Landing.tsx')
const access = source('../access.ts')
const store = source('../store.tsx')
const simple = source('../pages/SimpleViewPage.tsx')
const early = source('../../routes/early-access.tsx')

describe('Ask Intros signup link', () => {
  it('takes new people straight to the signup form, not sign-in', () => {
    expect(landing).toContain('search={{ mode: \'signup\' }}')
    expect(early).toContain("mode: 'signup'")
    expect(auth).toContain("search['mode'] === 'signup'")
    expect(auth).toContain("requestedMode === 'signup' ? 'signup' : 'signin'")
  })

  it('uses database membership claims, preserving invite-only restrictions', () => {
    expect(auth).toContain("if (!publicSignup && !invite.trim()) throw new Error(")
    expect(auth).toContain("const publicSignup = launchMode === 'first_1000'")
    expect(auth).toContain("foundingStats().then(stats => setLaunchMode(stats.mode))")
    expect(access).toContain("supabase.rpc('claim_early_access', args)")
    expect(access).toContain("access.status === 'approved' && access.verification === 'verified'")
  })
})

describe('Simple View live messaging', () => {
  it('replaces the draft thread ID with the confirmed server ID after first send', () => {
    expect(store).toContain('return actualThread')
    expect(store).toContain('return threadId')
    expect(simple).toContain('const confirmedThreadId = await net.sendMessage(threadId, body, id)')
    expect(simple).toContain('onThreadConfirmed(confirmedThreadId)')
    expect(simple).toContain("setPanel({ kind: 'thread', threadId: id })")
    expect(simple).toContain('This message has not been delivered.')
  })
})

describe('Simple View verified introduction requests', () => {
  it('never shows success before the database confirms the request', () => {
    expect(simple).not.toContain('net.requestIntro(lead.member.id); setPanel(')
    expect(simple).toContain('const confirmed = await net.requestIntro(member.id)')
    expect(simple).toContain("if (!confirmed) setRequestError(")
    expect(simple).toContain('disabled={requesting || requested}')
  })
})
