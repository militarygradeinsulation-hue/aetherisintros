import { newcomerEligible, newcomerLane, outcomeWeight, outcomeScore } from '@/features/evidence-loop/matching'
/**
 * Compatibility ranking for Intros.
 *
 * Every number is explainable: each component contributes a weighted share and
 * returns the evidence sentence behind it, so the interface can always answer
 * "why this person, why me, why now".
 */
import type { Member } from './social'
import type { MeProfile } from './store'
import { giverBoost } from './reciprocity-core'

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
  newcomerEligible?: boolean
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
  const myNeed = `${me.lookingFor ?? ''} ${me.wantToMeet ?? ''} ${me.focus ?? ''} ${(me.goals ?? []).join(' ')}`
  const myOffer = `${me.canHelpWith ?? ''} ${myExpertise.join(' ')}`

  const industryHit = myIndustries.some(i => words(i).size && overlapCount(words(i), words(member.industry)) > 0)
  const sharedInterests = [
    ...overlapLabels([...myExpertise, ...myIndustries], [...member.expertise, ...member.tags]),
  ].slice(0, 6)

  const theyHelpMe = overlapCount(words(myNeed), words(member.offers.join(' '))) * 22
  const iHelpThem = overlapCount(words(myOffer), words(member.needs.join(' '))) * 22
  const mutualConnections = member.mutuals.filter(name =>
    context.connections.some(id => context.members.find(m => m.id === id)?.name === name))
  // Listed mutual names and free-form best-path text are not verified edges.
  // Score only a direct recorded connection or verified common contact.
  const directConnection = context.connections.includes(member.id)
  const approvedVouches = member.matchEvidence?.approvedVouches ?? 0
  const trustDepth = directConnection ? 100 : Math.max(Math.min(60, mutualConnections.length * 25), Math.min(30, approvedVouches * 15))
  const lastInteraction = member.lastInteractionDays
  const timing = lastInteraction == null || !Number.isFinite(lastInteraction)
    ? 0 : Math.max(0, 100 - Math.min(Math.max(0, lastInteraction), 180) / 1.8)
  const relevance = Math.min(100, sharedInterests.length * 16 + (industryHit ? 30 : 0))
  const availability = !member.availability.trim() || /unavailable|not (?:currently )?(?:open|available|taking)|no (?:new )?(?:intros|introductions|capacity)|closed to/i.test(member.availability) ? 0
    : /open|actively|welcomes|available/i.test(member.availability) ? 90 : 45

  const evidenceWeight = outcomeWeight(member.matchEvidence)
  const components: MatchComponent[] = [
    {
      label: 'Strategic relevance', weight: 0.24 - evidenceWeight, score: relevance,
      evidence: sharedInterests.length
        ? `Shared ground in ${sharedInterests.slice(0, 3).join(', ')}${industryHit ? ` and both working in ${member.industry.toLowerCase()}` : ''}.`
        : industryHit ? `Both working in ${member.industry.toLowerCase()}.`
          : 'No specific shared expertise or target industry recorded yet.',
    },
    {
      label: 'They can help you', weight: 0.2, score: Math.min(100, theyHelpMe),
      evidence: theyHelpMe > 0
        ? `Their stated offers overlap your current goals: ${member.offers.slice(0, 2).join(', ')}.`
        : 'No direct overlap between their stated offers and your goals was found.',
    },
    {
      label: 'You can help them', weight: 0.18, score: Math.min(100, iHelpThem),
      evidence: iHelpThem > 0
        ? `Their stated needs overlap what you can provide: ${member.needs.slice(0, 2).join(', ')}.`
        : 'No direct overlap between their stated needs and your capabilities was found.',
    },
    {
      label: 'Trust path', weight: 0.18, score: trustDepth,
      evidence: directConnection ? 'You already have a recorded connection with this member.'
        : mutualConnections.length ? `Possible path via ${mutualConnections.slice(0, 2).join(' and ')}, who are in your recorded connections. Their connection to the target is member-listed, not independently confirmed.`
          : approvedVouches > 0 ? `${approvedVouches} member-approved recommendations from verified members. These are vouches, not verified outcomes or a warm path.`
          : member.mutuals.length || member.bestPath.length > 2
            ? 'A member-listed path exists, but no connecting edge to your recorded network is confirmed.'
            : 'No recorded warm path yet; a direct, consent-based introduction is the honest route.',
    },
    {
      label: 'Timing', weight: 0.12, score: timing,
      evidence: lastInteraction == null || !Number.isFinite(lastInteraction)
        ? 'No verified interaction recency recorded; current timing is unknown.'
        : `Last recorded interaction ${Math.max(0, Math.round(lastInteraction))} days ago. ${member.whyNow || ''}`.trim(),
    },
    {
      label: 'Availability', weight: 0.08, score: availability,
      evidence: member.availability || 'Member availability has not been stated.',
    },
  ]

  if (evidenceWeight && member.matchEvidence) components.push({label:'Confirmed shared outcomes',weight:evidenceWeight,score:outcomeScore(member.matchEvidence),evidence:`${member.matchEvidence.successfulPartners} positive outcomes among ${member.matchEvidence.confirmedPartners} distinct partners with agreeing shared reports and mutual ranking consent in the past year. Smoothed for small samples; not a hiring suitability score.`})

  // Reciprocity hook (0055): members who chose to show their giver band get a small, capped
  // boost (Contributor +1.5, Pillar +3 out of 100) so generosity breaks ties without
  // outranking relevance. Hidden bands never reach the client, so they never count.
  const total = Math.min(100, Math.round(components.reduce((sum, c) => sum + c.score * c.weight, 0) + giverBoost(member.giverBand)))
  const strongest = [...components].sort((a, b) => b.score * b.weight - a.score * a.weight)[0]!

  return {
    memberId: member.id,
    newcomerEligible: newcomerEligible(member.matchEvidence, Math.max(relevance, Math.min(100, theyHelpMe)), availability),
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
  const ranked = members
    .map(member => ({ member, match: scoreMatch(me, member, { connections, members }) }))
    .sort((a, b) => b.match.total - a.match.total || a.member.id.localeCompare(b.member.id))
  return newcomerLane(ranked, x => x.member.id, x => Boolean(x.match.newcomerEligible))
}
