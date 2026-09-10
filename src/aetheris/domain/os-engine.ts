/**
 * Relationship OS engine — pure, explainable derivations.
 *
 * Rules that hold across every function here:
 *  - no fabricated probability precision: qualitative bands with evidence
 *  - every recommendation names its reason so an Evidence Drawer can open it
 *  - private inference never crosses a permission boundary
 */
import type { Member } from '../social'
import type { OpenLoop, TriggerMemory } from './models'
import type {
  AutopilotAction, Band, CaptureProposal, EvidenceItem, IntroQualityReview, IntroVerdict,
  LatentNetworkPath, NetworkSimulation, NetworkStrategy, OpportunityCollision, OpportunityRoom,
  RelationshipInboxItem, RelationshipTwin, SimulationInput, TrustBudgetState, VoiceMemoryCapture,
} from './os-models'

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const today = () => new Date().toISOString().slice(0, 10)
const band = (n: number): Band => (n >= 70 ? 'High' : n >= 45 ? 'Medium' : 'Low')

/* ------------------------------------------------------------ trust budget */

export interface TrustAdvice {
  shortestConnector?: TrustBudgetState
  healthiestConnector?: TrustBudgetState
  sentence: string
  caution: string[]
}

/** Plain-language connector guidance: shortest path vs healthiest path. */
export function trustAdvice(budgets: TrustBudgetState[], candidateIds: string[]): TrustAdvice {
  const pool = budgets.filter(b => candidateIds.length === 0 || candidateIds.includes(b.connectorId))
  const score = (b: TrustBudgetState) =>
    (b.health === 'healthy' ? 40 : b.health === 'watch' ? 15 : 0)
    + Math.min(30, b.lastAskDaysAgo / 3)
    + b.reciprocityEvents * 6
    + (b.outcomeQuality === 'High' ? 14 : b.outcomeQuality === 'Medium' ? 7 : 0)
    - b.requestsThisMonth * 10
    - b.declined * 8
  const byStrength = [...pool].sort((a, b) => (b.accepted + b.reciprocityEvents) - (a.accepted + a.reciprocityEvents))
  const byHealth = [...pool].sort((a, b) => score(b) - score(a))
  const shortest = byStrength[0]
  const healthiest = byHealth[0]
  const caution = pool.filter(b => b.health !== 'healthy').map(b =>
    `${b.connectorName}: ${b.requestsThisMonth} ask${b.requestsThisMonth === 1 ? '' : 's'} this month, ${b.reciprocityEvents < 0 ? 'you owe them' : `${b.reciprocityEvents} reciprocity event${b.reciprocityEvents === 1 ? '' : 's'}`}.`)
  const sentence = !shortest || !healthiest
    ? 'No connector history yet. Start with the relationship you have actually invested in.'
    : shortest.connectorId === healthiest.connectorId
      ? `${shortest.connectorName} is both the shortest and the healthier path — one ask, made properly.`
      : `${shortest.connectorName} is the shortest path, but ${healthiest.connectorName} is the healthier path. You asked ${shortest.connectorName} ${shortest.requestsThisMonth} time${shortest.requestsThisMonth === 1 ? '' : 's'} this month; ${healthiest.connectorName} has a strong direct relationship and no recent asks from you.`
  return { ...(shortest ? { shortestConnector: shortest } : {}), ...(healthiest ? { healthiestConnector: healthiest } : {}), sentence, caution }
}

/* ------------------------------------------- introduction quality control */

export function reviewIntro(input: {
  person: Member
  mutualValueText: string
  contextText: string
  budgets: TrustBudgetState[]
  recentDeclines: number
}): IntroQualityReview {
  const { person, mutualValueText, contextText, budgets, recentDeclines } = input
  const connector = person.bestPath[1]
  const connectorBudget = budgets.find(b => b.connectorName === connector)
  const checks: IntroQualityReview['checks'] = [
    {
      key: 'mutual', label: 'Mutual value', pass: mutualValueText.trim().length > 40,
      reason: mutualValueText.trim().length > 40 ? 'Both sides gain something nameable.' : 'Only one side has a stated reason to meet.',
      fix: 'Write what the other person gains in one sentence.',
    },
    {
      key: 'specific', label: 'Specificity', pass: contextText.trim().length > 120,
      reason: contextText.trim().length > 120 ? 'The request is specific enough to act on.' : 'The note is too general to forward as written.',
      fix: 'Name the decision, the timing and the one question worth answering.',
    },
    {
      key: 'timing', label: 'Timing', pass: person.score.timing >= 55,
      reason: person.score.timing >= 55 ? `A live timing signal: ${person.whyNow}` : 'No current event makes this the right week.',
      fix: 'Wait for the trigger already recorded in memory, or state the timing plainly.',
    },
    {
      key: 'permission', label: 'Permission', pass: person.introState !== 'closed',
      reason: person.introState !== 'closed' ? 'Nothing on record refuses this contact.' : 'This introduction was previously closed.',
      fix: 'Leave it. A second ask after a decline costs more than the intro is worth.',
    },
    {
      key: 'trust', label: 'Trust path', pass: person.bestPath.length > 1,
      reason: person.bestPath.length > 1 ? `Warm path: ${person.bestPath.join(' → ')}` : 'No credible path — this would arrive cold.',
      fix: 'Find a contextual path first, or earn the relationship directly.',
    },
    {
      key: 'budget', label: 'Connector health', pass: !connectorBudget || connectorBudget.health !== 'strained',
      reason: connectorBudget
        ? `${connectorBudget.connectorName}: ${connectorBudget.health}. ${connectorBudget.guidance}`
        : 'No connector is being spent for this introduction.',
      fix: 'Use the healthier connector, or give before you ask again.',
    },
    {
      key: 'declines', label: 'Recent declines', pass: recentDeclines < 2,
      reason: recentDeclines < 2 ? 'No pattern of recent refusals.' : `${recentDeclines} declines recently — the pattern matters more than this request.`,
      fix: 'Pause introductions and give value for a fortnight.',
    },
  ]
  const passed = checks.filter(c => c.pass).length
  const score = Math.round((passed / checks.length) * 100)
  const timingFailed = !checks.find(c => c.key === 'timing')!.pass
  const hardFailed = !checks.find(c => c.key === 'permission')!.pass || !checks.find(c => c.key === 'trust')!.pass
  const verdict: IntroVerdict = hardFailed ? 'Do Not Send Yet'
    : passed === checks.length ? 'Ready'
      : timingFailed && passed >= checks.length - 2 ? 'Poor Timing'
        : 'Needs Context'
  return {
    id: uid('iqr'), ownerId: 'me', memberId: person.id, verdict, score, checks,
    missingContext: checks.filter(c => !c.pass && c.fix).map(c => c.fix!),
    trustBudgetNote: connectorBudget?.guidance ?? 'No connector cost for this introduction.',
    evidenceIds: [], reviewedAt: today(),
  }
}

/* --------------------------------------------------------------- simulation */

export function runSimulation(input: SimulationInput, ctx: {
  people: Member[]
  budgets: TrustBudgetState[]
  circleNames: Record<string, string>
}): NetworkSimulation {
  const { people, budgets } = ctx
  const industries = input.industries.map(i => i.toLowerCase())
  const relevant = people.filter(p =>
    !input.excludedPersonIds.includes(p.id)
    && (industries.length === 0 || industries.some(i => p.industry.toLowerCase().includes(i) || i.includes(p.industry.toLowerCase())))
    && (!input.geography.trim() || p.location.toLowerCase().includes(input.geography.toLowerCase().split(',')[0]!.trim()) || input.geography.length > 12))
  const connectors = [...(relevant.length ? relevant : people)]
    .sort((a, b) => (b.score.trust + b.mutuals.length * 4) - (a.score.trust + a.mutuals.length * 4))
    .slice(0, 3)
  const coverage = relevant.length / Math.max(1, input.targetCount)
  const frictionScore = Math.round(Math.min(100, 30 + Math.max(0, input.targetCount - relevant.length) * 4))
  const advice = trustAdvice(budgets, connectors.map(c => c.id))
  const paths: NetworkSimulation['likelyPaths'] = [
    ...connectors.map((c, i) => ({
      id: uid('sp'), label: i === 0 ? 'One relationship, one proof, then the rest' : `Path through ${c.company}`,
      connectorId: c.id, connectorName: c.name,
      reach: band(c.score.decisionInfluence), friction: band(100 - c.score.trust), trustCost: band(100 - c.score.relationshipStrength),
      note: `${c.whyThem} Best used once, with the reason written down.`,
    })),
    { id: uid('sp'), label: `Direct outreach to ${input.targetCount} targets`, connectorName: 'None', reach: 'Low', friction: 'High', trustCost: 'High', note: 'This is the version that looks like selling. Expect silence.' },
  ]
  return {
    id: uid('sim'), ownerId: 'me',
    question: `How do I move ${input.thingToMove || 'this'} to ${input.targetCount} ${input.audience || 'people'}?`,
    input, likelyPaths: paths,
    strongestConnectorIds: connectors.map(c => c.id),
    targetCircleIds: input.allowedCircleIds,
    estimatedFriction: band(frictionScore),
    bottlenecks: [
      coverage < 0.5 ? `Only ${relevant.length} credible relationships exist against a target of ${input.targetCount}.` : 'Relationship coverage is adequate; proof is the constraint.',
      'No published reference outcome for this audience yet.',
      connectors.length < 3 ? 'Too few connectors — the path concentrates on one person.' : 'Connector load must be spread across at least three relationships.',
    ],
    trustWarnings: advice.caution.length ? advice.caution : ['No connector is currently strained.'],
    sequence: [
      'Write the one artefact the audience would forward without you.',
      `Place it once — inside ${connectors[0]?.company ?? 'a single credible target'}.`,
      input.allowedCircleIds.length ? `Publish the outcome to ${ctx.circleNames[input.allowedCircleIds[0]!] ?? 'the relevant circle'}.` : 'Publish the outcome where the audience already gathers.',
      `Only then ask for targets two through ${input.targetCount}.`,
    ],
    requiredProof: ['One completed engagement with a named result', 'A one-page summary written for the audience, not for you'],
    systemsNeeded: input.systemId ? [input.thingToMove, 'Delivery capacity for the first placement'] : [input.thingToMove || 'The thing being moved'],
    relationshipGaps: [
      `${Math.max(0, input.targetCount - relevant.length)} of ${input.targetCount} relationships do not exist yet.`,
      'No finance-side relationships inside the target set.',
    ],
    confidence: coverage > 0.7 ? 'Medium' : 'Low',
    uncertainty: [
      'Whether any target has already committed to an alternative this cycle.',
      'Appetite is inferred from stated intents, not confirmed budget.',
      relevant.length < 4 ? 'The relationship sample is small; treat all bands as directional.' : 'Bands are directional, not probabilities.',
    ],
    evidenceIds: [], createdAt: today(),
  }
}

export function strategyFromSimulation(sim: NetworkSimulation, people: Member[]): NetworkStrategy {
  return {
    id: uid('strat'), ownerId: 'me',
    goal: `${sim.input.targetCount} ${sim.input.audience || 'relationships'} by ${sim.input.horizon || 'the end of the horizon'}`,
    relationshipType: sim.input.audience || 'Relationship', industry: sim.input.industries[0] ?? '',
    geography: sim.input.geography, targetCount: sim.input.targetCount, horizon: sim.input.horizon,
    systemIds: sim.input.systemId ? [sim.input.systemId] : [], preferredCircleIds: sim.input.allowedCircleIds,
    constraints: ['No mass outreach', 'One ask per connector per month'],
    progressPersonIds: [], gaps: sim.relationshipGaps,
    strongestPaths: sim.strongestConnectorIds.map(id => {
      const person = people.find(p => p.id === id)
      return { ...(person ? { personId: person.id } : {}), label: person ? `${person.name} — ${person.company}` : 'Connector', strength: band(person?.score.trust ?? 50), note: person?.whyThem ?? '' }
    }),
    nextMoves: sim.sequence.map(text => ({ id: uid('sm'), text, done: false })),
    fromSimulationId: sim.id, visibility: 'private', createdAt: today(), updatedAt: today(),
  }
}

/** Map the current network against a strategy's target network. */
export function strategyProgress(strategy: NetworkStrategy, people: Member[]) {
  const matches = people.filter(p =>
    (!strategy.industry || p.industry.toLowerCase().includes(strategy.industry.toLowerCase()))
    && (!strategy.geography || strategy.geography.length > 12 || p.location.toLowerCase().includes(strategy.geography.toLowerCase())))
  const held = matches.filter(p => strategy.progressPersonIds.includes(p.id))
  const candidates = matches.filter(p => !strategy.progressPersonIds.includes(p.id)).sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 4)
  return {
    held, candidates,
    percent: Math.min(100, Math.round((held.length / Math.max(1, strategy.targetCount)) * 100)),
    missing: Math.max(0, strategy.targetCount - held.length),
  }
}

/* -------------------------------------------------------- relationship twin */

/** Build a twin from live relationship context when none is stored yet. */
export function deriveTwin(person: Member, ctx: { loops: OpenLoop[]; triggers: TriggerMemory[] }): RelationshipTwin {
  const loops = ctx.loops.filter(l => l.memberId === person.id && l.status === 'open')
  const triggers = ctx.triggers.filter(t => t.memberId === person.id)
  const cooling = person.lastInteractionDays > 30
  return {
    id: `twin-${person.id}`, memberId: person.id, ownerId: 'me',
    communicationStyle: `${person.role === 'Investor' ? 'Analytical; wants the model before the story.' : 'Direct; prefers a written reason before a call.'}`,
    responsiveness: cooling ? 'Slow lately — nothing exchanged in over a month.' : 'Responsive when the ask is specific.',
    trustHistory: `${person.relationshipStatus === 'strong' ? 'Proven. Has acted on your behalf before.' : 'Warm but unproven — no favours either way yet.'}`,
    weather: cooling ? 'Cooling' : person.relationshipStatus === 'strong' ? 'Active' : 'Building',
    preferredIntroStyle: 'A private note with the reason first, names second.',
    currentIntents: person.needs.slice(0, 2), energyTopics: person.tags.slice(0, 3),
    frictionPatterns: [person.dontDo].filter(Boolean),
    commitments: loops.map(l => l.title),
    meetingStyle: '30 minutes, no slides, a decision at the end.',
    timingWindows: [person.whyNow].filter(Boolean),
    openLoopIds: loops.map(l => l.id), sharedSystemIds: [], sharedCircleIds: [],
    outcomeHistory: [], lastMeaningfulInteraction: `${person.lastInteractionDays} days ago`,
    whatWorks: ['Lead with the reason, not the request', `Speak to ${person.needs[0] ?? 'their stated need'}`, 'One ask per message'],
    whatToAvoid: [person.dontDo || 'Stacking two requests into one message'],
    bestNextMove: person.nextAction,
    whatChanged: triggers.map(t => t.matchedEvent),
    inferences: [
      { id: uid('ti'), label: 'Timing', value: person.whyNow, sourceType: 'derived', sourceLabel: 'Signals and activity', confidence: person.score.timing, scope: 'private' },
      { id: uid('ti'), label: 'Trust posture', value: person.relationshipStatus, sourceType: 'derived', sourceLabel: 'Interaction history', confidence: person.score.trust, scope: 'private' },
    ],
    scope: 'private', updatedAt: today(),
  }
}

/* -------------------------------------------------------------- inbox order */

export function orderInbox(items: RelationshipInboxItem[], lane: string) {
  return items
    .filter(i => i.status === 'open')
    .filter(i => lane === 'All' || i.lanes.includes(lane as RelationshipInboxItem['lanes'][number]))
    .sort((a, b) => b.priority - a.priority)
}

/* ---------------------------------------------------- voice → network memory */

const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** Parse a spoken or typed capture into reviewable proposals. Nothing saves automatically. */
export function parseCapture(transcript: string, people: Member[]): VoiceMemoryCapture {
  const text = transcript.trim()
  const lower = text.toLowerCase()
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  const mentioned = people.filter(p => {
    const first = p.name.split(' ')[0]!.toLowerCase()
    return lower.includes(p.name.toLowerCase()) || new RegExp(`\\b${first}\\b`).test(lower)
  })
  const primary = mentioned[0]
  const secondary = mentioned[1]
  const proposals: CaptureProposal[] = []
  const add = (p: Omit<CaptureProposal, 'id' | 'approved' | 'rejected'>) =>
    proposals.push({ ...p, id: uid('cp'), approved: false, rejected: false })

  if (primary) {
    add({
      kind: 'memory', summary: `Record what changed about ${primary.name}`,
      detail: sentences[0] ?? text, personId: primary.id, scope: 'private', confidence: 82,
    })
  }
  const expansion = /(second|new|another) (facility|plant|site|office|location)|expanding|opening/.test(lower)
  if (expansion) {
    add({
      kind: 'company update', summary: `${primary?.company ?? 'Their company'} is expanding capacity`,
      detail: sentences.find(s => /facility|plant|site|office|location|expand|open/i.test(s)) ?? text,
      ...(primary ? { personId: primary.id } : {}), scope: 'team', confidence: 74,
    })
    add({
      kind: 'opportunity room', summary: `Open a room for the ${primary?.company ?? 'expansion'} opportunity`,
      detail: 'Capacity changes create a window where a diagnosis is worth more than a pitch.',
      ...(primary ? { personId: primary.id } : {}), scope: 'private', confidence: 66,
    })
  }
  const month = monthNames.find(m => lower.includes(m))
  const timing = /after (his|her|their) (board|quarter|review|meeting)|next (spring|quarter|month|year)|in \w+/.test(lower)
  if (month || timing) {
    add({
      kind: 'trigger memory', summary: `Come back ${month ? `in ${month[0]!.toUpperCase()}${month.slice(1)}` : 'after the event mentioned'}`,
      detail: sentences.find(s => /after|next|month|board|meeting/i.test(s)) ?? text,
      ...(primary ? { personId: primary.id } : {}), scope: 'private', confidence: 78,
    })
  }
  if (/wants to talk|call me|follow up|send|owe|promised/.test(lower) || timing) {
    add({
      kind: 'open loop', summary: `Follow up with ${primary?.name.split(' ')[0] ?? 'them'} at the right time`,
      detail: 'A commitment recorded from a conversation, held until the trigger arrives.',
      ...(primary ? { personId: primary.id } : {}), scope: 'private', confidence: 80,
    })
  }
  if (secondary || /might know|knows|introduce|connected to/.test(lower)) {
    add({
      kind: 'connection chain', summary: secondary ? `${secondary.name} may hold a path` : 'A possible path was mentioned',
      detail: sentences.find(s => /know|introduce|connect/i.test(s)) ?? text,
      ...(secondary ? { personId: secondary.id } : {}), scope: 'private', confidence: 58,
    })
  }
  if (primary) {
    add({
      kind: 'person update', summary: `Update ${primary.name}'s current focus`,
      detail: sentences[sentences.length - 1] ?? text, personId: primary.id, scope: 'private', confidence: 61,
    })
  }
  if (!proposals.length) {
    add({ kind: 'memory', summary: 'Record this as relationship context', detail: text, scope: 'private', confidence: 50 })
  }
  return { id: uid('vc'), ownerId: 'me', transcript: text, method: 'text', proposals, status: 'review', createdAt: today() }
}

/* -------------------------------------------------------- evidence resolving */

export function resolveEvidence(all: EvidenceItem[], ids: string[]) {
  return ids.map(id => all.find(e => e.id === id)).filter((e): e is EvidenceItem => Boolean(e))
}

/* ------------------------------------------------------------ home strips */

export interface HomeStripData {
  attention: RelationshipInboxItem[]
  collisions: OpportunityCollision[]
  canHelp: Member[]
  systemsWorthPlacing: OpportunityRoom[]
  strategies: NetworkStrategy[]
  newContext: EvidenceItem[]
  autopilotCount: number
}

export function homeStrips(input: {
  inbox: RelationshipInboxItem[]
  collisions: OpportunityCollision[]
  rooms: OpportunityRoom[]
  strategies: NetworkStrategy[]
  evidence: EvidenceItem[]
  autopilot: AutopilotAction[]
  people: Member[]
}): HomeStripData {
  return {
    attention: orderInbox(input.inbox, 'All').slice(0, 3),
    collisions: input.collisions.filter(c => c.status === 'new').slice(0, 2),
    canHelp: input.people.filter(p => p.needs.length > 0).sort((a, b) => b.score.mutualValue - a.score.mutualValue).slice(0, 3),
    systemsWorthPlacing: input.rooms.filter(r => !r.archived && r.systemIds.length > 0).slice(0, 2),
    strategies: input.strategies.slice(0, 2),
    newContext: [...input.evidence].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    autopilotCount: input.autopilot.filter(a => a.status === 'prepared').length,
  }
}

export function latentPathsFor(paths: LatentNetworkPath[], filter: { personId?: string; companyId?: string; kind?: string }) {
  return paths.filter(p =>
    (!filter.personId || p.targetPersonId === filter.personId)
    && (!filter.companyId || p.targetCompanyId === filter.companyId)
    && (!filter.kind || filter.kind === 'all' || p.kind === filter.kind))
}
