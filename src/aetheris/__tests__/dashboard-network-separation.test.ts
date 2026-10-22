import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('focused Dashboard and Network destinations', () => {
  const app = file('../../intros-ui/IntrosApp.tsx')
  const dashboard = file('../../intros-ui/views/HomeFeedView.tsx')
  const directory = file('../../intros-ui/views/PeopleDirectoryView.tsx')
  const widgetLayout = file('../../intros-ui/components/home/FeedSidebarLayout.tsx')

  it('renders member discovery and introduction management as different routes', () => {
    expect(app).toContain("activePage === 'people' && (")
    expect(app).toContain("activePage === 'intros' && (")
    expect(app).not.toContain("(activePage === 'people' || activePage === 'intros')")
    expect(app).toContain('<PeopleDirectoryView')
    expect(app).toContain('startPage="intros"')
    expect(app).toContain('onClick={() => handleNavigate(\'people\')}')
  })

  it('keeps the social feed but defaults to one readable column', () => {
    expect(dashboard).toContain('<FeedSidebarLayout widgets={widgets} actionQueue={actionQueue}>')
    expect(dashboard).toContain('socialFeed ||')
    expect(dashboard).toContain('onAddPost')
    expect(widgetLayout).toContain('const [focus, setFocus] = useState(true)')
    expect(widgetLayout).toContain("setFocus(localStorage.getItem(STORAGE_KEY + '.focus') !== 'false')")
    expect(widgetLayout).toContain('Customize')
  })

  it('puts genuine directory search before the optional overview', () => {
    expect(directory.indexOf('ix-network-primary-search')).toBeGreaterThan(-1)
    expect(directory.indexOf('ix-network-primary-search')).toBeLessThan(directory.indexOf('ix-network-optional'))
    expect(directory).toContain('value={searchKeyword}')
    expect(directory).toContain('onChange={event => setSearchKeyword(event.target.value)}')
    expect(directory).toContain('{filteredMembers.length}')
    expect(directory).toContain('onNavigate(\'intros\')')
  })

  it('keeps member introduction requests and live network data behind the original route', () => {
    expect(app).toContain('isLive={mode === \'live\'}')
    expect(app).toContain('<InviteCard />')
    expect(app).toContain('onRequestIntro={(member) => setRequestIntroTarget(member)}')
    expect(app).toContain('liveDirectoryError')
  })
})
