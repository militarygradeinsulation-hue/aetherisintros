import { describe, expect, it } from 'vitest'
import { memberOverviewSnapshot, type MemberOverviewGraph } from '../live-overview'

const example: MemberOverviewGraph = {
  synced: true,
  feedError: false,
  networkLoadError: '',
  members: [{ id: 'm1' }, { id: 'm2' }, { id: 'm2' }],
  connections: ['m2', 'm2'],
  threads: [{ unread: true }, { unread: false }, { unread: true }],
  posts: [{ visibility: 'network' }, { visibility: 'private' }, {}],
  asks: [{ visibility: 'network' }, { visibility: 'private' }],
}

describe('real member overview', () => {
  it('counts only the confirmed member graph and deduplicates connections', () => {
    expect(memberOverviewSnapshot(example)).toEqual({
      state: 'ready',
      directoryPeople: 2,
      connections: 1,
      unreadConversations: 2,
      sharedPosts: 2,
      sharedAsks: 1,
    })
  })

  it('never reports misleading zero counts before the graph has synced', () => {
    expect(memberOverviewSnapshot({ ...example, synced: false })).toEqual({ state: 'loading' })
  })

  it('fails closed when the live directory, feed, or private graph cannot load', () => {
    expect(memberOverviewSnapshot({ ...example, networkLoadError: 'Could not read member directory' })).toEqual({ state: 'unavailable' })
    expect(memberOverviewSnapshot({ ...example, feedError: true })).toEqual({ state: 'unavailable' })
  })

  it('supports a truly empty but successfully loaded private network', () => {
    expect(memberOverviewSnapshot({
      synced: true, feedError: false, networkLoadError: '',
      members: [], connections: [], threads: [], posts: [], asks: [],
    })).toEqual({ state: 'ready', directoryPeople: 0, connections: 0, unreadConversations: 0, sharedPosts: 0, sharedAsks: 0 })
  })
})
