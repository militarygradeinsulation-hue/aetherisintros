import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8')

describe('saved member persistence contract', () => {
  it('writes live saved relationships to the existing server graph before showing success', () => {
    const store = source('../store.tsx')
    const start = store.indexOf('      toggleSave: (id, label) => {')
    const end = store.indexOf('      openThreadWith: (id)', start)
    expect(start).toBeGreaterThan(0)
    const action = store.slice(start, end)
    expect(action).toContain("return live ? verifiedWrite('Saved member'")
    expect(action).toContain("mirrorFollow(userId, id, 'saved', on)")
    expect(action.indexOf('mirrorFollow(')).toBeLessThan(action.indexOf('}, commit)'))
    expect(action).toContain("if (!userId) throw new Error")
  })

  it('does not let the member profile display a locally faked bookmark', () => {
    const app = source('../../intros-ui/IntrosApp.tsx')
    const profile = source('../../intros-ui/views/ProfileDetailView.tsx')
    expect(app).toContain("network.toggleSave(memberId, person?.name)")
    expect(app).toContain("mode === 'live' ? network.saved.includes(currentProfileMember.id) : savedMemberIds.has(currentProfileMember.id)")
    expect(profile).toContain('const handleToggleSave = () => onToggleSave?.(member.id)')
    expect(profile).not.toContain('setSavedState')
  })

  it('shares a single server-confirmed connection state with the member directory', () => {
    const app = source('../../intros-ui/IntrosApp.tsx')
    const store = source('../store.tsx')
    expect(app).toContain("const activeConnectedMemberIds = mode === 'live'")
    expect(app).toContain('new Set(network.connections)')
    expect(app).toContain('network.connect(memberId)')
    expect(app).toContain('connectedMemberIds={activeConnectedMemberIds}')
    expect(app).not.toContain("supabase.from('follows').upsert")
    expect(store).toContain("return mirrorFollow(userId, id, 'connection', on)")
  })

  it('keeps private bookmarks out of the public anonymous preview', () => {
    const app = source('../../intros-ui/IntrosApp.tsx')
    expect(app).toContain("new Set(mode === 'live' ? [] : ['marcus-lee'])")
    expect(app).toContain("if (mode === 'live')")
  })
})
