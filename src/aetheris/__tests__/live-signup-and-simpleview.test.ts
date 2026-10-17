import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const auth = source('../../routes/auth.tsx')
const landing = source('../Landing.tsx')
const access = source('../access.ts')
const store = source('../store.tsx')
const simple = source('../pages/SimpleViewPage.tsx')
const early = source('../../routes/early-access.tsx')
const liveMessages = source('../../intros-ui/views/LiveMessagesView.tsx')
const app = source('../App.tsx')

describe('Ask Intros signup link', () => {
  it('takes new people straight to the signup form, not sign-in', () => {
    expect(landing).toContain('search={{ mode: \'signup\' }}')
    expect(early).toContain("mode: 'signup'")
    expect(auth).toContain("search['mode'] === 'signup'")
    expect(auth).toContain("requestedMode === 'signup' ? 'signup' : 'signin'")
  })

  it('uses the launch mode for invitations and keeps membership enforcement server-side', () => {
    expect(auth).not.toContain("if (!invite.trim()) throw new Error(")
    expect(auth).toContain("Membership RPCs enforce launch mode")
    expect(access).toContain("supabase.rpc('claim_early_access', args)")
    expect(access).toContain("access.emailConfirmed && access.status === 'approved' && access.onboarded")
    expect(access).toContain("access.verification !== 'rejected'")
    expect(access).toContain("access.verification !== 'suspended'")
    expect(access).not.toContain("access.verification === 'verified'")
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

describe('Durable member conversation and relationship history', () => {
  it('keeps the real thread selected after its first persisted message', () => {
    expect(liveMessages).toContain('if (confirmedThreadId && confirmedThreadId !== threadId) setActiveId(confirmedThreadId)')
    expect(liveMessages).toContain('net.sendMessage(threadId, text, id)')
    expect(app).toContain('if (savedThreadId && savedThreadId !== threadId) setActiveId(savedThreadId)')
  })
  it('does not present never-contacted members as stale exchanges', () => {
    expect(app).toContain('p.lastInteractionDays != null && p.lastInteractionDays < 9000')
    expect(app).not.toContain('${(person.lastInteractionDays ?? 0)} days ago')
  })
})

describe('Open-member activation without unearned role verification', () => {
  const gate = source('../../routes/_authenticated/app.tsx')
  const onboarding = source('../../routes/_authenticated/onboarding.tsx')
  const early = source('../../routes/early-access.tsx')
  const bridge = source('../../intros-ui/liveMembers.tsx')
  it('routes approved members to onboarding then their real network', () => {
    expect(gate).toContain("isLiveMember(access)")
    expect(gate).not.toContain("access.verification === 'verified'")
    expect(onboarding).not.toContain("access.verification !== 'verified'")
    expect(early).toContain("access.onboarded ? '/app' : '/onboarding'")
  })
  it('never claims that every approved profile has a verified business role', () => {
    expect(bridge).toContain("verified: businessRoleVerified")
    expect(bridge).toContain("Boolean(p.verified_role)")
    expect(bridge).not.toContain("verified: true")
  })
})

describe('Email-confirmed first-use security contract', () => {
  const accessSql = source('../../../drizzle/migrations/0087_confirmed_member_onboarding.sql')
  const onboarding = source('../../routes/_authenticated/onboarding.tsx')

  it('requires approval, confirmed email, completed onboarding and no rejected review', () => {
    expect(accessSql).toContain("e.status = 'approved'")
    expect(accessSql).toContain("u.email_confirmed_at IS NOT NULL")
    expect(accessSql).toContain("p.onboarded IS TRUE")
    expect(accessSql).toContain("v.status IN ('rejected', 'suspended')")
    expect(accessSql).not.toContain("v.status = 'verified'")
    expect(accessSql).not.toContain('GRANT SELECT ON public.members')
  })

  it('waits for the profile update receipt instead of silently entering on denied writes', () => {
    expect(onboarding).toContain(".select('id').maybeSingle()")
    expect(onboarding).toContain('savedProfile?.id !== access.userId')
  })

  it('does not auto-award the evidence-based business role badge', () => {
    const bridge = source('../../intros-ui/liveMembers.tsx')
    expect(bridge).toContain('verified: businessRoleVerified')
    expect(bridge).toContain('Boolean(p.verified_role)')
  })
})
