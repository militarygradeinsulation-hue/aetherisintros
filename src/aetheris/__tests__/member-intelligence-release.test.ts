import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('member intelligence release', () => {
  it('opens both existing dashboards through an authenticated route', () => {
    const route = file('../../routes/_authenticated/member-intelligence.tsx')
    expect(route).toContain("createFileRoute('/_authenticated/member-intelligence')")
    expect(route).toContain('<BusinessAnalystPanel />')
    expect(route).toContain('<TrackRecordDashboard userId={user.id} />')
    expect(route).toContain('user ?')
  })
  it('provides discoverable desktop and mobile paths', () => {
    const nav = file('../../intros-ui/components/layout/TopNavigation.tsx')
    expect(nav.match(/href="\/member-intelligence"/g)).toHaveLength(2)
    expect(file('../../routeTree.gen.ts')).toContain("'/_authenticated/member-intelligence'")
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
