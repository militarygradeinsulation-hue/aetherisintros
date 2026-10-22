import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const upgrade = readFileSync(new URL('../ExecutiveUpgrade.tsx', import.meta.url), 'utf8')
const route = readFileSync(new URL('../../routes/_authenticated/app.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx', import.meta.url), 'utf8')

describe('Executive launcher lives in the workspace sidebar, not a floating bubble', () => {
  it('ExecutiveUpgrade supports a controlled dialog with a hidden trigger', () => {
    expect(upgrade).toContain('hideTrigger')
    expect(upgrade).toContain('onOpenChange')
    expect(upgrade).toContain('controlledOpen ?? internalOpen')
    expect(upgrade).toContain('{!hideTrigger && <button type="button" className="executive-upgrade-trigger"')
  })

  it('the live route mounts the dialog without the floating trigger and controls it from state', () => {
    expect(route).toContain('hideTrigger')
    expect(route).toContain('open={executiveOpen}')
    expect(route).toContain('onOpenChange={setExecutiveOpen}')
    expect(route).toContain('executiveAction={executiveAction}')
  })

  it('the tier gate is preserved: executive non-admin members get no action', () => {
    expect(route).toContain("access.tier === 'executive' && !access.isAdmin ? undefined")
    expect(upgrade).toContain("if (tier === 'executive' && !isAdmin) return null")
  })

  it('the sidebar action labels match the member role', () => {
    expect(route).toContain("access.isAdmin ? 'Executive applications' : 'Executive access'")
  })

  it('the workspace shell renders the action as a nav button and closes the mobile drawer', () => {
    expect(shell).toContain('specter-executive-action')
    expect(shell).toContain('aria-haspopup="dialog"')
    expect(shell).toContain('setMobileMenuOpen(false); executiveAction.onOpen();')
    // The dialog stays a sibling of the shell, outside the sidebar stacking context.
    expect(shell).not.toContain('ExecutiveUpgrade')
  })
})
