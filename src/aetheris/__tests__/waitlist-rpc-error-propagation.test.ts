import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const access = readFileSync(new URL('../access.ts', import.meta.url), 'utf8')
const earlyAccess = readFileSync(new URL('../../routes/early-access.tsx', import.meta.url), 'utf8')

describe('Founding waitlist error propagation', () => {
  it('throws on failed waitlist enrollment instead of silently returning success', () => {
    const fn = access.split('export async function joinWaitlist(')[1]?.split('\n}\n')[0] ?? ''
    expect(fn).toContain("supabase.rpc('join_waitlist'")
    expect(fn).toContain('const { error } = await')
    expect(fn).toContain('if (error) throw error')
  })

  it('shows a failure rather than a success notice when enrollment rejects', () => {
    const fn = earlyAccess.split('  const wait = async () => {')[1]?.split('\n  const remaining')[0] ?? ''
    expect(fn).toContain('await joinWaitlist(waitEmail')
    expect(fn).toContain("catch { setError('That email could not be added.")
    expect(fn.indexOf('await joinWaitlist')).toBeLessThan(fn.indexOf("setNotice('You are on the waitlist."))
  })
})
