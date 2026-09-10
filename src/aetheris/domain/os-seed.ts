/** Seeded demo content for the Relationship Operating System surfaces. */
import type {
  AutopilotAction, EvidenceItem, LatentNetworkPath, NetworkSimulation, NetworkStrategy,
  OpportunityCollision, OpportunityRoom, RelationshipInboxItem, RelationshipTwin,
  TrustBudgetState, VoiceMemoryCapture,
} from './os-models'

const day = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const seedEvidence: EvidenceItem[] = [
  { id: 'ev-1', category: 'Known', sourceType: 'explicit', sourceLabel: 'Stated in a call', statement: 'ForgeLine is opening a second facility next spring and needs pipeline discipline before it does.', date: day(6), confidence: 92, scope: 'shareable', shareable: true, personId: 'p3', companyId: 'co-forgeline' },
  { id: 'ev-2', category: 'Observed', sourceType: 'derived', sourceLabel: 'Network activity', statement: 'Northline Capital posted an operating-partner ask twice this quarter.', date: day(9), confidence: 78, scope: 'public', shareable: true, companyId: 'co-northline', personId: 'p2' },
  { id: 'ev-3', category: 'Derived', sourceType: 'inferred', sourceLabel: 'Placement history', statement: 'Golden Report lands fastest when a diagnostic precedes the method conversation.', date: day(21), confidence: 71, scope: 'private', shareable: false, systemId: 'sys-golden-report' },
  { id: 'ev-4', category: 'Uncertain', sourceType: 'unknown', sourceLabel: 'Unverified', statement: 'Whether Verdant has already committed to another diligence partner this cycle.', date: day(3), confidence: 34, scope: 'private', shareable: false, companyId: 'co-verdant', personId: 'p21' },
  { id: 'ev-5', category: 'Known', sourceType: 'explicit', sourceLabel: 'Message thread', statement: 'Mateo Quinn is selling a regional logistics operation and wants a quiet process.', date: day(4), confidence: 88, scope: 'private', shareable: false, personId: 'p10' },
  { id: 'ev-6', category: 'Observed', sourceType: 'derived', sourceLabel: 'Intent card', statement: 'Darius Cole posted “I’M BUYING” for logistics platforms in the Southeast.', date: day(5), confidence: 84, scope: 'shareable', shareable: true, personId: 'p8' },
  { id: 'ev-7', category: 'Observed', sourceType: 'derived', sourceLabel: 'Clinical operations note', statement: 'Ridgeline is validating throughput changes across two sites before December.', date: day(8), confidence: 76, scope: 'team', shareable: true, personId: 'p17', systemId: 'sys-clinical-throughput' },
  { id: 'ev-8', category: 'Derived', sourceType: 'inferred', sourceLabel: 'Trust ledger', statement: 'Adrian Vale has accepted two introduction requests from you in the last 30 days.', date: day(2), confidence: 90, scope: 'private', shareable: false, personId: 'p1' },
  { id: 'ev-9', category: 'Known', sourceType: 'explicit', sourceLabel: 'Event roster', statement: 'Kenji Vale and Idris Hale are both speaking at the same AI infrastructure forum in October.', date: day(7), confidence: 95, scope: 'public', shareable: true, personId: 'p14' },
  { id: 'ev-10', category: 'Uncertain', sourceType: 'unknown', sourceLabel: 'Unverified', statement: 'Whether Solano Grid Works has budget approved for a channel partner this fiscal year.', date: day(10), confidence: 40, scope: 'private', shareable: false, personId: 'p18' },
]



export const seedRooms: OpportunityRoom[] = [
  {
    id: 'room-forgeline', name: 'ForgeLine second-facility readiness', thesis: 'ForgeLine cannot open a second plant on the current pipeline discipline. Golden Report diagnoses the gap before anyone sells a method.',
    ownerId: 'me', peopleIds: ['p3', 'p1', 'p23'], companyId: 'co-forgeline', systemIds: ['sys-golden-report'],
    circleIds: ['cir-ai-manufacturing', 'cir-indiana'], intentIds: [], introIds: [], messageThreadIds: ['t1'],
    openLoopIds: [], meetingIds: [], evidenceIds: ['ev-1', 'ev-3', 'ev-8'], stage: 'Conversation',
    valueState: 'modeled', knownValue: '', modeledValue: 'A single recovered quarter of pipeline discipline before the plant opens.',
    confidence: 74, nextAction: 'Send the two-page diagnostic summary before the plant review, not the method deck.',
    blockers: ['No CFO relationship yet', 'Second site timing not confirmed'], weather: 'Active',
    timeline: [
      { id: 'tl-1', when: day(18), text: 'Signal: expansion mentioned in a circle discussion.', stage: 'Signal' },
      { id: 'tl-2', when: day(9), text: 'Qualified against the Golden Report fit criteria.', stage: 'Qualified' },
      { id: 'tl-3', when: day(4), text: 'Conversation opened with the operations lead.', stage: 'Conversation' },
    ],
    archived: false, createdAt: day(18), updatedAt: day(4),
  },
  {
    id: 'room-northline', name: 'Northline portfolio revenue system', thesis: 'Northline needs a repeatable revenue diagnostic across eight operating companies. One credible pilot decides the rest.',
    ownerId: 'me', peopleIds: ['p2', 'p8'], companyId: 'co-northline', systemIds: ['sys-golden-report', 'sys-obsidian'],
    circleIds: ['cir-pe-revenue'], intentIds: [], introIds: [], messageThreadIds: [], openLoopIds: [], meetingIds: [],
    evidenceIds: ['ev-2', 'ev-3'], stage: 'Intro Pending', valueState: 'unquantified', knownValue: '',
    modeledValue: 'Portfolio-wide if one pilot holds; unquantified until a first company agrees.',
    confidence: 61, nextAction: 'Ask Adrian for the operating-partner introduction only after the pilot brief exists.',
    blockers: ['Pilot brief not written', 'Connector already asked twice this month'], weather: 'Warm',
    timeline: [{ id: 'tl-4', when: day(11), text: 'Repeat ask observed in the network.', stage: 'Signal' }, { id: 'tl-5', when: day(5), text: 'Introduction path mapped through two connectors.', stage: 'Intro Pending' }],
    archived: false, createdAt: day(11), updatedAt: day(5),
  },
  {
    id: 'room-ridgeline', name: 'Ridgeline throughput pilot', thesis: 'Ridgeline has a working throughput model and a second site to prove it on. Aetheris supplies the relationship path, not the method.',
    ownerId: 'me', peopleIds: ['p17', 'p9'], companyId: 'co-northwind', systemIds: ['sys-clinical-throughput'],
    circleIds: [], intentIds: [], introIds: [], messageThreadIds: [], openLoopIds: [], meetingIds: [],
    evidenceIds: ['ev-7'], stage: 'Relationship Building', valueState: 'known', knownValue: 'A funded second-site pilot already budgeted for this year.',
    modeledValue: '', confidence: 66, nextAction: 'Introduce Simone to Elara once the migration window closes in November.',
    blockers: ['Northwind mid-migration until November'], weather: 'Building',
    timeline: [{ id: 'tl-6', when: day(14), text: 'Both sides confirmed interest in principle.', stage: 'Relationship Building' }],
    archived: false, createdAt: day(14), updatedAt: day(6),
  },
]

export const seedTwins: RelationshipTwin[] = [
  {
    id: 'twin-p1', memberId: 'p1', ownerId: 'me',
    communicationStyle: 'Short, direct, prefers a written reason before a call.',
    responsiveness: 'Replies inside a day when the ask is specific; goes quiet on open-ended notes.',
    trustHistory: 'Vouched for you twice without being asked again. Never declined an introduction.',
    weather: 'Warm', preferredIntroStyle: 'Private note with the reason first, names second.',
    currentIntents: ['Introducing operators to industrial founders', 'Looking for a positioning partner'],
    energyTopics: ['Founder positioning', 'Industrial go-to-market', 'Media that earns trust'],
    frictionPatterns: ['Dislikes being asked to broker two things at once', 'Will not forward a deck without context'],
    commitments: ['Owes you a read on the ForgeLine brief'],
    meetingStyle: '30 minutes, no slides, decision at the end.',
    timingWindows: ['Weekday mornings', 'Before quarterly board cycles'],
    openLoopIds: [], sharedSystemIds: ['sys-golden-report'], sharedCircleIds: ['cir-ai-manufacturing'],
    outcomeHistory: ['Two introductions accepted', 'One partnership conversation started'],
    lastMeaningfulInteraction: '4 days ago — reviewed the diagnostic framing with you.',
    whatWorks: ['Lead with the reason, not the request', 'Give him something to forward verbatim', 'One ask per message'],
    whatToAvoid: ['Stacking two introduction requests', 'Asking again inside the same fortnight'],
    bestNextMove: 'Send the ForgeLine one-pager and let him choose whether to forward it.',
    whatChanged: ['Accepted a second introduction this month', 'Started a positioning search of his own'],
    inferences: [
      { id: 'ti-1', label: 'Response pattern', value: 'Fast on specific asks, slow on open questions.', sourceType: 'derived', sourceLabel: 'Thread history', confidence: 82, scope: 'private' },
      { id: 'ti-2', label: 'Trust posture', value: 'High. Two accepted vouches with no reciprocity requested.', sourceType: 'derived', sourceLabel: 'Trust ledger', confidence: 88, scope: 'private' },
    ],
    scope: 'private', updatedAt: day(2),
  },
  {
    id: 'twin-p2', memberId: 'p2', ownerId: 'me',
    communicationStyle: 'Analytical. Wants the model before the story.',
    responsiveness: 'Two to three days. Replies properly rather than quickly.',
    trustHistory: 'Warm but unproven. One useful exchange, no favours either way.',
    weather: 'Building', preferredIntroStyle: 'Formal, with the thesis written down.',
    currentIntents: ['Placing a revenue system across the portfolio', 'Hiring an operating partner'],
    energyTopics: ['Portfolio operations', 'Repeatable diligence', 'Value creation plans'],
    frictionPatterns: ['Rejects method-first pitches', 'Will not pilot without one reference outcome'],
    commitments: ['Asked for a pilot brief by month end'],
    meetingStyle: 'Structured 45 minutes with a written pre-read.',
    timingWindows: ['Between deal cycles', 'Early in the quarter'],
    openLoopIds: [], sharedSystemIds: ['sys-golden-report'], sharedCircleIds: ['cir-pe-revenue'],
    outcomeHistory: ['One qualified conversation'],
    lastMeaningfulInteraction: '9 days ago — asked what the diagnostic actually measures.',
    whatWorks: ['Written pre-read', 'One reference outcome', 'Portfolio language, not product language'],
    whatToAvoid: ['Selling the method before the diagnosis', 'Introducing her to a founder without a thesis'],
    bestNextMove: 'Write the one-page pilot brief before requesting the introduction path.',
    whatChanged: ['Repeated the operating-partner ask publicly', 'Timing moved earlier in the quarter'],
    inferences: [
      { id: 'ti-3', label: 'Decision style', value: 'Evidence first. Confidence rises with written proof.', sourceType: 'inferred', sourceLabel: 'Two exchanges', confidence: 64, scope: 'private' },
    ],
    scope: 'private', updatedAt: day(9),
  },
  {
    id: 'twin-p10', memberId: 'p10', ownerId: 'me',
    communicationStyle: 'Warm, informal, prefers voice over writing.',
    responsiveness: 'Same day on the phone, slow by message.',
    trustHistory: 'Long relationship, currently cooling. You owe the last reply.',
    weather: 'Cooling', preferredIntroStyle: 'A call first, then names.',
    currentIntents: ['Selling a regional logistics operation quietly'],
    energyTopics: ['Freight margins', 'Owner transitions', 'Southeast corridors'],
    frictionPatterns: ['Will not be part of a public process', 'Dislikes written valuation talk'],
    commitments: ['You promised an observation on the corridor data'],
    meetingStyle: 'Phone, 20 minutes, no agenda.',
    timingWindows: ['Late afternoons', 'Before quarter end'],
    openLoopIds: [], sharedSystemIds: [], sharedCircleIds: [],
    outcomeHistory: ['One referral given to you two years ago'],
    lastMeaningfulInteraction: '41 days ago — asked for your read and never received it.',
    whatWorks: ['Call instead of writing', 'Give the observation before any ask', 'Total discretion'],
    whatToAvoid: ['Naming a buyer before he asks', 'Anything that looks like a process'],
    bestNextMove: 'Call with the corridor observation you owe him. No ask attached.',
    whatChanged: ['A buying intent appeared elsewhere in the network that matches his sale'],
    inferences: [
      { id: 'ti-4', label: 'Reciprocity debt', value: 'You are the one who owes. Any ask now costs trust.', sourceType: 'derived', sourceLabel: 'Open loop', confidence: 86, scope: 'private' },
    ],
    scope: 'private', updatedAt: day(4),
  },
]

export const seedCollisions: OpportunityCollision[] = [
  {
    id: 'col-logistics', ownerId: 'me', headline: 'Three separate signals just formed one opportunity.',
    signals: [
      { id: 'cs-1', text: 'Mateo Quinn is quietly selling a regional logistics operation.', sourceLabel: 'Private message', when: day(4), personId: 'p10' },
      { id: 'cs-2', text: 'Darius Cole posted a buying intent for Southeast logistics platforms.', sourceLabel: 'Intent card', when: day(5), personId: 'p8' },
      { id: 'cs-3', text: 'Clara Fenwick has advised both sides on owner transitions.', sourceLabel: 'Work history', when: day(30), personId: 'p19' },
    ],
    peopleIds: ['p10', 'p8', 'p19'], companyIds: [], systemIds: ['sys-golden-report'], circleIds: [],
    timingEvent: 'Both intents are live in the same 10-day window.',
    mutualValue: 'A discreet seller meets a credible buyer through an advisor both already trust.',
    trustPath: ['You', 'Clara Fenwick', 'Mateo Quinn'], confidence: 72,
    safeSummary: 'Two members have complementary positions in the same sector and one shared advisor. Neither private detail is shared without consent.',
    recommendedAction: 'Ask Clara whether a discreet conversation is welcome before either name is mentioned.',
    sector: 'Logistics', evidenceIds: ['ev-5', 'ev-6'], status: 'new', createdAt: day(3),
  },
  {
    id: 'col-manufacturing', ownerId: 'me', headline: 'An expansion, a hiring gap and a system met in the same week.',
    signals: [
      { id: 'cs-4', text: 'ForgeLine is opening a second facility next spring.', sourceLabel: 'Stated in a call', when: day(6), personId: 'p3' },
      { id: 'cs-5', text: 'Astrid Dahl is rebuilding industrial demand generation.', sourceLabel: 'Network post', when: day(7), personId: 'p23' },
      { id: 'cs-6', text: 'Golden Report has an unplaced diagnostic slot this quarter.', sourceLabel: 'Placement engine', when: day(2) },
    ],
    peopleIds: ['p3', 'p23', 'p1'], companyIds: ['co-forgeline'], systemIds: ['sys-golden-report'], circleIds: ['cir-ai-manufacturing'],
    timingEvent: 'Plant review happens before the spring build.',
    mutualValue: 'ForgeLine gets pipeline discipline before it needs it; Astrid gets an industrial proof case.',
    trustPath: ['You', 'Adrian Vale', 'ForgeLine operations'], confidence: 78,
    safeSummary: 'An expansion signal, a demand-generation rebuild and an available diagnostic point at the same room.',
    recommendedAction: 'Open an opportunity room and place the diagnostic before the plant review.',
    sector: 'Manufacturing', evidenceIds: ['ev-1', 'ev-3'], status: 'new', roomId: 'room-forgeline', createdAt: day(2),
  },
  {
    id: 'col-pe', ownerId: 'me', headline: 'A repeated ask and an unproven system are pointing at each other.',
    signals: [
      { id: 'cs-7', text: 'Northline posted the same operating-partner ask twice.', sourceLabel: 'Network activity', when: day(9), personId: 'p2' },
      { id: 'cs-8', text: 'Elise Laurent is looking for repeatable diligence support.', sourceLabel: 'Ask board', when: day(4), personId: 'p21' },
      { id: 'cs-9', text: 'Two members of the PE revenue circle share a trust path with you.', sourceLabel: 'Circle graph', when: day(12) },
    ],
    peopleIds: ['p2', 'p21', 'p8'], companyIds: ['co-northline', 'co-verdant'], systemIds: ['sys-golden-report'], circleIds: ['cir-pe-revenue'],
    timingEvent: 'Both firms are between deal cycles for roughly three weeks.',
    mutualValue: 'One pilot answers a question both firms are asking separately.',
    trustPath: ['You', 'Darius Cole', 'Elise Laurent'], confidence: 64,
    safeSummary: 'Two private equity firms are asking the same question in the same window.',
    recommendedAction: 'Write one pilot brief that answers both, then choose the healthier connector.',
    sector: 'Private equity', evidenceIds: ['ev-2', 'ev-4'], status: 'new', createdAt: day(2),
  },
  {
    id: 'col-ai', ownerId: 'me', headline: 'Two speakers, one room, one unbuilt partnership.',
    signals: [
      { id: 'cs-10', text: 'Kenji Vale and Idris Hale speak at the same October forum.', sourceLabel: 'Event roster', when: day(7), personId: 'p14' },
      { id: 'cs-11', text: 'Braxton needs applied AI capacity it cannot hire fast enough.', sourceLabel: 'Company signal', when: day(6), personId: 'p20' },
      { id: 'cs-12', text: 'Cassian Labs is looking for an enterprise deployment partner.', sourceLabel: 'Intent card', when: day(5), personId: 'p14' },
    ],
    peopleIds: ['p14', 'p20'], companyIds: ['co-braxton'], systemIds: ['sys-obsidian'], circleIds: ['cir-infra-buyers'],
    timingEvent: 'The forum is three weeks away and both are already travelling.',
    mutualValue: 'Capacity meets deployment demand without either side recruiting.',
    trustPath: ['You', 'Kenji Vale', 'Idris Hale'], confidence: 69,
    safeSummary: 'Two members with complementary AI infrastructure positions will be in the same room shortly.',
    recommendedAction: 'Suggest a private 20 minutes at the forum rather than an introduction email.',
    sector: 'AI infrastructure', evidenceIds: ['ev-9'], status: 'new', createdAt: day(1),
  },
  {
    id: 'col-health', ownerId: 'me', headline: 'A validated model and a stalled migration just aligned.',
    signals: [
      { id: 'cs-13', text: 'Ridgeline is validating throughput changes across two sites.', sourceLabel: 'Operations note', when: day(8), personId: 'p17' },
      { id: 'cs-14', text: 'Northwind finishes its migration in November.', sourceLabel: 'Member update', when: day(10), personId: 'p9' },
      { id: 'cs-15', text: 'Both sit inside your healthcare context with no direct relationship.', sourceLabel: 'Relationship graph', when: day(15) },
    ],
    peopleIds: ['p17', 'p9'], companyIds: ['co-northwind'], systemIds: ['sys-clinical-throughput'], circleIds: [],
    timingEvent: 'The migration window closes in November — before that, timing is wrong.',
    mutualValue: 'A proven throughput model meets a second site that will finally have capacity to run it.',
    trustPath: ['You', 'Simone Adebayo', 'Elara Voss'], confidence: 66,
    safeSummary: 'Two healthcare operators become relevant to each other in November, not now.',
    recommendedAction: 'Hold the introduction until the migration closes, then send it with the pilot terms.',
    sector: 'Healthcare', evidenceIds: ['ev-7'], status: 'snoozed', roomId: 'room-ridgeline', createdAt: day(5),
  },
]

export const seedLatentPaths: LatentNetworkPath[] = [
  { id: 'lat-1', ownerId: 'me', targetPersonId: 'p21', kind: 'warm', degree: 2, hops: [{ personId: 'p8', label: 'Darius Cole', context: 'investment', note: 'Co-invested with Verdant twice.' }], contextSource: 'investment', strength: 'Medium', consentRequired: true, statement: 'You do not know Elise, but you are one credible relationship away through a shared co-investment.', evidenceIds: ['ev-4'], scope: 'private' },
  { id: 'lat-2', ownerId: 'me', targetPersonId: 'p20', kind: 'contextual', degree: 3, hops: [{ personId: 'p14', label: 'Kenji Vale', context: 'event', note: 'Speaking at the same October forum.' }, { label: 'Braxton engineering circle', context: 'circle', note: 'Both belong to the infrastructure buyers circle.' }], contextSource: 'event', strength: 'Medium', consentRequired: true, statement: 'A shared stage in October is a more honest reason to meet than an introduction email.', evidenceIds: ['ev-9'], scope: 'private' },
  { id: 'lat-3', ownerId: 'me', targetCompanyId: 'co-forgeline', kind: 'warm', degree: 2, hops: [{ personId: 'p1', label: 'Adrian Vale', context: 'prior partnership', note: 'Worked with the ForgeLine leadership before.' }], contextSource: 'prior partnership', strength: 'High', consentRequired: false, statement: 'The strongest entry into ForgeLine is an existing partnership, not the front door.', evidenceIds: ['ev-1', 'ev-8'], scope: 'private' },
  { id: 'lat-4', ownerId: 'me', targetPersonId: 'p18', kind: 'contextual', degree: 3, hops: [{ personId: 'p12', label: 'Luc Moreau', context: 'geography', note: 'Both operate across the Southwest build corridor.' }, { label: 'Veteran founders circle', context: 'veteran network', note: 'Shared service background.' }], contextSource: 'veteran network', strength: 'Low', consentRequired: true, statement: 'Credible but thin: geography and a shared service background, nothing transacted.', evidenceIds: ['ev-10'], scope: 'private' },
  { id: 'lat-5', ownerId: 'me', targetCompanyId: 'co-northline', kind: 'warm', degree: 2, hops: [{ personId: 'p2', label: 'Mina Park', context: 'company', note: 'Operating partner inside the firm.' }], contextSource: 'company', strength: 'Medium', consentRequired: true, statement: 'One relationship inside the firm already knows what you do. Use it once, properly.', evidenceIds: ['ev-2'], scope: 'private' },
]

export const seedTrustBudget: TrustBudgetState[] = [
  { id: 'tb-p1', ownerId: 'me', connectorId: 'p1', connectorName: 'Adrian Vale', requestsThisMonth: 2, accepted: 2, declined: 0, reciprocityEvents: 0, lastAskDaysAgo: 6, outcomeQuality: 'High', responseFatigue: 'Medium', alternativeConnectorIds: ['p19', 'p8'], health: 'watch', guidance: 'Adrian is the shortest path, but you have asked twice this month and given nothing back. Give before you ask again.', updatedAt: day(2) },
  { id: 'tb-p19', ownerId: 'me', connectorId: 'p19', connectorName: 'Clara Fenwick', requestsThisMonth: 0, accepted: 3, declined: 0, reciprocityEvents: 2, lastAskDaysAgo: 74, outcomeQuality: 'High', responseFatigue: 'Low', alternativeConnectorIds: ['p1'], health: 'healthy', guidance: 'Clara is the healthier path: a strong direct relationship, no recent asks from you, and reciprocity already in your favour.', updatedAt: day(3) },
  { id: 'tb-p8', ownerId: 'me', connectorId: 'p8', connectorName: 'Darius Cole', requestsThisMonth: 1, accepted: 1, declined: 1, reciprocityEvents: 1, lastAskDaysAgo: 12, outcomeQuality: 'Medium', responseFatigue: 'Medium', alternativeConnectorIds: ['p19'], health: 'watch', guidance: 'One decline this quarter. Use Darius only where the fit is obvious to him without explanation.', updatedAt: day(4) },
  { id: 'tb-p10', ownerId: 'me', connectorId: 'p10', connectorName: 'Mateo Quinn', requestsThisMonth: 0, accepted: 1, declined: 0, reciprocityEvents: -1, lastAskDaysAgo: 120, outcomeQuality: 'Medium', responseFatigue: 'High', alternativeConnectorIds: ['p19'], health: 'strained', guidance: 'You owe Mateo a reply from six weeks ago. Any request before that lands as extraction.', updatedAt: day(4) },
]

export const seedSimulations: NetworkSimulation[] = [
  {
    id: 'sim-1', ownerId: 'me', question: 'What happens if I try to place Golden Report into 20 PE portfolio companies?',
    input: { thingToMove: 'Golden Report', systemId: 'sys-golden-report', audience: 'PE operating partners and portfolio CEOs', targetCount: 20, horizon: 'Two quarters', geography: 'US Midwest and Northeast', industries: ['Private equity', 'Manufacturing'], allowedCircleIds: ['cir-pe-revenue', 'cir-ai-manufacturing'], excludedPersonIds: ['p10'] },
    likelyPaths: [
      { id: 'sp-1', label: 'One firm, one pilot, then the portfolio', connectorId: 'p2', connectorName: 'Mina Park', reach: 'High', friction: 'Medium', trustCost: 'Low', note: 'A single operating partner can open eight companies if one pilot holds.' },
      { id: 'sp-2', label: 'Circle-led credibility before any ask', connectorId: 'p1', connectorName: 'Adrian Vale', reach: 'Medium', friction: 'Low', trustCost: 'Medium', note: 'Adrian is already strained this month; the circle carries it better than he does.' },
      { id: 'sp-3', label: 'Direct outreach to twenty CEOs', connectorName: 'None', reach: 'Low', friction: 'High', trustCost: 'High', note: 'This is the version that looks like selling. Expect silence.' },
    ],
    strongestConnectorIds: ['p2', 'p19', 'p8'], targetCircleIds: ['cir-pe-revenue'], estimatedFriction: 'Medium',
    bottlenecks: ['No written pilot brief', 'One reference outcome missing', 'Single connector carrying too much of the path'],
    trustWarnings: ['Adrian Vale has already accepted two asks this month', 'Twenty parallel asks would exhaust three connectors at once'],
    sequence: ['Write the pilot brief', 'Place one diagnostic inside a single portfolio company', 'Publish the outcome to the PE circle', 'Ask for the second and third only after the first holds'],
    requiredProof: ['One completed diagnostic with a named result', 'A one-page portfolio-level summary'],
    systemsNeeded: ['Golden Report', 'Obsidian for delivery capacity'],
    relationshipGaps: ['No CFO relationships', 'No relationship inside two of the target firms'],
    confidence: 'Medium', uncertainty: ['Whether any firm has already committed elsewhere this cycle', 'Portfolio company appetite is unmeasured'],
    evidenceIds: ['ev-2', 'ev-3', 'ev-4'], createdAt: day(6),
  },
]

export const seedStrategies: NetworkStrategy[] = [
  {
    id: 'strat-1', ownerId: 'me', goal: 'Ten PE operating-partner relationships that would take your call by December 31.',
    relationshipType: 'Operating partner', industry: 'Private equity', geography: 'US', targetCount: 10, horizon: 'Dec 31',
    systemIds: ['sys-golden-report'], preferredCircleIds: ['cir-pe-revenue'],
    constraints: ['No mass outreach', 'One ask per connector per month'],
    progressPersonIds: ['p2', 'p8'], gaps: ['No CFO-level relationships', 'No relationships in two target firms', 'No published reference outcome'],
    strongestPaths: [
      { personId: 'p2', label: 'Mina Park — inside a target firm', strength: 'High', note: 'Already asking the question your system answers.' },
      { personId: 'p8', label: 'Darius Cole — co-investor network', strength: 'Medium', note: 'Opens Verdant, but the fit must be obvious to him.' },
      { personId: 'p19', label: 'Clara Fenwick — advisor to both sides', strength: 'High', note: 'Healthy trust budget and no recent asks.' },
    ],
    nextMoves: [
      { id: 'sm-1', text: 'Write the one-page pilot brief Mina asked for.', personId: 'p2', done: false },
      { id: 'sm-2', text: 'Publish one completed diagnostic outcome to the PE revenue circle.', done: false },
      { id: 'sm-3', text: 'Ask Clara for one introduction — not Adrian, who is strained.', personId: 'p19', done: false },
      { id: 'sm-4', text: 'Close the ForgeLine conversation so it becomes the reference case.', personId: 'p3', done: false },
      { id: 'sm-5', text: 'Add two CFO relationships through the manufacturing circle.', done: false },
    ],
    fromSimulationId: 'sim-1', visibility: 'private', createdAt: day(12), updatedAt: day(2),
  },
  {
    id: 'strat-2', ownerId: 'me', goal: 'Five manufacturing CEOs in Indiana who know what you do.',
    relationshipType: 'Owner / CEO', industry: 'Manufacturing', geography: 'Indiana', targetCount: 5, horizon: 'Q1',
    systemIds: ['sys-golden-report'], preferredCircleIds: ['cir-indiana', 'cir-ai-manufacturing'],
    constraints: ['Relationships only through the Indiana circle or existing partners'],
    progressPersonIds: ['p3'], gaps: ['Four of five relationships do not exist yet', 'No local proof case'],
    strongestPaths: [
      { personId: 'p1', label: 'Adrian Vale — prior partnership with ForgeLine', strength: 'High', note: 'Use once, after the trust budget recovers.' },
      { label: 'Indiana Business Owners circle', strength: 'Medium', note: 'Substance in the room earns the introductions.' },
    ],
    nextMoves: [
      { id: 'sm-6', text: 'Turn the ForgeLine conversation into a named local outcome.', personId: 'p3', done: false },
      { id: 'sm-7', text: 'Contribute one useful diagnostic to the Indiana circle before asking anything.', done: false },
      { id: 'sm-8', text: 'Attend the Midwest Manufacturing Forum with two names in mind, not twenty.', done: false },
    ],
    visibility: 'private', createdAt: day(20), updatedAt: day(5),
  },
]

export const seedAutopilot: AutopilotAction[] = [
  { id: 'ap-1', ownerId: 'me', kind: 'reconnect draft', title: 'Reconnect with Mateo Quinn — you owe the reply', personId: 'p10', draft: 'Mateo — I owe you the corridor read from six weeks ago. Short version: your margin story holds on the two lanes you flagged, and it weakens on the third. Happy to walk it through by phone this week. No ask attached.', whyPrepared: 'An open commitment has been unanswered for 41 days and the relationship is cooling.', expectedBenefit: 'Repays a debt before any request, restoring a long relationship.', trustBudgetImpact: 'Improves a strained budget. Nothing is asked for.', scope: 'private', requiresApproval: true, minimumAutonomy: 2, evidenceIds: ['ev-5'], status: 'prepared', createdAt: day(1) },
  { id: 'ap-2', ownerId: 'me', kind: 'intro request', title: 'Ask Clara Fenwick — not Adrian — for the Verdant path', personId: 'p19', draft: 'Clara — you have advised both sides of transitions like this. Would a short, discreet conversation about a Southeast logistics position be welcome, or is the timing wrong? No names unless you say yes.', whyPrepared: 'Adrian has accepted two asks this month; Clara has a healthy budget and stronger context.', expectedBenefit: 'Keeps the shortest path in reserve and uses the healthier one.', trustBudgetImpact: 'Low cost. First ask in 74 days.', scope: 'private', requiresApproval: true, minimumAutonomy: 2, evidenceIds: ['ev-5', 'ev-6'], status: 'prepared', createdAt: day(1) },
  { id: 'ap-3', ownerId: 'me', kind: 'system placement', title: 'Place the Golden Report diagnostic before the ForgeLine plant review', systemId: 'sys-golden-report', roomId: 'room-forgeline', draft: 'Two pages, findings only: where the pipeline breaks before a second facility multiplies it. No method, no pricing.', whyPrepared: 'The expansion timing closes before spring and the diagnostic is unplaced.', expectedBenefit: 'A diagnosis lands before anyone has to be sold a method.', trustBudgetImpact: 'None. No connector required.', scope: 'private', requiresApproval: true, minimumAutonomy: 3, evidenceIds: ['ev-1', 'ev-3'], status: 'prepared', createdAt: day(2) },
  { id: 'ap-4', ownerId: 'me', kind: 'offer help', title: 'Offer Astrid Dahl the industrial demand notes she is missing', personId: 'p23', draft: 'Astrid — you mentioned rebuilding industrial demand generation. I have a short note on what actually moved pipeline in two plants last year. Yours if useful.', whyPrepared: 'A give-before-ask move that matches a stated need in the network.', expectedBenefit: 'Creates reciprocity ahead of a collision you may want to act on.', trustBudgetImpact: 'Positive. Nothing requested.', scope: 'private', requiresApproval: false, minimumAutonomy: 1, evidenceIds: [], status: 'prepared', createdAt: day(2) },
  { id: 'ap-5', ownerId: 'me', kind: 'context capsule', title: 'Prepare the capsule for the Simone ↔ Elara introduction', personId: 'p17', roomId: 'room-ridgeline', draft: 'Why you are meeting, what each side needs, what stays private, and the one decision worth making in the first 20 minutes.', whyPrepared: 'The introduction becomes correct in November; the capsule should exist before then.', expectedBenefit: 'The introduction arrives fully contextualised on the right day.', trustBudgetImpact: 'None yet.', scope: 'private', requiresApproval: true, minimumAutonomy: 2, evidenceIds: ['ev-7'], status: 'prepared', createdAt: day(3) },
  { id: 'ap-6', ownerId: 'me', kind: 'meeting invitation', title: 'Suggest 20 private minutes at the October AI forum', personId: 'p14', draft: 'Kenji — you and Idris are both on the October programme. Twenty minutes between sessions would be a more honest start than an introduction email. Want me to ask him?', whyPrepared: 'A shared room is a better reason to meet than a broker.', expectedBenefit: 'A partnership conversation with no introduction cost.', trustBudgetImpact: 'Low.', scope: 'private', requiresApproval: true, minimumAutonomy: 2, evidenceIds: ['ev-9'], status: 'prepared', createdAt: day(1) },
  { id: 'ap-7', ownerId: 'me', kind: 'evidence request', title: 'Confirm whether Verdant has already committed elsewhere', personId: 'p8', draft: 'Darius — before I take this anywhere, do you know whether Verdant has already lined up diligence support this cycle? Happy to leave it alone if so.', whyPrepared: 'The strategy rests on an unverified assumption.', expectedBenefit: 'Removes the largest uncertainty for the cost of one question.', trustBudgetImpact: 'Very low — a question, not an ask.', scope: 'private', requiresApproval: true, minimumAutonomy: 2, evidenceIds: ['ev-4'], status: 'prepared', createdAt: day(2) },
]

export const seedInbox: RelationshipInboxItem[] = [
  { id: 'in-1', ownerId: 'me', kind: 'commitment', title: 'You owe Mateo Quinn the corridor read', whyThisMatters: 'An unanswered promise is the fastest way to lose a long relationship.', whyNow: '41 days open, and a matching buying intent just appeared elsewhere.', nextMove: 'Call with the observation. No ask attached.', lanes: ['Today', 'Mine', 'Give Before Ask'], personId: 'p10', priority: 96, evidenceIds: ['ev-5'], status: 'open', createdAt: day(1) },
  { id: 'in-2', ownerId: 'me', kind: 'collision', title: 'Three separate signals just formed one logistics opportunity', whyThisMatters: 'A discreet seller and a credible buyer share one trusted advisor.', whyNow: 'Both intents are live inside the same 10-day window.', nextMove: 'Ask Clara whether a discreet conversation is welcome.', lanes: ['Today', 'Opportunities'], collisionId: 'col-logistics', priority: 92, evidenceIds: ['ev-5', 'ev-6'], status: 'open', createdAt: day(1) },
  { id: 'in-3', ownerId: 'me', kind: 'system placement', title: 'Golden Report should reach ForgeLine before the plant review', whyThisMatters: 'The diagnosis is worth more before the second facility exists than after.', whyNow: 'The review happens before the spring build.', nextMove: 'Send the two-page findings summary, not the method deck.', lanes: ['This Week', 'Opportunities', 'Mine'], systemId: 'sys-golden-report', roomId: 'room-forgeline', priority: 88, evidenceIds: ['ev-1', 'ev-3'], status: 'open', createdAt: day(2) },
  { id: 'in-4', ownerId: 'me', kind: 'you can help', title: 'Astrid Dahl needs exactly what you already wrote', whyThisMatters: 'Helping first is how the network stays worth being in.', whyNow: 'She is rebuilding industrial demand generation this quarter.', nextMove: 'Send the plant pipeline note with no request attached.', lanes: ['This Week', 'Give Before Ask'], personId: 'p23', priority: 74, evidenceIds: [], status: 'open', createdAt: day(2) },
  { id: 'in-5', ownerId: 'me', kind: 'cooling', title: 'Luc Moreau has gone quiet after a strong start', whyThisMatters: 'The relationship had momentum and a shared corridor.', whyNow: 'Nothing exchanged in six weeks; construction planning starts soon.', nextMove: 'Send one specific observation about his build corridor.', lanes: ['This Week', 'Mine', 'Give Before Ask'], personId: 'p12', priority: 66, evidenceIds: [], status: 'open', createdAt: day(3) },
  { id: 'in-6', ownerId: 'me', kind: 'intro approval', title: 'Simone ↔ Elara is waiting on the November window', whyThisMatters: 'Right people, wrong week is still the wrong introduction.', whyNow: 'Northwind finishes its migration in November.', nextMove: 'Hold, and prepare the context capsule now.', lanes: ['Waiting on Them', 'Opportunities'], personId: 'p17', roomId: 'room-ridgeline', priority: 62, evidenceIds: ['ev-7'], status: 'open', createdAt: day(3) },
  { id: 'in-7', ownerId: 'me', kind: 'new context', title: 'Northline asked the same question twice', whyThisMatters: 'A repeated public ask is the clearest buying signal in the network.', whyNow: 'Both firms are between deal cycles for roughly three weeks.', nextMove: 'Write one pilot brief that answers both firms.', lanes: ['This Week', 'Opportunities'], personId: 'p2', roomId: 'room-northline', priority: 71, evidenceIds: ['ev-2'], status: 'open', createdAt: day(4) },
  { id: 'in-8', ownerId: 'me', kind: 'blocker', title: 'The Northline room is blocked by a missing pilot brief', whyThisMatters: 'The room cannot advance while the artefact does not exist.', whyNow: 'The connector path is ready and waiting on you.', nextMove: 'Write the brief before asking anyone for anything.', lanes: ['Today', 'Mine'], roomId: 'room-northline', priority: 80, evidenceIds: ['ev-3'], status: 'open', createdAt: day(2) },
  { id: 'in-9', ownerId: 'me', kind: 'trigger memory', title: 'Theo Maren said “after the board meeting” — that was November', whyThisMatters: 'He told you when to come back. Coming back on time is the whole signal.', whyNow: 'The board cycle is approaching.', nextMove: 'Diarise a short note for the week after his board meeting.', lanes: ['This Week', 'Waiting on Them'], personId: 'p18', priority: 58, evidenceIds: ['ev-10'], status: 'open', createdAt: day(5) },
  { id: 'in-10', ownerId: 'me', kind: 'meeting follow-up', title: 'The ForgeLine conversation has no closed loop', whyThisMatters: 'Meetings that do not close become relationships that drift.', whyNow: 'Four days since the conversation, nothing recorded.', nextMove: 'Record what changed and the next trigger.', lanes: ['Today', 'Mine'], personId: 'p3', roomId: 'room-forgeline', priority: 77, evidenceIds: ['ev-1'], status: 'open', createdAt: day(1) },
]

export const seedCaptures: VoiceMemoryCapture[] = []
