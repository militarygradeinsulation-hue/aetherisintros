import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const src = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('Ask Intros shared red workspace design contract', () => {
  const app = src('../../intros-ui/IntrosApp.tsx')
  const memberStyles = src('../../intros-ui/views/workspace-burnt-orange-bento.css')
  const landing = src('../Landing.tsx')
  const publicStyles = src('../public-burnt-orange.css')

  it('loads the shared design after the older workspace layer in app and demo', () => {
    const base = app.indexOf("import './views/workspace-accent.css'")
    const bento = app.indexOf("import './views/workspace-burnt-orange-bento.css'")
    expect(base).toBeGreaterThan(-1)
    expect(bento).toBeGreaterThan(base)
    expect(memberStyles).toContain('.ix-root .aetheris-workspace-shell')
    expect(memberStyles).toContain('--ix-accent: #EF4444')
  })

  it('keeps one persistent sidebar, selected page, and a real action button', () => {
    const shell = src('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx')
    expect(shell).toContain('aetheris-workspace-shell')
    expect(shell).toContain('aria-current={active ?')
    expect(shell).toContain('sidebarCollapsed')
    expect(memberStyles).toContain('.specter-app-sidebar nav .active')
    expect(memberStyles).toContain('.specter-header-cta')
  })

  it('protects readable text on fully filled red actions', () => {
    expect(memberStyles).toContain('[class~="bg-[#EF4444]"]')
    expect(memberStyles).toContain('color: #1C0C0C !important')
    expect(memberStyles).toContain(':focus-visible')
    expect(memberStyles).toContain('prefers-reduced-motion: reduce')
  })

  it('applies red to real product destinations without changing feed data', () => {
    for (const path of [
      '../../intros-ui/views/HomeFeedView.tsx',
      '../../intros-ui/views/PeopleDirectoryView.tsx',
      '../../intros-ui/views/InsightsDashboardView.tsx',
      '../../intros-ui/views/IntrosHubView.tsx',
      '../../intros-ui/views/ConnectionBubblesView.tsx',
    ]) {
      const content = src(path)
      expect(content).toContain('#EF4444')
      expect(content).not.toContain('#F5B027')
    }
    expect(src('../../intros-ui/views/HomeFeedView.tsx')).toContain('onAddPost')
    expect(src('../../intros-ui/views/PeopleDirectoryView.tsx')).toContain('filteredMembers')
  })

  it('brings public entry styling into the same family, without inserting mock KPIs', () => {
    expect(landing).toContain("import './public-burnt-orange.css'")
    expect(publicStyles).toContain('.ael.ael-compact.ael--text')
    expect(publicStyles).toContain('#EF4444')
    expect(publicStyles).not.toMatch(/fake metrics|menace voice|shipping live/i)
    expect(memberStyles).not.toMatch(/fake metrics|menace voice|shipping live/i)
  })
})
