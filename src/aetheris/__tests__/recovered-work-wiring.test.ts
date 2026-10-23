import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const more = readFileSync(new URL('../pages/MoreDrawer.tsx', import.meta.url), 'utf8')
const pocket = readFileSync(new URL('../pocket/PocketWorkspace.tsx', import.meta.url), 'utf8')
const editorial = readFileSync(new URL('../../intros-ui/IntrosApp.tsx', import.meta.url), 'utf8')
const menu = readFileSync(new URL('../../intros-ui/components/layout/AetherisWorkspaceShell.tsx', import.meta.url), 'utf8')
const opportunity = readFileSync(new URL('../opportunity-ui.tsx', import.meta.url), 'utf8')
const messages = readFileSync(new URL('../../intros-ui/views/LiveMessagesView.tsx', import.meta.url), 'utf8')
const social = readFileSync(new URL('../SocialExperience.tsx', import.meta.url), 'utf8')

describe('recovered product work stays connected', () => {
  it('keeps Need / Offer / Proof of Work in the canonical feed', () => {
    expect(social).toContain('BusinessComposer')
    expect(social).toContain('BusinessDetailsView')
    expect(social).toContain('BusinessActionButton')
    expect(social).toContain('FEED_LANES')
  })

  it('keeps Deal Workspaces distinct and launchable from messages and accepted introductions', () => {
    expect(app).toContain('workspaces: <WorkspacesPage />')
    expect(more).toContain("id: 'workspaces'")
    expect(messages).toContain('StartWorkspaceButton')
    expect(opportunity).toContain('StartWorkspaceButton')
    expect(editorial).toContain("setClassicPage('workspaces')")
  })

  it('keeps the private Library and Blueprints inside Pocket', () => {
    expect(pocket).toContain("section === 'library' && <PrivateLibrary />")
    expect(pocket).toContain("section === 'blueprints' && <BlueprintWorkbench />")
    expect(more).toContain('Private Library & Blueprints')
  })

  it('keeps recovered executive systems behind one workbench destination', () => {
    expect(app).toContain('executivework: <ExecutiveWorkPage />')
    expect(more).toContain("id: 'executivework'")
    expect(menu).toContain("{ label: 'Executive Workbench', icon: BriefcaseBusiness, workspace: 'executivework' }")
  })
})
