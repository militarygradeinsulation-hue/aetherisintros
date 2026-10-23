import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../../intros-ui/IntrosApp.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../../intros-ui/components/layout/LedgerBridgeShell.tsx', import.meta.url), 'utf8')
const tools = readFileSync(new URL('../../intros-ui/views/LedgerWorkspace.tsx', import.meta.url), 'utf8')
const registry = readFileSync(new URL('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx', import.meta.url), 'utf8')

describe('workspace tools live in the menu, not above page content', () => {
  it('opens the selected canonical workspace directly without a duplicate toolbar', () => {
    const start = app.indexOf("{activePage === 'workspace' && <LedgerWorkspace")
    const end = app.indexOf('<AetherisAppSurface key=', start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const pageHeader = app.slice(start, end)
    expect(pageHeader).not.toContain('className="ix-tools"')
    expect(pageHeader).not.toContain('map(([id, label])')
  })

  it('preserves all advanced tools in desktop sidebar and mobile menu', () => {
    expect(shell).toContain('<Nav />')
    expect(shell).toContain('<Nav mobile />')
    expect(shell).toContain('PRIMARY_NAV_GROUPS')
    expect(shell).toContain('LedgerSectionNavigation')
    expect(tools).not.toContain('Business workspace modules')
    for (const key of ['crm', 'diagnostic', 'pocket', 'executivework', 'providers', 'needs', 'companies', 'opportunities', 'deals', 'referrals', 'workspaces', 'calendar', 'grid', 'circles', 'peergroups', 'events']) {
      expect(registry).toContain(`workspace: '${key}'`)
    }
  })
})
