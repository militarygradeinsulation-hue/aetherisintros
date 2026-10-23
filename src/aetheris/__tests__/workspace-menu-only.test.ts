import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../../intros-ui/IntrosApp.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx', import.meta.url), 'utf8')

describe('workspace tools live in the menu, not above page content', () => {
  it('opens the selected canonical workspace directly without a duplicate toolbar', () => {
    const start = app.indexOf('{activePage === \'workspace\' && <div className="ix-classic">')
    const end = app.indexOf('<AetherisAppSurface key={classicPage}', start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const pageHeader = app.slice(start, end)
    expect(pageHeader).not.toContain('className="ix-tools"')
    expect(pageHeader).not.toContain('map(([id, label])')
  })

  it('preserves all advanced tools in desktop sidebar and mobile menu', () => {
    expect(shell).toContain('MEMBER_TOOL_DESTINATIONS.map')
    expect(shell).toContain('{navigation(false)}')
    expect(shell).toContain('{navigation(true)}')
    for (const key of ['crm', 'diagnostic', 'pocket', 'executivework', 'providers', 'needs', 'companies', 'opportunities', 'deals', 'referrals', 'workspaces', 'calendar', 'grid', 'circles', 'peergroups', 'events']) {
      expect(shell).toContain(`workspace: '${key}'`)
    }
  })
})
