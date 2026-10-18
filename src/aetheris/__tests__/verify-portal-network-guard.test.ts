import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const verify = readFileSync(new URL('../../routes/_authenticated/verify.tsx', import.meta.url), 'utf8')

describe('verification portal network shortcut', () => {
  it('only offers network entry after email confirmation and unrestricted approval', () => {
    expect(verify).toContain("access.status === 'approved' && access.emailConfirmed && access.verification !== 'rejected' && access.verification !== 'suspended' && <Link")
    expect(verify).toContain("access.onboarded ? '/app' : '/onboarding'")
  })
})
