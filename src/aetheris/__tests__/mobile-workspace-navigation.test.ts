import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const shell = read('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx')
const app = read('../../intros-ui/IntrosApp.tsx')
const mobile = read('../../intros-ui/views/mobile-workspace.css')

describe('mobile Ask Intros workspace navigation', () => {
  it('shows a named, accessible menu option with current destinations', () => {
    expect(shell).toContain('<span>Menu</span>')
    expect(shell).toContain("aria-label={mobileMenuOpen ? 'Close workspace menu' : 'Open workspace menu'}")
    expect(shell).toContain('aria-expanded={mobileMenuOpen}')
    expect(shell).toContain('aria-haspopup="dialog"')
    for (const name of ['Dashboard', 'Find Introductions', 'Member Network', 'Messages', 'Specter Detect', 'Settings']) {
      expect(shell).toContain("label: '"+name+"'")
    }
    expect(shell).toContain("aria-current={active ? 'page' : undefined}")
  })

  it('closes on route change, backdrop click, Escape, and restores keyboard focus', () => {
    expect(shell).toContain("useEffect(() => { setMobileMenuOpen(false); }, [activePage, activeWorkspace])")
    expect(shell).toContain('specter-mobile-menu-scrim')
    expect(shell).toContain('onClick={() => closeMobileMenu(true)}')
    expect(shell).toContain("event.key === 'Escape'")
    expect(shell).toContain("event.key !== 'Tab'")
    expect(shell).toContain("menuButtonRef.current?.focus")
    expect(shell).toContain('aria-modal="true"')
  })

  it('loads the mobile layer after the burnt-orange workspace design', () => {
    const shared = app.indexOf("import './views/workspace-burnt-orange-bento.css'")
    const phone = app.indexOf("import './views/mobile-workspace.css'")
    expect(shared).toBeGreaterThan(-1)
    expect(phone).toBeGreaterThan(shared)
    expect(mobile).toContain('@media (max-width: 760px)')
    expect(mobile).toContain('.specter-mobile-menu-toggle')
    expect(mobile).toContain('background: #EF4444')
  })

  it('protects narrow phones, touch reachability, small-screen scrolling and motion preference', () => {
    expect(mobile).toContain('@media (max-width: 360px)')
    expect(mobile).toContain('min-height: 44px')
    expect(mobile).toContain('overflow-y: auto')
    expect(mobile).toContain('env(safe-area-inset-bottom, 0px)')
    expect(mobile).toContain('font-size: 16px !important')
    expect(mobile).toContain('@media (prefers-reduced-motion: reduce)')
    expect(mobile).toContain('.specter-mobile-menu-close:focus-visible')
  })
})
