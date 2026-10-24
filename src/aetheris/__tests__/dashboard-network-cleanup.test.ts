import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('dashboard and network cleanup', () => {
  it('gives Network and Introductions separate destinations instead of a duplicated stack', () => {
    const app = file('../../intros-ui/IntrosApp.tsx')
    expect(app).toContain("activePage === 'people' && (")
    expect(app).toContain("activePage === 'intros' && experience === 'social'")
    expect(app).toContain("activePage === 'intros' && experience !== 'social'")
    expect(app).toContain('<BridgeIntroductions')
    // The old combined branch mounted both surfaces on both routes.
    expect(app).not.toContain("activePage === 'people' || activePage === 'intros'")
    // Introductions keeps a discoverable path back into people search.
    expect(app).toContain('<LedgerIntroductions')
    const introductions = file('../../intros-ui/views/LedgerIntroductions.tsx')
    expect(introductions).toContain('onNavigate(\'people\')')
    expect(introductions).toContain('Find a member')
    expect(app).toContain('onNavigate={handleNavigate}')
  })

  it('leads the directory with search and real counts, folding statistics and connectors into disclosures', () => {
    const view = file('../../intros-ui/views/PeopleDirectoryView.tsx')
    expect(view).toContain('Search the member network')
    expect(view).toContain('Network statistics')
    expect(view).toContain('Featured connectors')
    expect(view).toContain('ix-disclosure')
    // Mobile filters collapse behind an accessible toggle.
    expect(view).toContain('aria-controls="people-filter-rail"')
    expect(view).toContain('aria-expanded={filtersOpen}')
  })

  it('never renders fabricated network statistics for members', () => {
    const view = file('../../intros-ui/views/PeopleDirectoryView.tsx')
    expect(view).not.toContain('1,246')
    expect(view).not.toContain("'10K+'")
    expect(view).not.toContain('Aetheris Member')
    // City and industry distributions are computed from the real member list.
    expect(view).toContain('const topCities = useMemo(')
    expect(view).toContain('const topIndustries = useMemo(')
  })

  it('mounts the CRM dashboard with real member, unread and feed sources', () => {
    const app = file('../../intros-ui/IntrosApp.tsx')
    const view = file('../../intros-ui/views/LedgerDashboard.tsx')
    expect(app).toContain('<LedgerDashboard')
    expect(app).toContain('members={members}')
    expect(app).toContain('unread.loaded && !unreadUnavailable ? unread.total : null')
    expect(app).toContain('<AetherisAppSurface  feedOnly')
    expect(view).toContain('Members in view')
    expect(view).toContain('Share an update')
    expect(view).toContain('String(members.length)')
  })

  it('never substitutes a fabricated spotlight or fixture posts into the live CRM view', () => {
    const app = file('../../intros-ui/IntrosApp.tsx')
    const view = file('../../intros-ui/views/LedgerDashboard.tsx')
    expect(app).toContain("mode === 'live' ? [] : INITIAL_FEED_POSTS")
    expect(app).toContain("mode === 'live' ? [] : NETWORK_MEMBERS")
    expect(view).not.toContain('12 mutual connections')
    expect(view).not.toContain('Shared interests: AI Infrastructure, Climate Tech')
    expect(view).toContain('{live ?')
  })

  it('organizes Memory detail modules behind an accessible section chooser', () => {
    const app = file('../App.tsx')
    expect(app).toContain('memory-modules--tabbed')
    expect(app).toContain('role="tablist"')
    expect(app).toContain('aria-selected={memoryModule')
    // All four real-data sections remain reachable.
    for (const label of ['Relationship patterns', 'Learned needs', 'Reconnect', 'Cooling']) {
      expect(app).toContain(`'${label}'`)
    }
  })

  it('folds Insights opportunity clusters into progressive disclosure', () => {
    const app = file('../App.tsx')
    expect(app).toContain('Opportunity clusters — where several relationships point the same way')
    expect(app).toContain('ix-disclosure')
  })
})
