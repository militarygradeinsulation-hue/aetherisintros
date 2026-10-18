import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../access.ts', import.meta.url), 'utf8')
const claim = source.split('export async function claimAccess(')[1]?.split('export async function fetchAccess(')[0] ?? ''

describe('manual founding membership claim guard', () => {
  it('validates the current auth user and confirmed email before calling the RPC', () => {
    expect(claim).toContain('supabase.auth.getUser()')
    expect(claim).toContain('if (authError) throw authError')
    expect(claim).toContain('if (!auth.user)')
    expect(claim).toContain('if (!auth.user.email_confirmed_at)')
    expect(claim).toContain("supabase.rpc('claim_early_access', args)")
    expect(claim.indexOf('if (!auth.user.email_confirmed_at)')).toBeLessThan(claim.indexOf("supabase.rpc('claim_early_access', args)"))
  })
  it('keeps launch eligibility and founding slot assignment server-authoritative', () => {
    expect(claim).not.toContain("from('early_access_members').insert")
    expect(claim).not.toContain("from('early_access_members').update")
    expect(claim).toContain("supabase.rpc('claim_early_access', args)")
  })
})
