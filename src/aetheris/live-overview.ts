/**
 * Data for the signed-in executive dashboard comes from the canonical member
 * graph. Never infer zero counts from an unfinished or failed private read.
 * Anonymous/preview routes do not mount this snapshot.
 */
export interface MemberOverviewGraph {
  synced: boolean
  feedError: boolean
  networkLoadError: string
  members: readonly { id: string }[]
  connections: readonly string[]
  threads: readonly { unread: boolean }[]
  posts: readonly { visibility?: 'network' | 'private' | undefined }[]
  asks: readonly { visibility: 'network' | 'private' }[]
}

export type MemberOverviewSnapshot =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | {
      state: 'ready'
      directoryPeople: number
      connections: number
      unreadConversations: number
      sharedPosts: number
      sharedAsks: number
    }

export function memberOverviewSnapshot(graph: MemberOverviewGraph): MemberOverviewSnapshot {
  if (!graph.synced) return { state: 'loading' }
  if (graph.feedError || graph.networkLoadError) return { state: 'unavailable' }
  return {
    state: 'ready',
    directoryPeople: new Set(graph.members.map(member => member.id).filter(Boolean)).size,
    connections: new Set(graph.connections.filter(Boolean)).size,
    unreadConversations: graph.threads.filter(thread => thread.unread).length,
    sharedPosts: graph.posts.filter(post => post.visibility !== 'private').length,
    sharedAsks: graph.asks.filter(ask => ask.visibility === 'network').length,
  }
}
