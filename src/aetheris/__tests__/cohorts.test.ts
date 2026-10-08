import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { cohortFunnel, inviteLink, linksCsv, parseInviteList, type ActivationRow } from '../cohorts'

describe('parseInviteList', () => {
  it('accepts commas, tabs and semicolons with the email in any position', () => {
    const { rows } = parseInviteList('Dana Ortiz, dana@northwind.com, Northwind\nsam@contoso.com\tSam Lee\tContoso\nLee; lee@x.io')
    expect(rows).toEqual([
      { email: 'dana@northwind.com', name: 'Dana Ortiz', company: 'Northwind' },
      { email: 'sam@contoso.com', name: 'Sam Lee', company: 'Contoso' },
      { email: 'lee@x.io', name: 'Lee', company: '' },
    ])
  })
  it('drops headers, blanks and duplicate emails, and reports lines it could not use', () => {
    const { rows, skipped } = parseInviteList('Name,Email,Company\n\nA, A@x.com\nA again, a@X.com\nNo email here\nbad@email')
    expect(rows.map(r => r.email)).toEqual(['a@x.com'])
    expect(skipped).toEqual(['No email here', 'bad@email'])
  })
  it('strips quotes from spreadsheet exports', () => {
    expect(parseInviteList('"Ortiz, Dana",dana@n.com').rows[0]).toMatchObject({ email: 'dana@n.com' })
  })
})

describe('cohortFunnel', () => {
  it('is cumulative and treats expired invites as invited only', () => {
    const rows = [{ stage: 'expired' }, { stage: 'invited' }, { stage: 'onboarded' }, { stage: 'outcome' }] as Pick<ActivationRow, 'stage'>[]
    expect(cohortFunnel(rows)).toEqual([
      { stage: 'invited', reached: 4 }, { stage: 'joined', reached: 2 }, { stage: 'onboarded', reached: 2 },
      { stage: 'asked', reached: 1 }, { stage: 'introduced', reached: 1 }, { stage: 'outcome', reached: 1 },
    ])
  })
})

describe('linksCsv', () => {
  it('builds a mail-merge sheet with escaped cells and invite links', () => {
    const csv = linksCsv('https://intros.today/', [{ inviteId: '1', email: 'd@n.com', name: 'Ortiz, Dana', company: 'Northwind', code: 'f-abc', expiresAt: null, stage: 'invited', userId: null }])
    expect(csv).toBe('name,company,email,invite_link,stage\n"Ortiz, Dana",Northwind,d@n.com,https://intros.today/invite/f-abc,Invited\n')
    expect(inviteLink('https://a.b', 'x y')).toBe('https://a.b/invite/x%20y')
  })
})
