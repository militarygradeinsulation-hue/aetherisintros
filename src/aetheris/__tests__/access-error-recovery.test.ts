import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const access = read('../access.ts')
const app = read('../../routes/_authenticated/app.tsx')
const onboarding = read('../../routes/_authenticated/onboarding.tsx')
const early = read('../../routes/early-access.tsx')

describe('member access error recovery', () => {
  it('finishes the loading state after an access query fails, without granting live access', () => {
    expect(access).toContain('error: string | null')
    expect(access).toContain('loading: false, error: ACCESS_READ_ERROR')
    expect(access).toContain('if (!cancelled) setAccess({ ...noAccess, loading: false, error: ACCESS_READ_ERROR })')
    expect(access).toContain('.catch(() =>')
    expect(access).toContain('return { access, refresh, live: isLiveMember(access) }')
  })

  it('does not redirect member app or onboarding when permission checks fail', () => {
    expect(app).toContain('if (access.loading || access.error) return')
    expect(onboarding).toContain('if (access.loading || access.error) return')
    expect(app).toContain('Retry membership check')
    expect(onboarding).toContain('Retry membership check')
    expect(app).toContain('role="alert"')
  })

  it('does not present failed access reads as a guest sign-in state', () => {
    expect(early).toContain('access.error && <div className="auth-error" role="alert">')
    expect(early).toContain('!access.loading && !access.error && !access.signedIn')
  })
})
