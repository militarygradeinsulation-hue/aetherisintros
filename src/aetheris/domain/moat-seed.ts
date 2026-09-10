/** Seeded demo content for the moat layer. All names are fictional. */
import type {
  AdvisoryBoard, ConsentLedgerEntry, DigitalRepresentativePolicy, IntroductionAvailability,
  KnowledgePost, LiveEvent, NetworkConstitutionRule, NetworkQuestion, NetworkSnapshot,
  OrganizationRelationshipPassport, OutcomeAttributionEdge, OutreachStrikeLedger,
  PortableIdentity, ProfessionalPassport, ReciprocitySignal, RelationshipContextAdapter,
  RelationshipDecayRisk, RelationshipGap, SerendipityMatch,
} from './moat-models'

const day = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
const ahead = (n: number) => day(-n)

/* ------------------------------------------------ professional passports */

const claim = (label: string, value: string, state: ProfessionalPassport['company']['state'], evidenceIds: string[] = []) =>
  ({ id: `pc-${label}-${value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48), label, value, state, evidenceIds, scope: 'shareable' as const })

export const seedPassports: ProfessionalPassport[] = [
  {
    id: 'pp-p1', memberId: 'p1',
    company: { ...claim('Company', 'Anything But Typical', 'verified', ['ev-8']), verifiedBy: 'Domain email + circle vouching', verifiedAt: day(120) },
    role: claim('Role', 'Founder & Advisor', 'verified'),
    expertise: [claim('Expertise', 'Founder networks', 'verified'), claim('Expertise', 'Positioning', 'self-reported'), claim('Expertise', 'Media', 'self-reported')],
    priorCompanies: ['Harbor Grid', 'Meridian Studio'], industries: ['Professional services', 'Media'],
    references: [
      { id: 'ref-1', name: 'Mina Park', relationship: 'Co-invested twice', note: 'Sends people he has actually worked with, never volume.', state: 'verified' },
      { id: 'ref-2', name: 'Caleb Wynn', relationship: 'Circle peer', note: 'Follows through on introductions inside a week.', state: 'self-reported' },
    ],
    systemsContributed: ['sys-golden-report'], outcomesContributed: [], introductionsCompleted: 34, introductionsHonoured: 31,
    circleIds: ['cir-ai-manufacturing', 'cir-indiana'],
    credibilityNote: 'Credible for founder-to-operator introductions in professional services. Not a fit for enterprise procurement conversations.',
    scope: 'shareable', createdAt: day(400), updatedAt: day(6),
  },
  {
    id: 'pp-p2', memberId: 'p2',
    company: { ...claim('Company', 'Northline Capital', 'verified', ['ev-2']), verifiedBy: 'Fund domain verification', verifiedAt: day(90) },
    role: claim('Role', 'Operating Partner', 'verified'),
    expertise: [claim('Expertise', 'Portfolio operations', 'verified'), claim('Expertise', 'Value creation', 'verified'), claim('Expertise', 'B2B growth', 'self-reported')],
    priorCompanies: ['Braxton Software Group', 'Cardinal Ridge'], industries: ['Private equity', 'Software'],
    references: [{ id: 'ref-3', name: 'Nolan Pierce', relationship: 'Portfolio CEO', note: 'Turns diligence questions into an operating plan quickly.', state: 'verified' }],
    systemsContributed: [], outcomesContributed: ['out-1'], introductionsCompleted: 12, introductionsHonoured: 12,
    circleIds: ['cir-pe-revenue'],
    credibilityNote: 'Credible on portfolio revenue systems and operating-partner hiring. Will not take cold vendor pitches.',
    scope: 'shareable', createdAt: day(380), updatedAt: day(9),
  },
  {
    id: 'pp-p3', memberId: 'p3',
    company: { ...claim('Company', 'ForgeLine Systems', 'verified', ['ev-1']), verifiedBy: 'Company domain + circle vouching', verifiedAt: day(60) },
    role: claim('Role', 'CEO', 'verified'),
    expertise: [claim('Expertise', 'Industrial sales', 'verified'), claim('Expertise', 'CRM adoption', 'self-reported'), claim('Expertise', 'Pipeline design', 'verified')],
    priorCompanies: ['Solano Grid Works'], industries: ['Manufacturing'],
    references: [{ id: 'ref-4', name: 'Adrian Vale', relationship: 'Advisor', note: 'Straight about what is broken before asking for help.', state: 'verified' }],
    systemsContributed: [], outcomesContributed: [], introductionsCompleted: 5, introductionsHonoured: 5,
    circleIds: ['cir-ai-manufacturing', 'cir-indiana'],
    credibilityNote: 'Credible on second-facility operations and industrial pipeline discipline.',
    scope: 'shareable', createdAt: day(300), updatedAt: day(4),
  },
  {
    id: 'pp-p8', memberId: 'p8',
    company: { ...claim('Company', 'Cardinal Ridge Holdings', 'pending'), verifiedBy: 'Awaiting domain confirmation' },
    role: claim('Role', 'Managing Director', 'self-reported'),
    expertise: [claim('Expertise', 'Buy-side diligence', 'verified'), claim('Expertise', 'Logistics platforms', 'verified')],
    priorCompanies: ['Verdant Growth Partners'], industries: ['Private equity', 'Logistics'],
    references: [{ id: 'ref-5', name: 'Mateo Quinn', relationship: 'Prior process', note: 'Quiet, fast, does not shop a deal.', state: 'verified' }],
    systemsContributed: [], outcomesContributed: [], introductionsCompleted: 9, introductionsHonoured: 8,
    circleIds: ['cir-infra-buyers'],
    credibilityNote: 'Credible for quiet logistics acquisition conversations. Company claim still pending verification.',
    scope: 'shareable', createdAt: day(210), updatedAt: day(5),
  },
  {
    id: 'pp-p14', memberId: 'p14',
    company: { ...claim('Company', 'Helix Compute', 'verified', ['ev-9']), verifiedBy: 'Domain verification', verifiedAt: day(40) },
    role: claim('Role', 'VP Infrastructure', 'verified'),
    expertise: [claim('Expertise', 'AI infrastructure', 'verified'), claim('Expertise', 'Capacity planning', 'self-reported')],
    priorCompanies: ['Braxton Software Group'], industries: ['Technology'],
    references: [], systemsContributed: [], outcomesContributed: [], introductionsCompleted: 3, introductionsHonoured: 3,
    circleIds: ['cir-infra-buyers'],
    credibilityNote: 'Credible on infrastructure buying committees. New to the network, so evidence is thin.',
    scope: 'shareable', createdAt: day(80), updatedAt: day(7),
  },
]

/* ------------------------------------------------------ constitution */

export const seedConstitution: NetworkConstitutionRule[] = [
  { id: 'nc-1', principle: 'Relevance', title: 'Reach people the message actually concerns.', rule: 'Outbound contact must name the specific reason this person, not a category of people.', why: 'Relevance is what makes a professional network worth answering.', detects: ['irrelevant-ask', 'bulk-outreach'], enforcement: 'review', active: true },
  { id: 'nc-2', principle: 'Consent', title: 'Declined once means declined.', rule: 'Repeated contact after a decline is held for review, and introductions require both sides to opt in.', why: 'Consent is the difference between a network and a list.', detects: ['repeated-decline', 'excessive-frequency'], enforcement: 'block', active: true },
  { id: 'nc-3', principle: 'Specificity', title: 'Say the actual thing.', rule: 'Messages need a concrete ask, a concrete context, or both. Vague pitch language is coached before sending.', why: 'Specific messages get answered. Vague ones train people to ignore you.', detects: ['vague-pitch', 'missing-context'], enforcement: 'coach', active: true },
  { id: 'nc-4', principle: 'Reciprocity', title: 'Create value near the ask.', rule: 'A request should carry something useful: context, a system, a name, or a reason it helps them too.', why: 'Reciprocity is why good networks compound instead of eroding.', detects: ['no-mutual-value'], enforcement: 'review', active: true },
  { id: 'nc-5', principle: 'No mass-selling', title: 'No campaigns inside relationships.', rule: 'Copy-paste outreach to multiple members is blocked, regardless of quality.', why: 'One campaign can spoil a network for everyone in it.', detects: ['bulk-outreach', 'unsolicited-selling'], enforcement: 'block', active: true },
  { id: 'nc-6', principle: 'No purchased attention', title: 'Attention is not for sale.', rule: 'No paid placement, no promoted profiles, no paid introductions, ever.', why: 'The moment access is purchasable, trust stops meaning anything.', detects: ['unsolicited-selling'], enforcement: 'block', active: true },
]

export const seedStrikes: OutreachStrikeLedger[] = [
  { id: 'sl-me', memberId: 'me', strikes: 0, privateNote: 'No flagged outreach. This ledger is private and never shown to other members.' },
]

/* ------------------------------------------------------ network questions */

export const seedQuestions: NetworkQuestion[] = [
  {
    id: 'nq-1', authorId: 'me',
    question: 'Who knows a manufacturing company dealing with quoting delays?',
    context: 'Looking for one or two credible operators before I take the Golden Report diagnostic into a second industrial account.',
    audience: 'circle', circleId: 'cir-ai-manufacturing',
    routed: [
      { memberId: 'p3', reason: 'Runs an industrial business where quoting delays were a named problem this quarter.', confidence: 88, responded: true, response: 'Two of our distributors have this badly. I can name one if you want a quiet look first.', respondedAt: day(2) },
      { memberId: 'p23', reason: 'Operations lead inside the same circle with plant-floor visibility.', confidence: 74, responded: false },
      { memberId: 'p18', reason: 'Sells into industrial buyers and hears quoting complaints early.', confidence: 66, responded: false },
    ],
    routingLogic: ['Circle: AI Operators in Manufacturing', 'Verified manufacturing role or industry', 'Recent related intent or ask within 60 days', 'Excluded 14 members with no permissioned signal on this topic'],
    relatedSystemIds: ['sys-golden-report'], relatedPersonIds: ['p3'], spawnedIntroIds: [],
    status: 'answered', outcome: 'One named lead, one warm path pending.', createdAt: day(3),
  },
  {
    id: 'nq-2', authorId: 'me',
    question: 'Who has sold to PE operating partners in the last year?',
    context: 'I want to understand how operating partners actually buy before I ask anyone for an introduction.',
    audience: 'connections',
    routed: [
      { memberId: 'p2', reason: 'Operating partner — answers from the buying side.', confidence: 91, responded: false },
      { memberId: 'p5', reason: 'Sold a reporting system into two portfolio companies last year.', confidence: 79, responded: true, response: 'They buy on evidence, not decks. Lead with one recovered quarter.', respondedAt: day(1) },
    ],
    routingLogic: ['Direct connections only', 'Verified private-equity or portfolio-sales experience', 'Excluded members who marked this topic out of scope'],
    relatedSystemIds: [], relatedPersonIds: ['p2', 'p5'], spawnedIntroIds: [],
    status: 'open', outcome: '', createdAt: day(2),
  },
]

/* ---------------------------------------------------------- serendipity */

export const seedSerendipity: SerendipityMatch[] = [
  {
    id: 'sm-1', ownerId: 'me', memberId: 'p17', basis: ['adjacent problem', 'shared timing'],
    whyUnexpected: 'You have never looked at healthcare, and she has never looked at manufacturing.',
    whyItCouldMatter: 'Her throughput validation problem is the same shape as the quoting-delay problem you already diagnosed twice.',
    whyNow: 'She is validating changes across two sites before December, which is the window where a diagnostic is welcome.',
    mutualValue: 'You get a second industry proof point. She gets a method that has already survived a plant floor.',
    uncertainty: 'Clinical operations may require validation evidence you do not have yet.',
    evidenceIds: ['ev-7', 'ev-3'], confidence: 71, status: 'new', createdAt: day(2),
  },
  {
    id: 'sm-2', ownerId: 'me', memberId: 'p18', basis: ['complementary capability', 'geography'],
    whyUnexpected: 'He is a channel seller, not a buyer, so he never appears in your match lists.',
    whyItCouldMatter: 'He already sits in front of the industrial buyers you are trying to reach, and he needs a diagnostic to open conversations.',
    whyNow: 'His fiscal-year channel plan is being written now.',
    mutualValue: 'He gets a credible opener. You get distribution without cold outreach.',
    uncertainty: 'Budget approval for a channel partner is unconfirmed.',
    evidenceIds: ['ev-10'], confidence: 63, status: 'new', createdAt: day(4),
  },
  {
    id: 'sm-3', ownerId: 'me', memberId: 'p10', basis: ['non-obvious circle', 'prior work'],
    whyUnexpected: 'You know him socially through a circle, never professionally.',
    whyItCouldMatter: 'He is quietly selling a logistics operation and one of your connections posted that he is buying in exactly that lane.',
    whyNow: 'Both sides are active in the same 30-day window.',
    mutualValue: 'A quiet process for him, proprietary flow for the buyer, and a real introduction credit for you.',
    uncertainty: 'He has asked for discretion, so this needs consent before any name moves.',
    evidenceIds: ['ev-5', 'ev-6'], confidence: 82, status: 'new', createdAt: day(1),
  },
]

/* ------------------------------------------- organization passports */

export const seedOrgPassports: OrganizationRelationshipPassport[] = [
  {
    id: 'orp-forgeline', companyId: 'co-forgeline', companyName: 'ForgeLine Systems',
    relationshipOwners: [{ memberId: 'me', name: 'You', role: 'Primary relationship' }, { memberId: 'p1', name: 'Adrian Vale', role: 'Introducer' }],
    peopleInvolved: ['p3', 'p23', 'p1'],
    formerEmployees: [{ memberId: 'p18', name: 'Idris Hale', nowAt: 'Solano Grid Works' }],
    activeCircleIds: ['cir-ai-manufacturing', 'cir-indiana'], systemsShared: ['sys-golden-report'], outcomeIds: [],
    openLoops: ['Diagnostic summary promised before the plant review.', 'No CFO relationship yet.'],
    dormantOpportunities: ['Distributor quoting pilot raised last spring, never scoped.'],
    chronology: [
      { id: 'oe-1', when: day(210), kind: 'introduction', text: 'Adrian Vale introduced you to Nolan Pierce after a circle discussion.', peopleIds: ['p1', 'p3'], evidenceIds: [], scope: 'shareable' },
      { id: 'oe-2', when: day(150), kind: 'meeting', text: 'First working session on pipeline visibility across two plants.', peopleIds: ['p3'], evidenceIds: [], scope: 'team' },
      { id: 'oe-3', when: day(60), kind: 'system shared', text: 'Golden Report diagnostic framing shared with operations.', peopleIds: ['p3', 'p23'], evidenceIds: ['ev-3'], scope: 'team' },
      { id: 'oe-4', when: day(18), kind: 'event', text: 'Second-facility expansion mentioned in the manufacturing circle.', peopleIds: ['p3'], evidenceIds: ['ev-1'], scope: 'shareable' },
      { id: 'oe-5', when: day(30), kind: 'departure', text: 'Idris Hale left ForgeLine for Solano Grid Works — relationship still warm.', peopleIds: ['p18'], evidenceIds: [], scope: 'private' },
    ],
    summary: 'Two years of real work across three people, one system shared, one promise outstanding and one dormant distributor opportunity. The relationship is active but concentrated in operations.',
    scope: 'team', updatedAt: day(4),
  },
  {
    id: 'orp-northline', companyId: 'co-northline', companyName: 'Northline Capital',
    relationshipOwners: [{ memberId: 'me', name: 'You', role: 'Primary relationship' }],
    peopleInvolved: ['p2', 'p5'], formerEmployees: [],
    activeCircleIds: ['cir-pe-revenue'], systemsShared: [], outcomeIds: ['out-1'],
    openLoops: ['Operating-partner ask posted twice with no answer from you.'],
    dormantOpportunities: ['Portfolio reporting standardisation discussed in the spring.'],
    chronology: [
      { id: 'oe-6', when: day(180), kind: 'message', text: 'Mina Park asked how you measure revenue leakage.', peopleIds: ['p2'], evidenceIds: [], scope: 'private' },
      { id: 'oe-7', when: day(90), kind: 'outcome', text: 'A referral you made became a portfolio hire.', peopleIds: ['p2'], evidenceIds: [], scope: 'team' },
      { id: 'oe-8', when: day(9), kind: 'event', text: 'Operating-partner ask posted for the second time this quarter.', peopleIds: ['p2'], evidenceIds: ['ev-2'], scope: 'public' },
    ],
    summary: 'One strong individual relationship carrying the whole institution. If Mina Park moved firms, the relationship would move with her.',
    scope: 'team', updatedAt: day(9),
  },
]

/* ------------------------------------------------------------ live events */

export const seedEvents: LiveEvent[] = [
  {
    id: 'le-industrial', name: 'Industrial Systems Forum', kind: 'conference',
    venue: 'The Wexford, Hall B', city: 'Chicago, IL',
    startsAt: ahead(2), endsAt: ahead(3),
    goals: ['Two credible industrial conversations', 'One operating-partner perspective', 'No pitching'],
    attendeeIds: ['p1', 'p2', 'p3', 'p5', 'p14', 'p18', 'p23'],
    companyIds: ['co-forgeline', 'co-northline'], circleIds: ['cir-ai-manufacturing', 'cir-pe-revenue'],
    intentIds: [], systemIds: ['sys-golden-report'],
    sessions: [
      { id: 'es-1', title: 'Pipeline discipline at scale', when: `${ahead(2)} 09:30`, room: 'Hall B', peopleIds: ['p3', 'p23'] },
      { id: 'es-2', title: 'What operating partners fund next', when: `${ahead(2)} 13:00`, room: 'Studio 2', peopleIds: ['p2'] },
      { id: 'es-3', title: 'Closing dinner', when: `${ahead(2)} 19:30`, room: 'The Long Room', peopleIds: ['p1', 'p5'] },
    ],
    followUpWindowDays: 5, attendanceVisibility: 'attendees',
    myPlan: [
      { id: 'ep-1', memberId: 'p3', why: 'The diagnostic summary is already promised — close the loop in person.', opener: 'I brought the two-page version. Want to read it before the plant review?', done: false },
      { id: 'ep-2', memberId: 'p2', why: 'Understand how operating partners buy before asking for anything.', opener: 'What made the last portfolio reporting change actually stick?', introducerId: 'p1', done: false },
      { id: 'ep-3', memberId: 'p14', why: 'Newer relationship, thin evidence — a session hallway is the low-cost way to learn.', opener: 'What broke first when capacity planning moved to AI workloads?', done: false },
    ],
    status: 'upcoming',
  },
  {
    id: 'le-dinner', name: 'Manufacturing Operators Dinner', kind: 'dinner',
    venue: 'Private room, Corbin & Vale', city: 'Indianapolis, IN',
    startsAt: day(11), endsAt: day(11),
    goals: ['Give before asking', 'Understand distributor quoting pain'],
    attendeeIds: ['p3', 'p18', 'p23'], companyIds: ['co-forgeline'], circleIds: ['cir-indiana'],
    intentIds: [], systemIds: ['sys-golden-report'], sessions: [],
    followUpWindowDays: 7, attendanceVisibility: 'circle',
    myPlan: [{ id: 'ep-4', memberId: 'p23', why: 'Plant-floor view of the quoting delay.', opener: 'Where does a quote actually stall on your floor?', done: true }],
    status: 'follow-up',
  },
]

/* -------------------------------------------------------------- gaps */

export const seedGaps: RelationshipGap[] = [
  {
    id: 'gap-1', ownerId: 'me', objective: 'Place the Golden Report into three industrial accounts',
    dimension: 'role', missing: 'Private-equity operating partners and portfolio CFOs',
    strength: 'Strong at CEO and operations level in manufacturing',
    whyItMatters: 'Industrial buying decisions above a certain size are underwritten by the sponsor, not the plant.',
    bridgeMemberId: 'p2', bridgeReason: 'Operating partner who already asked how you measure revenue leakage.',
    circleIds: ['cir-pe-revenue'], systemIds: ['sys-golden-report'],
    nextMove: 'Answer her operating-partner ask with one useful observation before requesting anything.',
    severity: 82,
  },
  {
    id: 'gap-2', ownerId: 'me', objective: 'Place the Golden Report into three industrial accounts',
    dimension: 'expertise', missing: 'Finance and distribution leaders',
    strength: 'Deep on operations, sales and systems',
    whyItMatters: 'Quoting delays are usually funded out of finance and felt by distribution. Neither is represented in your network.',
    bridgeMemberId: 'p18', bridgeReason: 'Sells through industrial distribution and knows the finance gatekeepers.',
    circleIds: ['cir-indiana'], systemIds: ['sys-golden-report'],
    nextMove: 'Ask your network who has sold into industrial finance, before asking for a name.',
    severity: 68,
  },
  {
    id: 'gap-3', ownerId: 'me', objective: 'Place the Golden Report into three industrial accounts',
    dimension: 'geography', missing: 'Southeast industrial corridor',
    strength: 'Midwest coverage is genuinely strong',
    whyItMatters: 'Two of your strongest proof points are regional, which limits where the method travels.',
    bridgeMemberId: 'p8', bridgeReason: 'Buys logistics platforms in the Southeast and sees industrial operators constantly.',
    circleIds: ['cir-infra-buyers'], systemIds: [],
    nextMove: 'Offer the diagnostic framing into one of his portfolio conversations first.',
    severity: 54,
  },
]

/* -------------------------------------------------- portable identity */

export const seedIdentity: PortableIdentity[] = [
  {
    id: 'pi-me', memberId: 'me', slug: 'joseph-editorial',
    headline: 'I diagnose where revenue leaks before anyone sells a method.',
    shareIdentity: true, shareIntents: true, shareCanHelp: true, shareSystems: true,
    shareCircles: false, sharePassport: true, shareAvailability: true,
    introStyle: 'Warm path preferred. One specific reason, one specific outcome, no decks.',
    requestsEnabled: true, visibility: 'public',
    requests: [
      { id: 'pir-1', name: 'Marguerite Sale', email: 'm.sale@havenline.example', context: 'Runs operations for a 90-person fabricator with a quoting backlog. Would like 20 minutes.', kind: 'connect', when: day(2), status: 'new' },
      { id: 'pir-2', name: 'Theodore Rask', email: 't.rask@brightfold.example', context: 'Asking for an introduction to an operating partner. No shared context yet.', kind: 'intro', when: day(6), status: 'declined' },
    ],
    updatedAt: day(2),
  },
]

/* ----------------------------------------------------- consent ledger */

export const seedConsent: ConsentLedgerEntry[] = [
  { id: 'cl-1', ownerId: 'me', item: 'Current focus', detail: 'Placing the Golden Report into three industrial accounts this quarter.', scope: 'shareable', sharedWith: [{ id: 'sw-1', label: 'Nolan Pierce', reason: 'Named in the introduction context.', when: day(9), kind: 'member' }, { id: 'sw-2', label: 'Portable identity link', reason: 'You enabled current intents on your shareable page.', when: day(30), kind: 'link' }], sourceType: 'explicit', revocable: true, revoked: false, updatedAt: day(9) },
  { id: 'cl-2', ownerId: 'me', item: 'Revenue leakage note on ForgeLine', detail: 'Private observation about pipeline discipline before the second facility.', scope: 'private', sharedWith: [], sourceType: 'derived', revocable: true, revoked: false, updatedAt: day(6) },
  { id: 'cl-3', ownerId: 'me', item: 'Availability for introductions', detail: 'Three considered conversations a month.', scope: 'public', sharedWith: [{ id: 'sw-3', label: 'Aetheris representative', reason: 'Allowed to answer availability questions from approved context.', when: day(14), kind: 'representative' }], sourceType: 'explicit', revocable: true, revoked: false, updatedAt: day(14) },
  { id: 'cl-4', ownerId: 'me', item: 'Golden Report evidence summary', detail: 'Two-page diagnostic result with client names removed.', scope: 'shareable', sharedWith: [{ id: 'sw-4', label: 'Context capsule · Mina Park', reason: 'Cleared for one introduction only.', when: day(4), kind: 'capsule' }], sourceType: 'explicit', revocable: true, revoked: false, updatedAt: day(4) },
  { id: 'cl-5', ownerId: 'me', item: 'Circle membership', detail: 'AI Operators in Manufacturing, Indiana Business Owners.', scope: 'organization', sharedWith: [{ id: 'sw-5', label: 'Circle members', reason: 'Membership is visible inside the circle.', when: day(120), kind: 'circle' }], sourceType: 'explicit', revocable: false, revoked: false, updatedAt: day(120) },
  { id: 'cl-6', ownerId: 'me', item: 'Message history with Mateo Quinn', detail: 'Quiet sale process. Discretion requested.', scope: 'private', sharedWith: [], sourceType: 'explicit', revocable: true, revoked: false, updatedAt: day(4) },
]

/* ------------------------------------------------------- reciprocity */

export const seedReciprocity: ReciprocitySignal[] = [
  { id: 'rc-1', ownerId: 'me', counterpartyId: 'p1', counterpartyName: 'Adrian Vale', circleId: 'cir-ai-manufacturing', helpOffered: 1, helpAccepted: 1, introsMade: 0, introsReceived: 2, contextUsefulness: 84, unansweredAsks: 0, outcomesTogether: 1, recommendation: 'Adrian has made two introductions for you in the last month and you have made none for him. There are two credible ways to create value before asking again: send the plant-floor quoting note he asked about, or name the operator he was looking for in professional services.', direction: 'you owe value', updatedAt: day(2) },
  { id: 'rc-2', ownerId: 'me', counterpartyId: 'p2', counterpartyName: 'Mina Park', circleId: 'cir-pe-revenue', helpOffered: 0, helpAccepted: 0, introsMade: 1, introsReceived: 0, contextUsefulness: 61, unansweredAsks: 1, outcomesTogether: 1, recommendation: 'Her operating-partner ask has gone unanswered twice. Answering it with one useful observation is worth more than any request you could send this week.', direction: 'you owe value', updatedAt: day(9) },
  { id: 'rc-3', ownerId: 'me', counterpartyId: 'p5', counterpartyName: 'Rohan Vey', helpOffered: 2, helpAccepted: 2, introsMade: 2, introsReceived: 1, contextUsefulness: 77, unansweredAsks: 0, outcomesTogether: 0, recommendation: 'This relationship is balanced. An ask here is reasonable and likely to be answered.', direction: 'balanced', updatedAt: day(5) },
  { id: 'rc-4', ownerId: 'me', counterpartyId: 'p3', counterpartyName: 'Nolan Pierce', helpOffered: 3, helpAccepted: 2, introsMade: 1, introsReceived: 0, contextUsefulness: 90, unansweredAsks: 0, outcomesTogether: 0, recommendation: 'You have given consistently here. Nothing is owed — but one promise is still open, and closing it matters more than adding value.', direction: 'they owe nothing', updatedAt: day(4) },
]

/* --------------------------------------------------------- decay risks */

export const seedDecay: RelationshipDecayRisk[] = [
  {
    id: 'dr-1', ownerId: 'me', memberId: 'p3', risk: 64, horizon: 'Likely to cool within three weeks',
    causes: [
      { cause: 'unfinished commitment', explanation: 'You promised a two-page diagnostic summary before the plant review and it has not been sent.' },
      { cause: 'no next reason', explanation: 'There is no scheduled reason for the next conversation once the review passes.' },
    ],
    minimumAction: 'Send the two-page summary. Nothing else. It closes the promise and creates the next reason at the same time.',
    actionKind: 'close a loop', evidenceIds: ['ev-1', 'ev-3'], updatedAt: day(2),
  },
  {
    id: 'dr-2', ownerId: 'me', memberId: 'p2', risk: 58, horizon: 'Cooling now',
    causes: [
      { cause: 'one-sided asks', explanation: 'The last two exchanges were requests from your side.' },
      { cause: 'unanswered message', explanation: 'Her operating-partner ask has been posted twice with no response from you.' },
    ],
    minimumAction: 'Answer the ask with one observation from your own portfolio work. Do not attach a request.',
    actionKind: 'give value', evidenceIds: ['ev-2'], updatedAt: day(3),
  },
  {
    id: 'dr-3', ownerId: 'me', memberId: 'p10', risk: 22, horizon: 'Healthy',
    causes: [{ cause: 'timing mismatch', explanation: 'He is mid-process and asked for discretion. Contact now would cost more than it earns.' }],
    minimumAction: 'Do nothing yet. Wait until the process is public or he raises it again.',
    actionKind: 'do nothing yet', evidenceIds: ['ev-5'], updatedAt: day(1),
  },
]

/* ----------------------------------------------- digital representative */

export const seedRepresentative: DigitalRepresentativePolicy[] = [
  {
    id: 'drp-me', memberId: 'me', enabled: true,
    allowedTopics: ['What I work on', 'Revenue diagnostics', 'Who I am useful to', 'Introduction preferences', 'Availability'],
    blockedTopics: ['Client names', 'Pricing', 'Private relationship history', 'Anything under an NDA'],
    approvedScopes: ['public', 'shareable'],
    allowedActions: ['answer from approved context', 'collect opportunity', 'collect question', 'suggest availability'],
    authorityLimits: ['Never agrees to a deal, price or commitment', 'Never schedules without your approval', 'Never quotes private memory', 'Always states it is an Aetheris representative, not the person'],
    handoffNote: 'If the question needs judgment, the representative collects it and hands off to you within a day.',
    transcript: [
      { id: 'dt-1', when: day(3), from: 'Marguerite Sale', question: 'Would Joseph be interested in a quoting backlog problem at a 90-person fabricator?', answer: 'That is close to the work he does most. He starts with a diagnostic before any method conversation. I have recorded the context and passed it to him.', permitted: true, handedOff: true },
      { id: 'dt-2', when: day(8), from: 'Theodore Rask', question: 'Can you confirm his rate and book a slot for Thursday?', answer: 'I do not have permission to discuss commercial terms or place anything on his calendar. I can pass the request to him with your context.', permitted: false, handedOff: true },
    ],
    updatedAt: day(3),
  },
]

/* ----------------------------------------------- introduction availability */

export const seedAvailability: IntroductionAvailability[] = [
  {
    id: 'ia-1', memberId: 'p1', category: 'Industrial technology founders → operators',
    qualification: ['Shipping product with at least one named industrial customer', 'A specific outcome, not a general meeting', 'Willing to share context before the call'],
    requiredContext: ['What is being moved', 'Why now', 'What the operator gets'],
    preferredStrength: 'warm', maxIntroductions: 3, used: 1,
    opensAt: day(6), closesAt: ahead(22), scope: 'shareable',
    note: 'Three introductions this month. Not a marketplace: quality of context decides, never order of arrival.',
  },
  {
    id: 'ia-2', memberId: 'p2', category: 'Operators → portfolio revenue conversations',
    qualification: ['Evidence of a recovered quarter, not a deck', 'No vendor pitching', 'Referenceable prior work'],
    requiredContext: ['One measured result', 'Where the leak was found'],
    preferredStrength: 'strong', maxIntroductions: 2, used: 2,
    opensAt: day(20), closesAt: ahead(9), scope: 'shareable',
    note: 'Window is currently full. Reopens next cycle.',
  },
]

/* --------------------------------------------------------- snapshots */

export const seedSnapshots: NetworkSnapshot[] = [
  {
    id: 'ns-1', ownerId: 'me', takenAt: day(180), label: 'Six months ago',
    connectionIds: ['p1', 'p3', 'p6'], activeCircleIds: ['cir-indiana'], systemsSpread: [], dormantIds: ['p6'],
    introductionsMade: 2, opportunitiesOpen: ['ForgeLine pipeline visibility'],
    note: 'Regional, operations-heavy, one circle carrying most of the relevance.',
  },
  {
    id: 'ns-2', ownerId: 'me', takenAt: day(90), label: 'Three months ago',
    connectionIds: ['p1', 'p3', 'p5', 'p6', 'p23'], activeCircleIds: ['cir-indiana', 'cir-ai-manufacturing'],
    systemsSpread: ['sys-golden-report'], dormantIds: ['p6'], introductionsMade: 5,
    opportunitiesOpen: ['ForgeLine pipeline visibility', 'Distributor quoting pilot'],
    note: 'The manufacturing circle started producing real conversations. The system began to travel.',
  },
  {
    id: 'ns-3', ownerId: 'me', takenAt: day(1), label: 'Today',
    connectionIds: ['p1', 'p2', 'p3', 'p5', 'p14', 'p18', 'p23'],
    activeCircleIds: ['cir-indiana', 'cir-ai-manufacturing', 'cir-pe-revenue'],
    systemsSpread: ['sys-golden-report'], dormantIds: ['p6'], introductionsMade: 9,
    opportunitiesOpen: ['ForgeLine second facility', 'Southeast logistics collision', 'Clinical throughput adjacency'],
    note: 'Capital-side relationships appeared for the first time. One relationship went dormant.',
  },
]

/* ------------------------------------------------------- attribution */

export const seedAttribution: OutcomeAttributionEdge[] = [
  { id: 'ae-1', outcomeId: 'out-1', step: 1, fromKind: 'circle', fromId: 'cir-ai-manufacturing', fromLabel: 'AI Operators in Manufacturing', toKind: 'post', toId: 'f8', toLabel: 'Field note on quoting delays', contribution: 'contextual', evidenceIds: [], when: day(150), note: 'The circle made the field note visible to the right operators.' },
  { id: 'ae-2', outcomeId: 'out-1', step: 2, fromKind: 'post', fromId: 'f8', fromLabel: 'Field note on quoting delays', toKind: 'person', toId: 'p1', toLabel: 'Adrian Vale', contribution: 'influenced', evidenceIds: [], when: day(140), note: 'Adrian recognised the problem from a portfolio conversation.' },
  { id: 'ae-3', outcomeId: 'out-1', step: 3, fromKind: 'person', fromId: 'p1', fromLabel: 'Adrian Vale', toKind: 'intro', toId: 'intro-p3', toLabel: 'Introduction to Nolan Pierce', contribution: 'direct', evidenceIds: ['ev-8'], when: day(130), note: 'Double opt-in introduction with context attached.' },
  { id: 'ae-4', outcomeId: 'out-1', step: 4, fromKind: 'intro', fromId: 'intro-p3', fromLabel: 'Introduction to Nolan Pierce', toKind: 'meeting', toId: 'mt-1', toLabel: 'Working session on pipeline visibility', contribution: 'direct', evidenceIds: [], when: day(120), note: 'First working session, no selling.' },
  { id: 'ae-5', outcomeId: 'out-1', step: 5, fromKind: 'meeting', fromId: 'mt-1', fromLabel: 'Working session', toKind: 'system', toId: 'sys-golden-report', toLabel: 'Golden Report diagnostic', contribution: 'direct', evidenceIds: ['ev-3'], when: day(100), note: 'The diagnostic was shared, not sold.' },
  { id: 'ae-6', outcomeId: 'out-1', step: 6, fromKind: 'system', fromId: 'sys-golden-report', fromLabel: 'Golden Report diagnostic', toKind: 'outcome', toId: 'out-1', toLabel: 'Portfolio referral became a hire', contribution: 'influenced', evidenceIds: [], when: day(90), note: 'The evidence produced credibility that carried into a second conversation.' },
]

/* ----------------------------------------------------- knowledge posts */

export const seedKnowledge: KnowledgePost[] = [
  {
    id: 'kp-1', authorId: 'p3', kind: 'Field Note', title: 'What I learned implementing AI in a 200-person manufacturer',
    body: 'The model was never the problem. Quoting stalled because three people each believed someone else owned the approval. We fixed the sequence before we touched software, and the backlog fell by a third in six weeks.',
    industries: ['Manufacturing'], circleIds: ['cir-ai-manufacturing'], systemIds: ['sys-golden-report'],
    whyInYourFeed: 'You are placing a diagnostic into industrial accounts and this is the same failure pattern you named twice.',
    relevance: 92, usefulPrivately: false, saved: false,
    discussion: [{ id: 'kd-1', authorId: 'p23', text: 'Same on our floor. Approval ownership, not tooling.', when: day(1) }],
    followUps: [], createdAt: day(2),
  },
  {
    id: 'kp-2', authorId: 'p2', kind: 'Field Note', title: 'Three things PE operating partners are asking for this quarter',
    body: 'One: evidence of a recovered quarter, not a roadmap. Two: someone who can hold a plant conversation and a board conversation. Three: reporting that survives a CFO change. Everything else waits.',
    industries: ['Private equity'], circleIds: ['cir-pe-revenue'], systemIds: [],
    whyInYourFeed: 'Your gap map shows no capital-side relationships, and this is the buying view you are missing.',
    relevance: 88, usefulPrivately: false, saved: false, discussion: [], followUps: [], createdAt: day(4),
  },
  {
    id: 'kp-3', authorId: 'p5', kind: 'Decision Lesson', title: 'We chose the slower distribution partner and it was right',
    body: 'The faster partner wanted exclusivity in a category we had not proven. We took the slower one with an operator who could vouch for us. It cost two quarters and saved the positioning.',
    industries: ['Software'], circleIds: ['cir-series-a'], systemIds: [],
    whyInYourFeed: 'You are weighing a channel path in industrial distribution right now.',
    relevance: 74, usefulPrivately: false, saved: false, discussion: [], followUps: [], createdAt: day(6),
  },
  {
    id: 'kp-4', authorId: 'p1', kind: 'Event Debrief', title: 'What actually happened at the operators dinner',
    body: 'Nobody pitched. Two people described a problem precisely enough that the room could help. That is the whole format, and it is why the follow-ups land.',
    industries: ['Manufacturing', 'Professional services'], circleIds: ['cir-indiana'], systemIds: [],
    whyInYourFeed: 'You attended, and one open loop from that room is still unresolved.',
    relevance: 70, usefulPrivately: false, saved: false, discussion: [], followUps: [], createdAt: day(9),
  },
]

/* ------------------------------------------------------ advisory boards */

export const seedBoards: AdvisoryBoard[] = [
  {
    id: 'ab-1', ownerId: 'me', name: 'Distribution decision board',
    decision: 'Do we place the Golden Report through a channel partner or keep every placement direct for another two quarters?',
    context: 'Two industrial proof points, both Midwest. A channel partner would widen reach but dilute the diagnostic sequence that makes it work.',
    memberIds: ['p1', 'p5', 'p18'],
    invited: [{ memberId: 'p2', expertise: 'Capital-side view of channel economics', status: 'invited' }],
    missingExpertise: [
      { label: 'Industrial finance', why: 'Nobody on the board has sat where the budget is approved.', suggestedMemberId: 'p18' },
      { label: 'Clinical or regulated operations', why: 'A second industry would test whether the sequence generalises.', suggestedMemberId: 'p17' },
    ],
    contributions: [
      { id: 'ac-1', memberId: 'p1', stance: 'disagrees', advice: 'Stay direct another two quarters.', reasoning: 'The diagnostic is the product. A partner will skip it to shorten the sale.', when: day(5) },
      { id: 'ac-2', memberId: 'p5', stance: 'agrees', advice: 'Run one controlled channel pilot.', reasoning: 'One partner, one account, written sequence. You learn without betting the positioning.', when: day(4) },
      { id: 'ac-3', memberId: 'p18', stance: 'agrees', advice: 'Channel, but only where you keep the diagnostic.', reasoning: 'I can open industrial doors; I cannot run your method, and should not.', when: day(3) },
    ],
    meetingIds: [], openLoops: ['Write the placement sequence a partner cannot shorten.'],
    decisionMade: false, decisionRecord: '', circleId: 'cir-ai-manufacturing', evidenceIds: ['ev-3'],
    visibility: 'private', createdAt: day(7),
  },
]

/* ------------------------------------------------ context adapters */

export const seedAdapters: RelationshipContextAdapter[] = [
  { id: 'ad-1', surface: 'browser extension', description: 'Highlight a name or company anywhere and get permission-safe relationship context.', readiness: 'contract ready', connected: false, scopesRequested: ['public', 'shareable'], note: 'Service contract defined. Nothing is connected yet.' },
  { id: 'ad-2', surface: 'email sidebar', description: 'Show weather, open loops and the best next move beside a thread.', readiness: 'in preview', connected: false, scopesRequested: ['public', 'shareable', 'team'], note: 'Runs against preview data only.' },
  { id: 'ad-3', surface: 'calendar panel', description: 'Before a meeting, surface context, commitments and one opener.', readiness: 'in preview', connected: false, scopesRequested: ['public', 'shareable', 'team'], note: 'Runs against preview data only.' },
  { id: 'ad-4', surface: 'CRM panel', description: 'Answer "what do we actually know about this relationship?" inside a record.', readiness: 'contract ready', connected: false, scopesRequested: ['team', 'organization'], note: 'Requires an organization consent policy before connection.' },
  { id: 'ad-5', surface: 'mobile share sheet', description: 'Share a profile or thread into Aetheris and capture context immediately.', readiness: 'not connected', connected: false, scopesRequested: ['private'], note: 'Not built yet. Listed so the contract stays honest.' },
]
