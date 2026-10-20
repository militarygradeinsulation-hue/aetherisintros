import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../ExecutiveUpgrade.tsx', import.meta.url), 'utf8')

describe('private executive upgrade RPC failure isolation', () => {
  it('settles the three independent RPC calls without one rejection masking the others', () => {
    expect(source).toContain('Promise.allSettled([')
    expect(source).toContain("rpc('my_executive_application')")
    expect(source).toContain("rpc('my_intro_allowance')")
    expect(source).toContain("rpc('admin_executive_applications')")
  })

  it('does not display guessed introduction quotas when the server response is missing or invalid', () => {
    expect(source).toContain('setAllowance(null)')
    expect(source).toContain('Number.isInteger(q.remaining)')
    expect(source).toContain('q.remaining! <= q.limit!')
    expect(source).toContain("q.tier === 'basic'")
  })

  it('reports an unavailable admin queue instead of silently showing no applications', () => {
    expect(source).toContain('Executive applications could not be loaded. Please retry.')
    expect(source).toContain('setApplications([])')
  })
})
