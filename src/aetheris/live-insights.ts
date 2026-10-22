import { memberOverviewSnapshot, type MemberOverviewGraph } from './live-overview'

export interface InsightsGraph extends MemberOverviewGraph {
  members: readonly { id: string; company?: string; introState?: string }[]
  saved: readonly string[]
}

/** Current account snapshot, not a historical funnel or an inferred growth rate. */
export function liveInsightsSnapshot(graph: InsightsGraph) {
  const overview = memberOverviewSnapshot(graph)
  if (overview.state !== 'ready') return overview
  const members = [...new Map(graph.members.map(member => [member.id, member])).values()]
  const count = (states: string[]) => members.filter(member => states.includes(member.introState ?? '')).length
  return {
    ...overview,
    companies: new Set(members.map(member => member.company?.trim().toLocaleLowerCase()).filter(Boolean)).size,
    savedMembers: new Set(graph.saved.filter(Boolean)).size,
    introductions: [
      { label: 'Requested', count: count(['requested']) },
      { label: 'Waiting', count: count(['waiting']) },
      { label: 'Accepted', count: count(['accepted']) },
      { label: 'Introduced', count: count(['introduced']) },
      { label: 'Conversing', count: count(['conversing']) },
      { label: 'Closed', count: count(['closed']) },
    ],
  }
}
