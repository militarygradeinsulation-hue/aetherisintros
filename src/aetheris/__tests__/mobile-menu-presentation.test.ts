import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('mobile workspace navigation presentation', () => {
  const shell = read('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx')
  const mobile = read('../../intros-ui/views/mobile-menu-refinement.css')
  const app = read('../../intros-ui/IntrosApp.tsx')

  it('shows a visible labelled Menu with an icon, not an empty bordered square', () => {
    expect(shell).toContain('<span>Menu</span>')
    expect(shell).toContain('aria-expanded={mobileMenuOpen}')
    expect(mobile).toContain('.specter-mobile-menu-toggle svg')
    expect(mobile).toContain('display: block !important')
    expect(mobile).toContain('.specter-mobile-menu-toggle span')
    expect(mobile).toContain('display: inline !important')
  })

  it('opens an accessible navigable drawer and supports escape and closing', () => {
    expect(shell).toContain('role="dialog"')
    expect(shell).toContain('aria-modal="true"')
    expect(shell).toContain("event.key === 'Escape'")
    expect(shell).toContain('specter-mobile-menu-close')
    expect(shell).toContain('mobileDialogRef')
  })

  it('loads the phone overrides after the existing density and base mobile themes', () => {
    expect(app.indexOf('mobile-menu-refinement.css')).toBeGreaterThan(app.indexOf('mobile-workspace.css'))
    expect(app.indexOf('mobile-menu-refinement.css')).toBeGreaterThan(app.indexOf('dashboard-network-density.css'))
  })

  it('keeps real social feed controls usable with reduced motion', () => {
    expect(mobile).toContain('.home-feed-controls-actions')
    expect(mobile).toContain('.home-feed-welcome-actions')
    expect(mobile).toContain('prefers-reduced-motion: reduce')
    expect(mobile).not.toContain('display: none !important;\n  .ix-root .aetheris-workspace-shell .home-social-board')
  })
})
