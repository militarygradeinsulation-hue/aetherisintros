import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const security = readFileSync(new URL('../pages/SecurityPage.tsx', import.meta.url), 'utf8')
const revoke = security.split('  const revokeOthers = async () => {')[1]?.split('\n  /** Tables')[0] ?? ''

describe('Session revocation audit accuracy', () => {
  it('does not log a successful revocation when the provider rejects the request', () => {
    expect(revoke).toContain("supabase.auth.signOut({ scope: 'others' })")
    expect(revoke).toContain('if (error) { setMessage(error.message); return }')
    expect(revoke.indexOf('if (error)')).toBeLessThan(revoke.indexOf("logSecurityEvent('sessions_revoked'"))
  })

  it('always releases the busy state, even after unexpected errors', () => {
    expect(revoke).toContain('} catch (caught) {')
    expect(revoke).toContain('} finally {')
    expect(revoke).toContain('setBusy(false)')
  })
})
