/**
 * Compatibility ranking for Intros.
 *
 * Every number is explainable: each component contributes a weighted share and
 * returns the evidence sentence behind it, so the interface can always answer
 * "why this person, why me, why now".
 */
import type { Member } from './social'
import type { MeProfile } from './store'

export interface MatchComponent {
  label: string
  score: number
  weight: number
  evidence: string
}

export interface MatchResult {
  memberId: string
  total: number
  components: MatchComponent[]
  sharedInterests: string[]
  mutualConnections: string[]
  headline: string
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
const words = (value: string) => new Set(norm(value).split(/\s+/).filter(w => w.length > 3))
const overlapCount = (a: Set<string>, b: Set<string>) => [...a].filter(x => b.has(x)).length

function overlapLabels(mine: string[], theirs: string[]): string[] {
  const theirWords = theirs.map(t => ({ raw: t, words: words(t) }))
  const seen = new Set<string>()
  for (const item of mine) {
    const my = words(item)
    for (const t of theirWords) if (overlapCount(my, t.words) > 0) seen.add(t.raw)
  }
  return [...seen].slice(0, 6)
}

export function scoreMatch(
  me: MeProfile,
  member: Member,
  context: { connections: string[]; members: Member[] },
): MatchResult {
  const myIndustries = me.industries ?? []
  const myExpertise = me.expertise ?? []
  const myNeed = `${me.lookingFor ?? ''} ${me.wantToMeet ?? ''} ${me.focus ?? ''}`
  const myOffer = `${me.canHelpWith ?? ''} ${myExpertise.join(' ')}`

  const industryHit = myIndustries.some(i => words(i).size && overlapCount(words(i), words(member.industry)) > 0)
  const sharedInterests = [
    ...overlapLabels([...myExpertise, ...myIndustries], [...member.expertise, ...member.tags]),
  ].slice(0, 6)

  const theyHelpMe = overlapCount(words(myNeed), words(member.offers.join(' '))) * 22
  const iHelpThem = overlapCount(words(myOffer), words(member.needs.join(' '))) * 22
  const mutualConnections = member.mutuals.filter(name =>
    context.connections.some(id => context.members.find(m => m.id === id)?.name === name))
  const trustDepth = Math.min(100, member.mutuals.length * 18 + mutualConnections.length * 22 + (member.bestPath.length > 2 ? 24 : 0))
  const timing = Math.max(0, 100 - Math.min(member.lastInteractionDays, 180) / 1.8)
  const relevance = Math.min(100, sharedInterests.length * 16 + (industryHit ? 30 : 0))
  const availability = /open|actively|welcomes|available/i.test(member.availability) ? 90 : 55

  const components: MatchComponent[] = [
    {
      label: 'Strategic relevance', weight: 0.24, score: relevance,
      evidence: sharedInterests.length
        ? `Shared ground in ${sharedInterests.slice(0, 3).join(', ')}${industryHit ? ` and both working in ${member.industry.toLowerCase()}` : ''}.`
        : `Different field — ${member.industry.toLowerCase()} — which can be the point when you need an outside read.`,
    },
    {
      label: 'They can help you', weight: 0.2, score: Math.min(100, theyHelpMe),
      evidence: member.offers.length ? `They offer ${member.offers[0]!.toLowerCase()}.` : 'No stated offer yet.',
    },
    {
      label: 'You can help them', weight: 0.18, score: Math.min(100, iHelpThem),
      evidence: member.needs.length ? `They are looking for ${member.needs[0]!.toLowerCase()}.` : 'No stated need yet.',
    },
    {
      label: 'Trust path', weight: 0.18, score: trustDepth,
      evidence: mutualConnections.length
        ? `Warm through ${mutualConnections.slice(0, 2).join(' and ')} in your connections.`
        : member.mutuals.length ? `${member.mutuals.length} mutual contacts in the wider network.` : 'No path yet — a cold, well-reasoned note is the honest route.',
    },
    {
      label: 'Timing', weight: 0.12, score: timing,
      evidence: member.whyNow,
    },
    {
      label: 'Availability', weight: 0.08, score: availability,
      evidence: member.availability,
    },
  ]

  const total = Math.round(components.reduce((sum, c) => sum + c.score * c.weight, 0))
  const strongest = [...components].sort((a, b) => b.score * b.weight - a.score * a.weight)[0]!

  return {
    memberId: member.id,
    total,
    components,
    sharedInterests,
    mutualConnections,
    headline: strongest.evidence,
  }
}

export function rankMatches(
  me: MeProfile,
  members: Member[],
  connections: string[],
): Array<{ member: Member; match: MatchResult }> {
  return members
    .map(member => ({ member, match: scoreMatch(me, member, { connections, members }) }))
    .sort((a, b) => b.match.total - a.match.total)
}
