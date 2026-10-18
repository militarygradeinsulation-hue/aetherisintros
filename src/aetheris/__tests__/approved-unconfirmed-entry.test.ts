import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../../routes/early-access.tsx', import.meta.url), 'utf8')

describe('approved but unconfirmed email state', () => {
  it('shows a clear confirmation next step without granting network access', () => {
    expect(page).toContain("access.status === 'approved' && !access.emailConfirmed")
    expect(page).toContain('Confirm your email address using the link in your inbox')
  })
  it('only displays the enter-network shortcut after confirmed email and no account restriction', () => {
    expect(page).toContain("access.status === 'approved' && access.emailConfirmed && access.verification !== 'rejected' && access.verification !== 'suspended'")
    expect(page).toContain("to={access.onboarded ? '/app' : '/onboarding'}")
  })
})
