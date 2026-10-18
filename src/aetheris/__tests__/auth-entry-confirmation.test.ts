import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const auth = readFileSync(new URL('../../routes/auth.tsx', import.meta.url), 'utf8')
const access = readFileSync(new URL('../access.ts', import.meta.url), 'utf8')

describe('canonical confirmed member entry', () => {
  it('routes ordinary sign-in, confirmation links and Google sign-in to the membership gate', () => {
    expect(auth).toContain("navigate({ to: '/early-access', replace: true })")
    expect(auth).toContain("emailRedirectTo: `${window.location.origin}${next || '/early-access'}`")
    expect(auth).toContain("redirect_uri: `${window.location.origin}${next || '/early-access'}`")
  })
  it('does not claim or clear invitation before email confirmation', () => {
    expect(auth).not.toContain('await claimAccess(')
    expect(auth).not.toContain('clearInvite()')
    expect(access).toContain("if (user.email_confirmed_at && !existing.error")
    expect(access).toContain("result.status === 'approved') clearInvite()")
  })
  it('preserves explicit authenticated next destinations', () => {
    expect(auth).toContain('if (next) { window.location.replace(next); return }')
  })
})
