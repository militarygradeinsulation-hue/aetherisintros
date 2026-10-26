import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(file, 'utf8')

describe('reported Lovable member regression contracts', () => {
  it('keeps real share and revoke passport controls outside the disabled planner', () => {
    const app = source('src/aetheris/App.tsx')
    const graph = source('src/aetheris/graph-store.tsx')
    expect(app).toContain('<PassportManager /></div><ProfessionalDraftBoundary page="passport"')
    expect(app).toContain("id === 'passport' ? node : <ProfessionalDraftBoundary")
    expect(graph).toContain(".update({ revoked: true }).eq('id', id).eq('owner_id', userId)")
    expect(graph).toContain('Revocation was not confirmed')
  })

  it('restores the full workspace switch for a real CRM route and saved view', () => {
    const crm = source('src/aetheris/pages/CrmPage.tsx')
    expect(crm).toContain("section !== 'pipeline' && view === 'full'")
    expect(crm).toContain("{section !== 'pipeline' && switcher}")
    expect(crm).toContain("localStorage.getItem('aetheris.crm.view')")
  })

  it('does not silently acknowledge failed referral writes', () => {
    const referral = source('src/lib/warmReferral.functions.ts')
    const panel = source('src/aetheris/WarmReferralPanel.tsx')
    expect(referral).toContain('Dismissal could not be confirmed')
    expect(referral).toContain('Snooze could not be confirmed')
    expect(referral).toContain('Referral suggestion was not saved')
    expect(panel).toContain('role="alert" className="wr-error"')
    expect(panel).toContain('onError: reportError')
  })

  it('retries provider reads after auth restoration without mixing sessions', () => {
    const page = source('src/aetheris/providers-ui.tsx')
    expect(page).toContain("event === 'INITIAL_SESSION'")
    expect(page).toContain("event === 'SIGNED_OUT'")
    expect(page).toContain('loadGeneration.current++')
    expect(page).toContain('generation !== loadGeneration.current')
  })
})
