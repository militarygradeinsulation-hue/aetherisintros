/**
 * Reasoning layer: placement ranking, system velocity, relationship weather,
 * digital handshakes, connection chains and the unified relationship query.
 * Pure functions — no storage, no UI.
 */
import type { Member } from '../social'
import type {
  Circle, CompanyProfile, ConnectionChain, ContextCapsule, DigitalHandshake, IntentCard, OpenLoop,
  OrganizationRelationship, Outcome, Placement, PlacementStage, RelationshipWeather, SystemRecord, TriggerMemory, WeatherState,
} from './models'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const overlap = (a: string[], b: string[]) => {
  const lower = b.map(x => x.toLowerCase())
  return a.filter(x => lower.some(y => y.includes(x.toLowerCase()) || x.toLowerCase().includes(y))).length
}

/* --------------------------------------------------------- company fit report */

export interface CompanyFitDimension {
  label: string
  score: number
  weight: number
  evidence: string
}

export interface CompanyFitReport {
  score: number
  confidence: number
  verdict: 'Strong alignment' | 'Promising with conditions' | 'Exploratory fit' | 'Not enough alignment yet'
  dimensions: CompanyFitDimension[]
  strengths: string[]
  weaknesses: string[]
  unknowns: string[]
  collaborationIdeas: Array<{ title: string; detail: string; firstStep: string }>
  standard: string
}

/**
 * The Golden Fit Report scores the business-to-business case, not personal likability.
 * Every point is derived from visible systems, intent, relationship, timing and outcome evidence.
 */
export function assessCompanyFit(company: CompanyProfile, context: {
  members: Member[]
  systems: SystemRecord[]
  intents: IntentCard[]
  circles: Circle[]
  relationships: OrganizationRelationship[]
  outcomes: Outcome[]
}): CompanyFitReport {
  const people = context.members.filter(member => company.peopleIds.includes(member.id))
  const systems = context.systems.filter(system => company.relevantSystemIds.includes(system.id))
  const intents = context.intents.filter(intent => company.openIntentIds.includes(intent.id) && intent.status === 'active')
  const circles = context.circles.filter(circle => company.relatedCircleIds.includes(circle.id))
  const relationships = context.relationships.filter(relationship => relationship.companyName === company.name)
  const outcomes = context.outcomes.filter(outcome => outcome.companyName === company.name)
  const industryMatches = systems.filter(system => overlap(system.industries, [company.industry]) > 0 || system.bestFitCompanies.includes(company.name))
  const average = (values: number[], fallback: number) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
  const trust = clamp(average([
    ...relationships.map(relationship => relationship.strength),
    ...people.map(member => member.score.trust),
  ], 30))
  const strategic = clamp(25 + industryMatches.length * 22 + systems.length * 12 + circles.length * 7)
  const mutual = clamp(22 + intents.length * 22 + systems.filter(system => system.whoBenefits.length > 0).length * 12 + people.reduce((sum, member) => sum + Math.min(12, member.offers.length * 4), 0))
  const operating = clamp(28 + systems.reduce((sum, system) => sum + Math.min(18, system.proof.length * 7), 0) + outcomes.length * 18 - company.dormantOpportunities.length * 5)
  const timing = clamp(38 + intents.length * 24 + company.timeline.filter(item => /requested|active|adopted|offered|walkthrough/i.test(item.text)).length * 10 - company.dormantOpportunities.length * 9)
  const evidence = clamp(20 + company.previousConversations.length * 13 + relationships.length * 14 + outcomes.length * 22 + people.length * 5)
  const dimensions: CompanyFitDimension[] = [
    { label: 'Strategic alignment', score: strategic, weight: .25, evidence: industryMatches.length ? `${industryMatches.map(system => system.name).join(' and ')} match ${company.industry.toLowerCase()} priorities.` : `No system-to-industry match is proven yet.` },
    { label: 'Mutual value', score: mutual, weight: .2, evidence: intents.length ? `${intents.length} live intent${intents.length === 1 ? '' : 's'} show a current reason for both sides to engage.` : `No live intent inside ${company.name}; value is inferred from known needs.` },
    { label: 'Operating compatibility', score: operating, weight: .2, evidence: outcomes.length ? `${outcomes.length} recorded outcome${outcomes.length === 1 ? '' : 's'} provide operating evidence.` : `No completed shared outcome is recorded yet.` },
    { label: 'Relationship trust', score: trust, weight: .15, evidence: relationships.length ? `${relationships.length} organizational relationship${relationships.length === 1 ? '' : 's'} support the path.` : `The path depends on individual context rather than institutional trust.` },
    { label: 'Timing and readiness', score: timing, weight: .1, evidence: intents.length ? `Live intent makes the timing observable.` : `Timing is based on conversation and activity signals, not a declared buying window.` },
    { label: 'Evidence quality', score: evidence, weight: .1, evidence: `${company.previousConversations.length} conversation${company.previousConversations.length === 1 ? '' : 's'}, ${relationships.length} relationship record${relationships.length === 1 ? '' : 's'}, and ${outcomes.length} outcome${outcomes.length === 1 ? '' : 's'} inform this report.` },
  ]
  const score = clamp(dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0))
  const confidence = clamp(35 + Math.min(20, people.length * 5) + Math.min(20, relationships.length * 8) + Math.min(15, company.previousConversations.length * 6) + Math.min(10, outcomes.length * 10))
  const strengths = [
    ...(industryMatches.length ? [`Clear strategic overlap through ${industryMatches.map(system => system.name).join(' and ')}.`] : []),
    ...(trust >= 70 ? [`The relationship path is credible, with ${trust}/100 average trust evidence.`] : []),
    ...(intents.length ? [`A live intent creates a specific business reason to engage now.`] : []),
    ...(outcomes.length ? [`A recorded outcome reduces the risk of an untested partnership.`] : []),
    ...(circles.length ? [`${circles.length} shared circle${circles.length === 1 ? '' : 's'} can support context and accountability.`] : []),
  ].slice(0, 4)
  const weaknesses = [
    ...(intents.length === 0 ? [`No declared live intent confirms budget, ownership, or urgency.`] : []),
    ...(outcomes.length === 0 ? [`No shared commercial outcome has been verified.`] : []),
    ...(trust < 65 ? [`Institutional trust is still thin; the relationship may not survive beyond one contact.`] : []),
    ...company.dormantOpportunities.map(item => `Dormant: ${item}.`),
    ...(systems.length === 0 ? [`No current Aetheris system maps cleanly to this company.`] : []),
  ].slice(0, 4)
  const unknowns = [
    `Who owns the decision and who can stop it inside ${company.name}?`,
    ...(intents.length === 0 ? [`Whether the problem is funded or merely interesting.`] : []),
    ...(outcomes.length === 0 ? [`What evidence would make a first pilot defensible internally.`] : []),
    `Whether both companies agree on scope, pace, and the definition of success.`,
  ].slice(0, 3)
  const leadSystem = systems[0]
  const leadCircle = circles[0]
  const leadPerson = people.sort((a, b) => b.score.decisionInfluence - a.score.decisionInfluence)[0]
  const collaborationIdeas = [
    {
      title: leadSystem ? `Run a narrow ${leadSystem.name} proof` : `Start with a mutual diagnostic`,
      detail: leadSystem ? `Test one measurable problem before discussing a larger partnership. Success must be visible to both companies.` : `Compare one current operating problem and one useful capability from each side before proposing a commercial relationship.`,
      firstStep: leadPerson ? `Ask ${leadPerson.name} to name one outcome worth proving in 30 days.` : `Identify the accountable operator on both sides.`,
    },
    {
      title: leadCircle ? `Use ${leadCircle.name} as the trust room` : `Create a small operator working session`,
      detail: leadCircle ? `Pressure-test the fit with peers who understand the context, without turning the room into a sales channel.` : `Bring two operators together to challenge assumptions and expose conflicts early.`,
      firstStep: leadCircle ? `Share the problem statement with the circle moderator before inviting the company.` : `Agree what can be shared and what remains private.`,
    },
    {
      title: `Trade evidence before access`,
      detail: `Each company contributes one useful artifact, reference, or operating insight before requesting introductions or broader access.`,
      firstStep: leadSystem?.proof[0] ? `Lead with: ${leadSystem.proof[0]}.` : `Choose one proof point each side can verify independently.`,
    },
  ]
  const verdict: CompanyFitReport['verdict'] = score >= 78 ? 'Strong alignment' : score >= 62 ? 'Promising with conditions' : score >= 45 ? 'Exploratory fit' : 'Not enough alignment yet'
  return {
    score, confidence, verdict, dimensions, strengths, weaknesses, unknowns, collaborationIdeas,
    standard: 'Golden standard: evidence over enthusiasm. Strengths, weaknesses and unknowns stay visible until both sides verify them.',
  }
}

/* ------------------------------------------------------- placement candidates */

export interface PlacementCandidate {
  targetType: 'person' | 'circle'
  targetId: string
  targetLabel: string
  fitScore: number
  circleRelevance: number
  timingScore: number
  mutualValue: string
  trustPath: string[]
  friction: string
  expectedOutcome: string
  reasonFit: string
  reasonNow: string
  nextStep: string
  unknowns: string[]
  confidence: number
}

/** Ranks where a system should go next, using role, industry, intent and trust signals. */
export function rankPlacements(
  system: SystemRecord, members: Member[], circles: Circle[], intents: IntentCard[], existing: Placement[],
): PlacementCandidate[] {
  const taken = new Set(existing.filter(p => p.systemId === system.id).map(p => `${p.targetType}:${p.targetId}`))

  const people = members
    .filter(m => !taken.has(`person:${m.id}`))
    .map((m): PlacementCandidate => {
      const roleHit = overlap(system.bestFitRoles, [m.role, m.title]) ? 22 : 0
      const industryHit = overlap(system.industries, [m.industry]) ? 20 : 0
      const companyHit = system.bestFitCompanies.includes(m.company) ? 14 : 0
      const needHit = overlap(system.industries.concat(system.bestFitRoles), m.needs) ? 10 : 0
      const memberIntents = intents.filter(i => i.memberId === m.id && i.status === 'active')
      const intentHit = memberIntents.length ? 12 : 0
      const fit = clamp(34 + roleHit + industryHit + companyHit + needHit + intentHit + m.score.strategicFit / 12)
      const circleRelevance = clamp(
        40 + circles.filter(c => c.memberIds.includes(m.id) && overlap(c.sharedIntents, system.industries.concat([system.name])) > 0).length * 18 + m.score.mutualValue / 6,
      )
      const timing = clamp(m.score.timing + (memberIntents.some(i => i.urgency === 'high') ? 18 : 0) - Math.min(30, m.lastInteractionDays / 4))
      const path = m.bestPath.length > 2 ? m.bestPath : ['You', m.name]
      const topIntent = memberIntents[0]
      return {
        targetType: 'person', targetId: m.id, targetLabel: `${m.name} · ${m.company}`,
        fitScore: fit, circleRelevance, timingScore: timing,
        mutualValue: `${system.valueProposition} In return: ${m.offers[0] ?? 'access and candid feedback'}.`,
        trustPath: path,
        friction: path.length > 2 ? `Requires ${path[1]} to stay involved until the first conversation.` : system.expectedFriction,
        expectedOutcome: topIntent ? `Progress against their stated intent: ${topIntent.title.toLowerCase()}.` : `A first substantive conversation about ${system.name}.`,
        reasonFit: `${m.title} at ${m.company} sits inside ${system.industries[0]?.toLowerCase() ?? 'the target market'} and owns the outcome ${system.name} affects.`,
        reasonNow: topIntent ? topIntent.statement : m.whyNow,
        nextStep: path.length > 2 ? `Ask ${path[1]} whether ${m.name.split(' ')[0]} is the right person to involve first.` : `Send the shortest proof: ${system.proof[0] ?? system.valueProposition}`,
        unknowns: topIntent ? [] : [`Whether ${m.name.split(' ')[0]} currently owns this decision`],
        confidence: clamp((fit + timing) / 2 - (topIntent ? 0 : 12)),
      }
    })

  const rooms = circles
    .filter(c => !taken.has(`circle:${c.id}`))
    .map((c): PlacementCandidate => {
      const intentHit = overlap(c.sharedIntents, system.industries.concat(system.bestFitRoles, [system.name])) * 12
      const roleHit = overlap(c.rolesRepresented, system.bestFitRoles) * 10
      const fit = clamp(30 + intentHit + roleHit + c.relevanceScore / 5)
      return {
        targetType: 'circle', targetId: c.id, targetLabel: c.name,
        fitScore: fit, circleRelevance: c.relevanceScore, timingScore: clamp(c.relevanceScore - (c.purposeStatus === 'expiring' ? 25 : 0)),
        mutualValue: `The circle gets ${system.whoBenefits.toLowerCase()}; you reach several qualified people without cold outreach.`,
        trustPath: ['You', c.name],
        friction: 'Circle members compare notes, so a weak first engagement is expensive.',
        expectedOutcome: `Two qualified conversations from inside ${c.name}.`,
        reasonFit: `Shared intents overlap with ${system.name}: ${c.sharedIntents.slice(0, 2).join(', ')}.`,
        reasonNow: c.purposeStatus === 'expiring' ? 'Purpose is expiring — act before the room goes quiet.' : c.health,
        nextStep: `Share the method summary in ${c.name} before approaching any single member.`,
        unknowns: ['Whether moderators allow system sharing without approval'],
        confidence: clamp(fit - 8),
      }
    })

  return [...people, ...rooms].sort((a, b) => (b.fitScore + b.timingScore) - (a.fitScore + a.timingScore))
}

const stageWeight: Record<PlacementStage, number> = {
  Identified: 4, Qualified: 10, 'Warm Path Found': 18, 'Intro Requested': 26, Shared: 34,
  'Demo/Discussion': 50, Pilot: 70, Adopted: 90, Referred: 100, 'Closed/Not Now': 0,
}

/** Weighted rate at which a system moves through relevant circles — not impressions. */
export function systemVelocity(system: SystemRecord, placements: Placement[]) {
  const mine = placements.filter(p => p.systemId === system.id)
  if (!mine.length) return { score: 0, note: 'No placements yet. Velocity starts at the first qualified target.' }
  const weighted = mine.reduce((sum, p) => sum + stageWeight[p.stage], 0) / mine.length
  const moved = mine.filter(p => p.history.length > 1).length
  const score = clamp(weighted * 0.75 + (moved / mine.length) * 25)
  const note = score >= 70
    ? 'Moving well — most placements have advanced at least one stage.'
    : score >= 40
      ? 'Progressing, but several placements are stalled before a conversation.'
      : 'Stalled — placements are identified but not moving.'
  return { score, note }
}

export function funnel(system: SystemRecord, placements: Placement[]) {
  const mine = placements.filter(p => p.systemId === system.id)
  const at = (stages: PlacementStage[]) => mine.filter(p => stages.includes(p.stage)).length
  const reached = (min: number) => mine.filter(p => stageWeight[p.stage] >= min).length
  return [
    { label: 'Created', count: 1 },
    { label: 'Placed', count: mine.length },
    { label: 'Conversation', count: reached(stageWeight['Demo/Discussion']) + at(['Intro Requested', 'Shared']) },
    { label: 'Introduction', count: reached(stageWeight['Intro Requested']) },
    { label: 'Demonstration', count: reached(stageWeight['Demo/Discussion']) },
    { label: 'Adoption', count: reached(stageWeight.Adopted) },
    { label: 'Referral', count: reached(stageWeight.Referred) },
  ]
}

/* --------------------------------------------------------- relationship weather */

export function deriveWeather(member: Member, loops: OpenLoop[], stored?: RelationshipWeather): RelationshipWeather {
  if (stored) return stored
  const open = loops.filter(l => l.memberId === member.id && l.status === 'open')
  const days = member.lastInteractionDays
  const state: WeatherState =
    days > 90 ? 'Dormant'
      : open.some(l => l.owner === 'me' && l.priority === 'high') && days > 30 ? 'At Risk'
        : days > 35 ? 'Cooling'
          : open.some(l => l.owner === 'them') ? 'Waiting'
            : days <= 10 && member.score.relationshipStrength >= 70 ? 'Active'
              : member.score.trust >= 80 ? 'Warm' : 'Building'
  const why =
    state === 'At Risk' ? `You owe ${member.name.split(' ')[0]} something from ${days} days ago.`
      : state === 'Cooling' ? `Strong previous conversation, ${days} days since the last exchange.`
        : state === 'Dormant' ? `No exchange in ${days} days and no live reason to reopen yet.`
          : state === 'Waiting' ? `The next move belongs to ${member.name.split(' ')[0]}.`
            : state === 'Active' ? `Exchanged in the last ${days} days with a live thread.`
              : state === 'Warm' ? 'High trust, steady reciprocity, nothing outstanding.'
                : 'Early relationship. Context is still accumulating.'
  return {
    id: `w-${member.id}`, memberId: member.id, state, why,
    formation: member.score.relationshipStrength, momentum: clamp(100 - days * 1.5),
    depth: member.score.trust, recencyDays: days, reciprocity: clamp(member.score.mutualValue),
    trust: member.score.trust, openLoops: open.length, contextAccumulated: member.tags.length + member.expertise.length,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}

export const weatherTone: Record<WeatherState, 'good' | 'watch' | 'risk'> = {
  Building: 'watch', Warm: 'good', Active: 'good', Waiting: 'watch',
  Cooling: 'watch', Dormant: 'watch', Reawakening: 'good', 'At Risk': 'risk',
}

/* --------------------------------------------------------- digital handshake */

export function buildHandshake(member: Member, intents: IntentCard[], myIntents: IntentCard[], weather: RelationshipWeather): DigitalHandshake {
  const theirs = intents.filter(i => i.memberId === member.id && i.status === 'active')
  const mine = myIntents.filter(i => i.status === 'active')
  const shared = overlap(member.expertise.concat(member.needs), mine.flatMap(i => [i.title, i.audience]))
  const justified: DigitalHandshake['justified'] =
    theirs.length && shared ? 'Yes' : theirs.length || shared ? 'Maybe' : 'Not Yet'
  return {
    id: `hs-${member.id}`, aId: 'me', bId: member.id, justified,
    mutualValue: `${member.name.split(' ')[0]} can move ${member.offers[0]?.toLowerCase() ?? 'a decision you care about'}; you can move ${mine[0]?.valueOffered.toLowerCase() ?? 'evidence they can use'}.`,
    sharedContext: [
      member.mutuals.length ? `Mutual: ${member.mutuals.join(', ')}` : 'No mutual connection yet — the path is longer',
      `Both active in ${member.industry.toLowerCase()}`,
      theirs[0] ? `Their live intent: ${theirs[0].title}` : 'No active intent posted',
    ],
    timing: theirs.some(i => i.urgency === 'high') ? 'They posted a time-sensitive intent in the last fortnight.' : member.whyNow,
    potentialConflict: member.dontDo,
    safeToShare: [mine[0]?.title ?? 'Your current focus', 'Your stated value offer', 'Any public proof point'],
    privateContextUsed: Math.max(1, weather.openLoops + 2),
    whatAGets: `A conversation with ${member.title.toLowerCase()} where the reason already exists.`,
    whatBGets: theirs[0] ? `Progress on: ${theirs[0].statement}` : `${member.nextAction}`,
    whyNow: member.whyNow,
    confidence: clamp((member.scoreTotal + weather.trust) / 2),
    aApproved: false, bApproved: false, createdAt: new Date().toISOString().slice(0, 10),
  }
}

export function buildCapsule(member: Member, handshake: DigitalHandshake, intents: IntentCard[]): ContextCapsule {
  const theirs = intents.filter(i => i.memberId === member.id && i.status === 'active')
  return {
    id: `cap-${member.id}`, introId: handshake.id, memberId: member.id,
    whyMeeting: `${handshake.whyNow} ${handshake.mutualValue}`,
    commonGround: handshake.sharedContext,
    mutualValue: handshake.mutualValue,
    startHere: member.nextAction,
    helpA: member.offers,
    helpB: theirs.map(i => i.valueOffered).filter(Boolean).length ? theirs.map(i => i.valueOffered) : ['Context and candid feedback'],
    currentIntents: theirs.map(i => `${member.name.split(' ')[0]}: ${i.title}`),
    connectedBy: member.bestPath.length > 2 ? (member.bestPath[1] ?? 'Direct') : 'Direct — no intermediary',
    items: [
      { id: 'c1', label: 'Why this conversation exists', value: handshake.whyNow, shared: true, scope: 'shareable' },
      { id: 'c2', label: 'What you can help with', value: member.offers.join(' · '), shared: true, scope: 'public' },
      { id: 'c3', label: 'Mutual value', value: handshake.mutualValue, shared: true, scope: 'shareable' },
      { id: 'c4', label: 'Your private read on timing', value: 'Held privately. Influences relevance only.', shared: false, scope: 'private' },
    ],
    protected: ['Private notes on this relationship', 'Any third-party assessment', 'Commercial floors and internal constraints'],
    createdAt: new Date().toISOString().slice(0, 10),
  }
}

/* --------------------------------------------------------- connection chains */

export function deriveChain(member: Member, members: Member[], stored?: ConnectionChain): ConnectionChain {
  if (stored) return stored
  const middleName = member.bestPath.length > 2 ? member.bestPath[1] : member.mutuals[0]
  const middle = members.find(m => m.name === middleName)
  const steps: ConnectionChain['steps'] = [
    { personId: 'me', name: 'You', strength: 100, trust: 100, relevance: 100, consent: 'agreed', note: 'You hold the reason for the conversation.' },
  ]
  if (middle) {
    steps.push({
      personId: middle.id, name: middle.name, strength: middle.score.relationshipStrength, trust: middle.score.trust,
      relevance: member.score.strategicFit, consent: 'not asked', note: `${middle.title} at ${middle.company}. Knows both sides.`,
    })
  } else if (middleName) {
    steps.push({ personId: `ext-${middleName}`, name: middleName, strength: 60, trust: 65, relevance: 70, consent: 'not asked', note: 'Outside your member graph but named in shared context.' })
  }
  steps.push({
    personId: member.id, name: member.name, strength: member.score.relationshipStrength, trust: member.score.trust,
    relevance: member.score.strategicFit, consent: 'not asked', note: `${member.title} at ${member.company}.`,
  })
  const hop = steps[1]
  return {
    id: `ch-${member.id}`, targetId: member.id, steps, state: steps.length > 2 ? 'mapped' : 'complete',
    recommendation: hop && hop.personId !== member.id
      ? `Do not ask ${hop.name.split(' ')[0]} for ${member.name}. Ask whether ${member.name.split(' ')[0]} is the right person to involve, and who else should be in the room.`
      : 'No intermediary needed. Approach directly with a specific reason.',
    bestNextHop: hop && hop.personId !== member.id ? hop.name : `Direct to ${member.name}`,
  }
}

/* ------------------------------------------------------- unified query layer */

export interface QueryAnswer {
  answer: string
  evidence: string[]
  unknowns: string[]
  nextAction: string
  people: Member[]
  items: Array<{ kind: string; label: string; detail: string }>
}

export interface QueryContext {
  members: Member[]
  systems: SystemRecord[]
  placements: Placement[]
  circles: Circle[]
  intents: IntentCard[]
  loops: OpenLoop[]
  triggers: TriggerMemory[]
  outcomes: Outcome[]
}

/** Answers relationship questions across people, systems, circles, intents, loops and memory. */
export function answerQuery(query: string, ctx: QueryContext): QueryAnswer {
  const q = query.toLowerCase()
  const terms = q.split(/\s+/).filter(t => t.length > 3)
  const item = (kind: string, label: string, detail: string) => ({ kind, label, detail })

  if (/place|placement/.test(q) && /system|golden|obsidian|digital you|intros/.test(q)) {
    const system = ctx.systems.find(s => q.includes(s.name.toLowerCase())) ?? ctx.systems[0]!
    const ranked = rankPlacements(system, ctx.members, ctx.circles, ctx.intents, ctx.placements).slice(0, 3)
    return {
      answer: `${system.name} should go where the outcome it affects is already owned and timed. Three targets qualify now.`,
      evidence: ranked.map(r => `${r.targetLabel} — fit ${r.fitScore}, timing ${r.timingScore}. ${r.reasonNow}`),
      unknowns: ranked.flatMap(r => r.unknowns).slice(0, 2),
      nextAction: ranked[0]?.nextStep ?? system.placementGoal,
      people: ranked.filter(r => r.targetType === 'person').map(r => ctx.members.find(m => m.id === r.targetId)!).filter(Boolean),
      items: ranked.map(r => item(r.targetType === 'circle' ? 'Circle' : 'Person', r.targetLabel, r.reasonFit)),
    }
  }

  if (/velocity/.test(q)) {
    const ranked = ctx.systems.map(s => ({ s, v: systemVelocity(s, ctx.placements) })).sort((a, b) => b.v.score - a.v.score)
    const top = ranked[0]!
    return {
      answer: `${top.s.name} has the highest placement velocity at ${top.v.score}. ${top.v.note}`,
      evidence: ranked.slice(0, 4).map(r => `${r.s.name}: velocity ${r.v.score} · ${r.s.activePlacements} active placements`),
      unknowns: ['Velocity is weighted by stage movement, so a single stalled pilot can mask real progress.'],
      nextAction: `Move the oldest stalled placement on ${top.s.name} one stage this week.`,
      people: [], items: ranked.slice(0, 4).map(r => item('System', r.s.name, r.v.note)),
    }
  }

  if (/relevant|changed|trigger/.test(q)) {
    const live = ctx.triggers.filter(t => t.status === 'new')
    return {
      answer: live.length
        ? `${live.length} pieces of stored context just became relevant because something changed on the other side.`
        : 'Nothing in memory has been reactivated by an event recently.',
      evidence: live.map(t => `${t.matchedEvent} — previously: “${t.sourceMemory}”`),
      unknowns: live.filter(t => t.confidence < 75).map(t => `Confidence on ${t.matchedEvent} is only ${t.confidence}.`),
      nextAction: live[0]?.recommendedAction ?? 'No action needed yet.',
      people: live.map(t => ctx.members.find(m => m.id === t.memberId)!).filter(Boolean),
      items: live.map(t => item('Trigger', t.matchedEvent, t.recommendedAction)),
    }
  }

  if (/help today|can i help|give/.test(q)) {
    const helpable = ctx.intents.filter(i => i.status === 'active' && i.memberId !== 'me' && /NEED|HIRING|BUYING|EXPLORING/.test(i.type)).slice(0, 4)
    return {
      answer: 'Four members have posted something you can move today without asking for anything.',
      evidence: helpable.map(i => `${ctx.members.find(m => m.id === i.memberId)?.name ?? 'Member'}: ${i.title}`),
      unknowns: ['Whether they already solved it privately.'],
      nextAction: `Offer the one thing you actually have: ${helpable[0] ? helpable[0].audience.toLowerCase() : 'a relevant introduction'}.`,
      people: helpable.map(i => ctx.members.find(m => m.id === i.memberId)!).filter(Boolean),
      items: helpable.map(i => item(i.type, i.title, i.statement)),
    }
  }

  if (/open loop|blocking|follow.?up|owe/.test(q)) {
    const open = ctx.loops.filter(l => l.status === 'open').sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1))
    const worst = open[0]
    return {
      answer: worst
        ? `${worst.title} is the loop blocking the most value. ${worst.evidence}`
        : 'No open loops. Everything promised has been delivered.',
      evidence: open.slice(0, 4).map(l => `${l.title} — ${l.owner === 'me' ? 'yours' : l.owner === 'them' ? 'theirs' : 'shared'} · ${l.evidence}`),
      unknowns: open.filter(l => l.trigger).map(l => `${l.title} waits on: ${l.trigger}`),
      nextAction: worst ? `Close it today: ${worst.title}.` : 'Nothing outstanding.',
      people: open.slice(0, 3).map(l => ctx.members.find(m => m.id === l.memberId)!).filter(Boolean),
      items: open.slice(0, 5).map(l => item('Open loop', l.title, l.evidence)),
    }
  }

  if (/circle|room/.test(q)) {
    const ranked = [...ctx.circles].sort((a, b) => b.relevanceScore - a.relevanceScore)
    return {
      answer: `${ranked[0]!.name} is the most relevant room to you right now: ${ranked[0]!.purpose}`,
      evidence: ranked.slice(0, 4).map(c => `${c.name} — relevance ${c.relevanceScore} · ${c.health}`),
      unknowns: ranked.filter(c => c.purposeStatus === 'expiring').map(c => `${c.name} may have completed its purpose.`),
      nextAction: `Share the reason you are there before asking anything of ${ranked[0]!.name}.`,
      people: [], items: ranked.slice(0, 4).map(c => item('Circle', c.name, c.purpose)),
    }
  }

  if (/reach|company|door/.test(q)) {
    return {
      answer: 'Reaching a company is a chain problem, not a contact problem. Ask the intermediary who should be involved, not for the final name.',
      evidence: ctx.members.filter(m => m.bestPath.length > 2).slice(0, 4).map(m => `${m.company} — via ${m.bestPath[1]} to ${m.name}`),
      unknowns: ['Whether each intermediary is willing to be named right now.'],
      nextAction: 'Open Companies, pick the company, and use the strongest entry shown.',
      people: ctx.members.filter(m => m.bestPath.length > 2).slice(0, 3),
      items: [],
    }
  }

  const cooling = /cool|dormant|risk|quiet|lost/.test(q)
  const ranked = [...ctx.members]
    .map(p => {
      const text = `${p.name} ${p.title} ${p.company} ${p.industry} ${p.role} ${p.focus} ${p.needs.join(' ')} ${p.offers.join(' ')} ${p.location}`.toLowerCase()
      const match = terms.filter(t => text.includes(t)).length * 14
      const timing = cooling ? Math.min(p.lastInteractionDays, 120) : p.score.timing / 4
      return { p, rank: p.scoreTotal + match + timing }
    })
    .sort((a, b) => b.rank - a.rank).slice(0, 3).map(x => x.p)
  return {
    answer: cooling
      ? 'These relationships are cooling: real prior strength, no recent contact. Reactivate with something useful before asking for anything.'
      : 'Three relationships justify attention now — strategic fit plus a current timing signal. The rest of the graph should stay untouched.',
    evidence: ranked.map(p => `${p.name} — ${p.whyNow}`),
    unknowns: ['Whether any of them is already evaluating another option.'],
    nextAction: ranked[0] ? ranked[0].nextAction : 'Post an intent so the graph has something to match.',
    people: ranked, items: [],
  }
}
