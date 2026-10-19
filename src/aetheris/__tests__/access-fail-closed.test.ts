import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const access = readFileSync(new URL('../access.ts', import.meta.url), 'utf8')

describe('canonical membership access fetch', () => {
  it('rejects an auth service error instead of treating the user as signed out', () => {
    expect(access).toContain('if (authError) throw authError')
  })
  it('never treats membership permission failures as a missing account', () => {
    expect(access).toContain('if (existing.error) throw existing.error')
    expect(access).toContain('if (existing.error) throw existing.error')
  })
  it('fails closed on partial member role/profile reads', () => {
    expect(access).toContain('if (membership.error) throw membership.error')
    expect(access).toContain('if (roles.error) throw roles.error')
  })
})
