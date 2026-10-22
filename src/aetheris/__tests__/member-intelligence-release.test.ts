import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('member intelligence release', () => {
  it('is a destination inside the shared workspace shell, not a hard navigation', () => {
    const shell = file('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx')
    expect(shell).toContain("{ label: 'Member Intelligence', icon: Fingerprint, page: 'intelligence' }")
    expect(shell).not.toContain("href: '/member-intelligence'")
  })
  it('opens both existing dashboards through compact tabs with the real member id', () => {
    const view = file('../../intros-ui/views/MemberIntelligenceView.tsx')
    expect(view).toContain('<BusinessAnalystPanel />')
    expect(view).toContain('<TrackRecordDashboard userId={userId} />')
    expect(view).toContain("role=\"tablist\"")
    expect(view).toContain('aria-selected')
    // The full Specter investigation stays on its own page — no duplicated panel.
    expect(view).not.toContain('SpecterDetectPanel')
    expect(view).toContain("onNavigate('specter')")
  })
  it('keeps the authenticated deep link on the same membership gate', () => {
    const route = file('../../routes/_authenticated/member-intelligence.tsx')
    expect(route).toContain("createFileRoute('/_authenticated/member-intelligence')")
    expect(route).toContain('<Gate initialPage="intelligence" />')
    expect(file('../../routeTree.gen.ts')).toContain("'/_authenticated/member-intelligence'")
    const app = file('../../routes/_authenticated/app.tsx')
    expect(app).toMatch(/export function Gate\(\{ initialPage(?:, initialWorkspace)?(?:, initialSearch)? \}/)
    expect(app).toContain('const ready = isLiveMember(access)')
    expect(app).toContain('initialPage={initialPage}')
  })
  it('shows a transparent sign-in explanation in demo mode instead of fake metrics', () => {
    const view = file('../../intros-ui/views/MemberIntelligenceView.tsx')
    expect(view).toContain('sign in to review your real data')
    expect(view).not.toContain('NETWORK_MEMBERS')
  })
  it('preserves server-owned business and reputation scores', () => {
    const analyst = file('../../lib/businessAnalyst.functions.ts')
    const scores = file('../../lib/trackRecord.functions.ts')
    expect(analyst).toContain("import { supabaseAdmin }")
    expect(analyst).toContain('.from(\'business_diagnostics\')')
    expect(scores).toContain('supabaseAdmin')
    expect(scores).toContain(".from('reputation_scores').upsert(")
  })
})
