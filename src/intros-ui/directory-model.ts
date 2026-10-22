import type { NetworkMember, RelationshipTier } from './networkData'

export type DirectoryFilters = {
  keyword: string; roles: string[]; city: string; industry: string
  tier: 'All' | RelationshipTier; sort: 'relevance' | 'match' | 'mutuals'
}

/** Presentation-only selection: callers supply the authorized member list. */
export function selectDirectoryMembers(members: NetworkMember[], f: DirectoryFilters) {
  const query = f.keyword.trim().toLowerCase()
  return members.filter(m => {
    if (query && ![m.name, m.title, m.company, m.location, ...m.focusAreas].some(v => v.toLowerCase().includes(query))) return false
    if (f.tier !== 'All' && m.tier !== f.tier) return false
    if (f.roles.length && !f.roles.includes(m.roleType)) return false
    if (f.city !== 'All' && !m.location.includes(f.city)) return false
    if (f.industry !== 'All' && ![m.industry ?? '', ...m.focusAreas].some(v => v.toLowerCase().includes(f.industry.toLowerCase()))) return false
    return true
  }).sort((a, b) => f.sort === 'match' ? b.matchScore - a.matchScore : f.sort === 'mutuals' ? b.mutualConnectionsCount - a.mutualConnectionsCount : 0)
}

export function directoryDistribution(members: NetworkMember[], field: 'location' | 'industry') {
  const counts = new Map<string, number>()
  for (const m of members) {
    const value = (m[field] ?? '').trim()
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])
}