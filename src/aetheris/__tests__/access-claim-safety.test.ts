import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const access = readFileSync(new URL('../access.ts', import.meta.url), 'utf8')

describe('member activation claim safety', () => {
  it('does not claim access for an unconfirmed email', () => {
    expect(access).toContain('if (user.email_confirmed_at && !existing.error &&')
    expect(access).toContain('await claimAccess(code || undefined)')
  })
  it('does not treat a failed membership lookup as an empty membership', () => {
    expect(access).toContain('!existing.error && (!existing.data')
  })
  it('keeps server-authoritative live membership checks', () => {
    expect(access).toContain("access.status === 'approved' && access.onboarded")
    expect(access).toContain('access.emailConfirmed')
  })
})
