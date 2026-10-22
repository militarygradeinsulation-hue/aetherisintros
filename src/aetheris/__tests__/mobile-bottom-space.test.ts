import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('mobile workspace bottom space', () => {
  const base = read('../../intros-ui/styles.css')
  const mobile = read('../../intros-ui/views/mobile-menu-refinement.css')
  const app = read('../../intros-ui/IntrosApp.tsx')

  it('overrides the obsolete bottom-tab reservation only in the new workspace', () => {
    expect(base).toContain('padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px))')
    expect(mobile).toContain('.ix-root.ix-aetheris-workspace-mode')
    expect(mobile).toContain('padding-bottom: 0 !important')
    expect(mobile).toContain('height: 100dvh')
    expect(mobile).toContain('max-height: 100dvh')
  })

  it('keeps real safe-area breathing room on the scrollable content', () => {
    expect(mobile).toContain('.aetheris-workspace-content')
    expect(mobile).toContain('padding-bottom: max(14px, env(safe-area-inset-bottom, 0px))')
    expect(mobile).toContain('-webkit-overflow-scrolling: touch')
    expect(app).toContain('mobile-menu-refinement.css')
  })

  it('still uses the accessible top navigation drawer rather than a bottom tab bar', () => {
    const shell = read('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx')
    expect(shell).toContain('specter-mobile-menu-toggle')
    expect(shell).toContain('specter-mobile-menu')
    expect(shell).toContain('<span>Menu</span>')
  })
})
