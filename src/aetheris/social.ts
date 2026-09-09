import { people as seedPeople } from './data'
import { calculateConnectionScore, determineRadarState } from './lib/engine'
import type { Person, PrivacyScope, ScoreBreakdown } from './types'

export type MemberRole = 'Founder' | 'Investor' | 'Operator' | 'Executive' | 'Advisor' | 'Specialist' | 'Connector'
export type IntroState =
  | 'recommended' | 'requested' | 'waiting' | 'accepted' | 'introduced' | 'conversing' | 'closed'

export interface Member extends Person {
  role: MemberRole
  industry: string
  expertise: string[]
  focus: string
  thesis: string
  availability: string
  mutuals: string[]
  saved?: boolean
  introState: IntroState
  joined: string
}

const base: ScoreBreakdown = {
  strategicFit: 70, mutualValue: 70, timing: 60, trust: 60,
  relationshipStrength: 60, decisionInfluence: 70, opportunityValue: 60, friction: 25,
}

type RawMember = Omit<Member, 'scoreTotal' | 'radar' | 'score'> & { score: Partial<ScoreBreakdown> }

function build(raw: RawMember): Member {
  const score = { ...base, ...raw.score }
  const scoreTotal = calculateConnectionScore(score)
  const partial = { ...raw, score, scoreTotal }
  return { ...partial, radar: determineRadarState(partial) }
}

/** Extra editorial/social attributes for the six original relationship seeds. */
const extras: Record<string, Omit<Member, keyof Person>> = {
  p1: {
    role: 'Connector', industry: 'Professional services', expertise: ['Founder networks', 'Positioning', 'Media'],
    focus: 'Introducing distinctive operators to founders and portfolio leaders.',
    thesis: 'The best introductions are earned. I look for people whose work already proves the point.',
    availability: 'Open to 4 conversations a month', mutuals: ['Maya Chen', 'Kevin Ward'],
    introState: 'conversing', joined: '2024',
  },
  p2: {
    role: 'Investor', industry: 'Private equity', expertise: ['Value creation', 'Portfolio operations', 'B2B growth'],
    focus: 'Standardising growth reporting across eight operating companies.',
    thesis: 'Operators who can show where revenue leaks are worth more than another dashboard.',
    availability: 'Selective · warm paths only', mutuals: ['Gary Frey'],
    introState: 'waiting', joined: '2025',
  },
  p3: {
    role: 'Executive', industry: 'Manufacturing', expertise: ['Industrial sales', 'CRM adoption', 'Pipeline design'],
    focus: 'Making pipeline visibility survive a doubling sales team.',
    thesis: 'I buy clarity, not software. Show me where the handoff breaks.',
    availability: 'Meets weekly with new operators', mutuals: ['Alison Kaiser'],
    introState: 'introduced', joined: '2024',
  },
  p4: {
    role: 'Operator', industry: 'Energy', expertise: ['Channel design', 'Enterprise partnerships'],
    focus: 'Building a national partner motion after a remit expansion.',
    thesis: 'Partnerships work when both sides can name the customer outcome.',
    availability: 'Reconnecting after a role change', mutuals: ['Scott Kelley'],
    introState: 'recommended', joined: '2023',
  },
  p5: {
    role: 'Founder', industry: 'Fintech', expertise: ['Payments', 'Enterprise sales', 'Capital strategy'],
    focus: 'Preparing enterprise distribution ahead of a raise.',
    thesis: 'Distribution beats product polish. I want operators who have done it once already.',
    availability: 'Quiet quarter · asynchronous first', mutuals: ['Kevin Ward'],
    introState: 'closed', joined: '2023',
  },
  p6: {
    role: 'Specialist', industry: 'Executive search', expertise: ['AI leadership hiring', 'Referral networks'],
    focus: 'Two systems leadership searches in market now.',
    thesis: 'I trade in trust. One bad referral costs a decade of credibility.',
    availability: 'Always open to specialists', mutuals: ['Prateek Sanjay'],
    introState: 'requested', joined: '2025',
  },
}

const newMembers: RawMember[] = [
  {
    id: 'p7', name: 'Sarah Villalobos', initials: 'SV', title: 'Chief Operating Officer', company: 'Meridian Field Services',
    location: 'Dallas, TX', role: 'Executive', industry: 'Field services',
    tags: ['Operations', 'Field service', 'Scale'], expertise: ['Multi-site operations', 'Workforce planning', 'M&A integration'],
    needs: ['Operators who scaled service businesses past $50M', 'US expansion advisors'],
    offers: ['Field-service playbooks', 'Integration experience', 'Executive references'],
    focus: 'Taking a $28M service business into four new US regions.',
    thesis: 'Growth is an operating problem long before it is a marketing problem.',
    availability: 'Two conversations a week', mutuals: ['Scott Kelley', 'Maya Chen'],
    lastInteractionDays: 6, relationshipStatus: 'active', introState: 'recommended', joined: '2025',
    score: { strategicFit: 91, mutualValue: 89, timing: 94, trust: 68, relationshipStrength: 60, decisionInfluence: 93, opportunityValue: 88, friction: 16 },
    whyThem: 'She is mid-expansion and the exact profile Intros can help both learn from and support.',
    whyYou: 'You can show her where handoffs break before four new regions multiply the problem.',
    whyNow: 'Regional expansion decisions are being made this quarter.',
    bestPath: ['You', 'Scott Kelley', 'Sarah Villalobos'],
    nextAction: 'Offer one specific observation about multi-region handoffs, then ask what she is seeing.',
    dontDo: 'Do not send a generic capability overview.', confidence: 90, opportunityLow: 60000, opportunityHigh: 240000,
  },
  {
    id: 'p8', name: 'Marcus Adeyemi', initials: 'MA', title: 'Managing Director', company: 'Halstead Bridge Capital',
    location: 'New York, NY', role: 'Investor', industry: 'Finance',
    tags: ['Credit', 'Growth capital', 'Diligence'], expertise: ['Structured finance', 'Diligence', 'Board work'],
    needs: ['Manufacturing operators for diligence calls', 'Advisory-grade domain specialists'],
    offers: ['Capital introductions', 'Board perspective', 'LP relationships'],
    focus: 'Sourcing industrial platforms with real operating upside.',
    thesis: 'Capital is common. Operators who can diagnose a business quickly are not.',
    availability: 'Open to advisory work', mutuals: ['Maya Chen'],
    lastInteractionDays: 21, relationshipStatus: 'new', introState: 'accepted', joined: '2025',
    score: { strategicFit: 86, mutualValue: 84, timing: 80, trust: 58, relationshipStrength: 52, decisionInfluence: 94, opportunityValue: 92, friction: 30 },
    whyThem: 'He needs credible operators for diligence and advisory seats across industrial deals.',
    whyYou: 'Your forensic approach gives him faster conviction than a generic consultant.',
    whyNow: 'He said he is open to advisory work over the next two quarters.',
    bestPath: ['You', 'Maya Chen', 'Marcus Adeyemi'],
    nextAction: 'Send one page on how you diagnose a revenue system in a week.',
    dontDo: 'Do not ask him to introduce you to portfolio companies yet.', confidence: 84, opportunityLow: 40000, opportunityHigh: 300000,
  },
  {
    id: 'p9', name: 'Lena Hartmann', initials: 'LH', title: 'Co-founder & CTO', company: 'Northwind Health Systems',
    location: 'Boston, MA', role: 'Founder', industry: 'Healthcare',
    tags: ['Health tech', 'AI', 'Clinical data'], expertise: ['Clinical data platforms', 'AI evaluation', 'Regulated engineering'],
    needs: ['Health system executive introductions', 'Enterprise security advisors'],
    offers: ['Clinical AI expertise', 'Regulated deployment experience'],
    focus: 'Moving from pilot hospitals to a signed health system network.',
    thesis: 'In healthcare, trust compounds slower and matters more.',
    availability: 'Fortnightly conversations', mutuals: ['Marcus Adeyemi', 'Gary Frey'],
    lastInteractionDays: 13, relationshipStatus: 'active', introState: 'recommended', joined: '2026',
    score: { strategicFit: 82, mutualValue: 86, timing: 76, trust: 71, relationshipStrength: 63, decisionInfluence: 84, opportunityValue: 79, friction: 22 },
    whyThem: 'She is entering the exact enterprise credibility phase Intros makes easier.',
    whyYou: 'You can map who inside a health system actually decides, and why now.',
    whyNow: 'Two pilots convert or lapse before the next budget cycle.',
    bestPath: ['You', 'Gary Frey', 'Lena Hartmann'],
    nextAction: 'Share how you would map decision influence inside one health system.',
    dontDo: 'Do not promise clinical introductions you cannot verify.', confidence: 81, opportunityLow: 30000, opportunityHigh: 180000,
  },
  {
    id: 'p10', name: 'Diego Ferreira', initials: 'DF', title: 'VP Logistics Strategy', company: 'Portline Freight Group',
    location: 'Miami, FL', role: 'Operator', industry: 'Logistics',
    tags: ['Supply chain', 'Cross-border', 'Network design'], expertise: ['Network design', 'Cross-border trade', 'Cost modelling'],
    needs: ['AI forecasting specialists', 'Nearshoring partners'],
    offers: ['Logistics network access', 'Latin America relationships'],
    focus: 'Rebuilding a nearshoring lane strategy for 2027 volume.',
    thesis: 'Every logistics decision is a relationship decision with a spreadsheet attached.',
    availability: 'Open to intros with context', mutuals: ['Sarah Villalobos'],
    lastInteractionDays: 44, relationshipStatus: 'new', introState: 'recommended', joined: '2025',
    score: { strategicFit: 74, mutualValue: 78, timing: 68, trust: 60, relationshipStrength: 55, decisionInfluence: 80, opportunityValue: 72, friction: 26 },
    whyThem: 'He is actively sourcing forecasting capability and values operator credibility.',
    whyYou: 'Your systems work translates directly into lane-level decision quality.',
    whyNow: 'Lane commitments for next year are being modelled now.',
    bestPath: ['You', 'Sarah Villalobos', 'Diego Ferreira'],
    nextAction: 'Ask which lane decision is currently hardest to defend internally.',
    dontDo: 'Do not lead with technology vocabulary.', confidence: 76,
  },
  {
    id: 'p11', name: 'Priya Raghavan', initials: 'PR', title: 'Founder & Principal', company: 'Raghavan Advisory',
    location: 'San Francisco, CA', role: 'Advisor', industry: 'SaaS',
    tags: ['Go-to-market', 'Pricing', 'Board advisory'], expertise: ['Pricing strategy', 'GTM diagnostics', 'Board readiness'],
    needs: ['Founders preparing a Series B narrative', 'Warm operator introductions'],
    offers: ['Pricing teardowns', 'Board-ready GTM reviews', 'Investor relationships'],
    focus: 'Advising six SaaS founders through pricing and GTM resets.',
    thesis: 'Most growth problems are unresolved pricing and positioning arguments.',
    availability: 'One new client per quarter', mutuals: ['Lena Hartmann', 'Gary Frey'],
    lastInteractionDays: 9, relationshipStatus: 'strong', introState: 'conversing', joined: '2024',
    score: { strategicFit: 84, mutualValue: 90, timing: 82, trust: 86, relationshipStrength: 84, decisionInfluence: 76, opportunityValue: 70, friction: 12 },
    whyThem: 'She sits beside founders at exactly the moment relationship context matters most.',
    whyYou: 'Aetheris gives her clients evidence for who to talk to next, not just what to fix.',
    whyNow: 'Three of her clients are raising in the next two quarters.',
    bestPath: ['You', 'Priya Raghavan'],
    nextAction: 'Offer to run one client relationship map as a shared experiment.',
    dontDo: 'Do not position this as competing with her advisory work.', confidence: 92, opportunityLow: 20000, opportunityHigh: 140000,
  },
  {
    id: 'p12', name: 'Tomás Bergeron', initials: 'TB', title: 'President', company: 'Bergeron Construction Group',
    location: 'Denver, CO', role: 'Executive', industry: 'Construction',
    tags: ['Construction', 'Bids', 'Regional growth'], expertise: ['Commercial bidding', 'Project delivery', 'Regional expansion'],
    needs: ['Better bid decision intelligence', 'Owner-side relationships'],
    offers: ['Regional developer relationships', 'Delivery credibility'],
    focus: 'Choosing which commercial bids deserve real effort.',
    thesis: 'We win work through relationships and lose it through bad qualification.',
    availability: 'Prefers introductions from people he knows', mutuals: ['Diego Ferreira'],
    lastInteractionDays: 168, relationshipStatus: 'dormant', introState: 'recommended', joined: '2023',
    score: { strategicFit: 71, mutualValue: 73, timing: 55, trust: 74, relationshipStrength: 72, decisionInfluence: 82, opportunityValue: 66, friction: 24 },
    whyThem: 'His qualification problem is a scoring problem, which is exactly what Intros does.',
    whyYou: 'You can help him decide which relationships justify a bid.',
    whyNow: 'A quiet period makes this the right moment to rebuild the relationship.',
    bestPath: ['You', 'Diego Ferreira', 'Tomás Bergeron'],
    nextAction: 'Reconnect with a short note about qualification, not software.',
    dontDo: 'Do not reference how long it has been.', confidence: 74,
  },
  {
    id: 'p13', name: 'Ava Lindqvist', initials: 'AL', title: 'Brand Founder', company: 'Fenwick & Lind',
    location: 'Austin, TX', role: 'Founder', industry: 'Consumer brands',
    tags: ['Consumer', 'Retail', 'DTC'], expertise: ['Brand building', 'Retail distribution', 'Creative direction'],
    needs: ['Retail buyers', 'Operators who scaled DTC into wholesale'],
    offers: ['Brand strategy', 'Creative talent network'],
    focus: 'Moving a considered consumer brand into national wholesale.',
    thesis: 'Distribution without brand discipline is just expensive noise.',
    availability: 'Open to peer founders', mutuals: ['Priya Raghavan'],
    lastInteractionDays: 27, relationshipStatus: 'new', introState: 'requested', joined: '2026',
    score: { strategicFit: 66, mutualValue: 74, timing: 70, trust: 58, relationshipStrength: 52, decisionInfluence: 72, opportunityValue: 60, friction: 22 },
    whyThem: 'She is building the kind of relationship-led distribution Intros maps well.',
    whyYou: 'You can show her which buyer relationships already exist two steps away.',
    whyNow: 'Wholesale conversations start before the next buying season.',
    bestPath: ['You', 'Priya Raghavan', 'Ava Lindqvist'],
    nextAction: 'Share two buyer paths already visible in the graph.',
    dontDo: 'Do not treat her brand as a commodity DTC story.', confidence: 72,
  },
  {
    id: 'p14', name: 'Elliot Nakamura', initials: 'EN', title: 'Head of Applied AI', company: 'Cassian Labs',
    location: 'Seattle, WA', role: 'Specialist', industry: 'AI',
    tags: ['Applied AI', 'Evaluation', 'Systems'], expertise: ['Model evaluation', 'Applied AI systems', 'Data governance'],
    needs: ['Enterprise design partners', 'Operators who can define the real problem'],
    offers: ['Applied AI review', 'Evaluation frameworks', 'Technical credibility'],
    focus: 'Finding design partners with genuine operational problems.',
    thesis: 'Most AI projects fail at problem definition, not model quality.',
    availability: 'Two design partner slots', mutuals: ['Kevin Ward', 'Lena Hartmann'],
    lastInteractionDays: 3, relationshipStatus: 'active', introState: 'accepted', joined: '2025',
    score: { strategicFit: 88, mutualValue: 87, timing: 90, trust: 74, relationshipStrength: 68, decisionInfluence: 79, opportunityValue: 76, friction: 14 },
    whyThem: 'He needs operators who can frame problems precisely, which is your strength.',
    whyYou: 'You can bring him real operational problems with named decision-makers.',
    whyNow: 'Two design partner slots close this month.',
    bestPath: ['You', 'Kevin Ward', 'Elliot Nakamura'],
    nextAction: 'Propose one concrete operational problem worth evaluating together.',
    dontDo: 'Do not send an abstract partnership proposal.', confidence: 88, opportunityLow: 25000, opportunityHigh: 150000,
  },
]

export const members: Member[] = [
  ...seedPeople.map((p): Member => {
    const extra = extras[p.id]
    return {
      ...p,
      role: extra?.role ?? 'Operator',
      industry: extra?.industry ?? 'Professional services',
      expertise: extra?.expertise ?? p.tags,
      focus: extra?.focus ?? p.whyThem,
      thesis: extra?.thesis ?? p.whyThem,
      availability: extra?.availability ?? 'Selective introductions',
      mutuals: extra?.mutuals ?? [],
      introState: extra?.introState ?? 'recommended',
      joined: extra?.joined ?? '2025',
    }
  }),
  ...newMembers.map(build),
]

export const me = {
  name: 'Joseph Toney', initials: 'JT', title: 'Founder · Relationship systems strategist',
  company: 'Aetheris', location: 'Charlotte, NC',
  thesis: 'I build systems that turn relationship context into better business decisions.',
  focus: 'Placing Aetheris Intros with founders, operating partners and trusted connectors.',
  lookingFor: 'PE operating partners and founder-led design partners.',
  canHelpWith: 'Revenue leak forensics, AI systems and relationship strategy.',
  industries: ['SaaS', 'Manufacturing', 'Private equity', 'Professional services'],
  values: 'Evidence, mutual value, good timing and human judgment.',
  availability: 'Selective introductions · 3 conversations this month.',
  expertise: ['Relationship intelligence', 'Revenue diagnostics', 'AI systems design'],
}

export interface NetworkAsk {
  id: string
  memberId: string
  ask: string
  detail: string
  whyNow: string
  offer: string
  industry: string
  location: string
  urgency: 'low' | 'medium' | 'high'
  posted: string
  responses: number
  visibility: 'network' | 'private'
  mine?: boolean
}

export const networkAsks: NetworkAsk[] = [
  {
    id: 'a1', memberId: 'p7', ask: 'Looking for an operator who has scaled a field-service company from $10M to $50M.',
    detail: 'We are entering four regions in eighteen months and want someone who has already lived the operational break points.',
    whyNow: 'Regional hiring plans are approved and start in six weeks.',
    offer: 'Advisory compensation, field-service playbooks and executive references.',
    industry: 'Field services', location: 'Dallas, TX', urgency: 'high', posted: '2 days ago', responses: 4, visibility: 'network',
  },
  {
    id: 'a2', memberId: 'p8', ask: 'Looking for strategic investors with manufacturing experience.',
    detail: 'Co-investors who understand industrial cycles and can hold a position through an operating turnaround.',
    whyNow: 'Two industrial platforms are in exclusivity this quarter.',
    offer: 'Deal access, diligence materials and board perspective.',
    industry: 'Finance', location: 'New York, NY', urgency: 'medium', posted: '5 days ago', responses: 7, visibility: 'network',
  },
  {
    id: 'a3', memberId: 'p1', ask: 'Can introduce founders to PE operating partners in the Midwest.',
    detail: 'I am opening a small number of warm introductions for founders with real operating traction.',
    whyNow: 'Several operating partners are actively sourcing for the next fund cycle.',
    offer: 'Warm introductions, positioning feedback and podcast reach.',
    industry: 'Private equity', location: 'Charlotte, NC', urgency: 'medium', posted: '1 week ago', responses: 11, visibility: 'network',
  },
  {
    id: 'a4', memberId: 'p14', ask: 'Looking for two enterprise design partners with a real operational problem.',
    detail: 'Not a pilot for its own sake. I want a named decision-maker and a measurable outcome.',
    whyNow: 'Design partner slots close at the end of the month.',
    offer: 'Applied AI evaluation, engineering time and an honest verdict.',
    industry: 'AI', location: 'Seattle, WA', urgency: 'high', posted: '3 days ago', responses: 6, visibility: 'network',
  },
  {
    id: 'a5', memberId: 'p9', ask: 'Looking for a warm path to a health system chief operating officer.',
    detail: 'Two pilots need an executive sponsor before the next budget cycle closes.',
    whyNow: 'Budget decisions are made in the next nine weeks.',
    offer: 'Clinical AI expertise and regulated deployment experience.',
    industry: 'Healthcare', location: 'Boston, MA', urgency: 'high', posted: '6 days ago', responses: 3, visibility: 'network',
  },
  {
    id: 'a6', memberId: 'p12', ask: 'Looking for better bid qualification intelligence before we chase commercial work.',
    detail: 'We want to know which owner relationships actually make a bid winnable.',
    whyNow: 'Two large bids are due next month.',
    offer: 'Regional developer relationships and delivery credibility.',
    industry: 'Construction', location: 'Denver, CO', urgency: 'medium', posted: '2 weeks ago', responses: 2, visibility: 'network',
  },
]

export interface Signal {
  id: string
  memberId: string
  kind: 'Role change' | 'New project' | 'Expansion' | 'New need' | 'Intro requested' | 'Waiting on you'
  text: string
  when: string
}

export const signals: Signal[] = [
  { id: 's1', memberId: 'p4', kind: 'Role change', text: 'Alison Kaiser now leads national partnerships at Harbor Grid.', when: '4 days ago' },
  { id: 's2', memberId: 'p7', kind: 'Expansion', text: 'Meridian Field Services approved expansion into four US regions.', when: '1 week ago' },
  { id: 's3', memberId: 'p6', kind: 'Intro requested', text: 'Kevin Ward requested an introduction to a systems leader in your network.', when: '2 days ago' },
  { id: 's4', memberId: 'p3', kind: 'Waiting on you', text: 'Scott Kelley is waiting on the pipeline observation you promised.', when: 'Yesterday' },
  { id: 's5', memberId: 'p14', kind: 'New need', text: 'Elliot Nakamura posted a need for two enterprise design partners.', when: '3 days ago' },
  { id: 's6', memberId: 'p11', kind: 'New project', text: 'Priya Raghavan started three new pricing engagements this month.', when: '5 days ago' },
]

export interface ThreadMessage { id: string; from: 'me' | 'them'; text: string; at: string }
export interface Thread {
  id: string
  memberId: string
  introContext: string
  unread: boolean
  messages: ThreadMessage[]
  commitment: string
  suggested: string
}

export const threads: Thread[] = [
  {
    id: 't1', memberId: 'p3', unread: true,
    introContext: 'Introduced by Gary Frey · shared interest in pipeline accountability.',
    commitment: 'You said you would send one observation before Friday.',
    suggested: 'Scott — the pattern I keep seeing is inbound leads going quiet at the 48-hour mark. Want me to look at that one path with your data?',
    messages: [
      { id: 'm1', from: 'them', text: 'The timing is useful. I’m looking closely at this problem now.', at: 'Mon 10:42' },
      { id: 'm2', from: 'me', text: 'That is exactly why I thought a conversation could be useful. No pitch — just compare notes on the current constraints.', at: 'Mon 10:49' },
      { id: 'm3', from: 'them', text: 'Fair. Our real issue is that nobody trusts the stage data after the demo call.', at: 'Tue 08:15' },
    ],
  },
  {
    id: 't2', memberId: 'p7', unread: true,
    introContext: 'Warm path through Scott Kelley · she is hiring for four new regions.',
    commitment: 'She asked for one example of a multi-region handoff failure.',
    suggested: 'Sarah — the break usually appears between regional dispatch and central billing. Happy to walk through what to watch for before the hiring starts.',
    messages: [
      { id: 'm1', from: 'them', text: 'Scott mentioned you look at where revenue quietly leaks. We are about to quadruple our regions.', at: 'Wed 16:20' },
    ],
  },
  {
    id: 't3', memberId: 'p11', unread: false,
    introContext: 'Long-standing relationship · overlapping advisory clients.',
    commitment: 'You agreed to map one of her client networks as a shared experiment.',
    suggested: 'Priya — pick the client with the messiest buying committee and I will map who actually decides.',
    messages: [
      { id: 'm1', from: 'me', text: 'Two of your founders would get value from a relationship map before they raise.', at: 'Thu 09:02' },
      { id: 'm2', from: 'them', text: 'Agreed. Let’s try it with one client and see whether the reasoning holds up.', at: 'Thu 09:40' },
      { id: 'm3', from: 'me', text: 'Send me the account and I will show you the decision path, not just the org chart.', at: 'Thu 09:44' },
    ],
  },
  {
    id: 't4', memberId: 'p14', unread: false,
    introContext: 'Introduced by Kevin Ward · both looking for real operational problems.',
    commitment: 'He is holding a design partner slot until month end.',
    suggested: 'Elliot — I have one operational problem with a named owner and a measurable outcome. Worth twenty minutes?',
    messages: [
      { id: 'm1', from: 'them', text: 'Kevin said you frame problems well. That is rarer than model access.', at: 'Fri 11:12' },
      { id: 'm2', from: 'me', text: 'I will bring one problem, one owner and one number worth moving.', at: 'Fri 11:30' },
    ],
  },
  {
    id: 't5', memberId: 'p1', unread: false,
    introContext: 'Active relationship · he is testing the Intros model with founders.',
    commitment: 'He offered feedback on positioning before you approach operators.',
    suggested: 'Gary — one question before Friday: what would make you trust the match score enough to forward it?',
    messages: [
      { id: 'm1', from: 'them', text: 'Send me the version you would show a skeptical founder.', at: 'Sun 18:05' },
    ],
  },
]

export interface Learning {
  id: string
  category: 'People' | 'Companies' | 'Needs' | 'Messages' | 'Introductions' | 'Decisions' | 'Interests' | 'Commitments'
  text: string
  source: string
  confidence: number
  scope: PrivacyScope
  when: string
}

export const learnings: Learning[] = [
  { id: 'l1', category: 'People', text: 'Sarah Villalobos is now focused on US expansion.', source: 'Conversation · 2 days ago', confidence: 94, scope: 'shareable', when: '2 days ago' },
  { id: 'l2', category: 'Companies', text: 'Harbor Grid expanded Alison Kaiser’s remit to national partnerships.', source: 'Public profile', confidence: 92, scope: 'public', when: '4 days ago' },
  { id: 'l3', category: 'Decisions', text: 'You prefer warm introductions over cold outreach.', source: 'Your actions across 14 intros', confidence: 97, scope: 'private', when: 'This week' },
  { id: 'l4', category: 'Introductions', text: 'Marcus Adeyemi said he is open to advisory work.', source: 'Message · Halstead Bridge', confidence: 88, scope: 'team', when: '6 days ago' },
  { id: 'l5', category: 'Needs', text: 'Five needs in the network now match people you already know.', source: 'Graph match pass', confidence: 81, scope: 'private', when: 'Today' },
  { id: 'l6', category: 'Commitments', text: 'You owe Scott Kelley one pipeline observation before Friday.', source: 'Conversation commitment', confidence: 99, scope: 'private', when: 'Yesterday' },
  { id: 'l7', category: 'Messages', text: 'This relationship is becoming more relevant to your current need.', source: 'Elliot Nakamura thread', confidence: 84, scope: 'private', when: '3 days ago' },
  { id: 'l8', category: 'Interests', text: 'Priya Raghavan is most engaged when the topic is pricing evidence.', source: 'Four conversations', confidence: 79, scope: 'team', when: 'Last week' },
]

export const introStateLabel: Record<IntroState, string> = {
  recommended: 'Recommended',
  requested: 'Requested',
  waiting: 'Waiting for them',
  accepted: 'Both accepted',
  introduced: 'Introduced',
  conversing: 'Conversation started',
  closed: 'Not now',
}

export const howIntrosWorks = [
  { step: 'Say what you need', copy: 'State the outcome in your own words. No keyword search, no lists.' },
  { step: 'Intros reads the network', copy: 'Needs, offers, timing and trust paths are compared across every member.' },
  { step: 'You see the reasoning', copy: 'Every match shows why this person, why you matter to them, and why now.' },
  { step: 'Both sides opt in', copy: 'Nothing is sent until you and they agree the conversation is worth having.' },
]

export const onboardingQuestions: Array<{ key: string; label: string; placeholder: string; learns: string }> = [
  { key: 'who', label: 'Who are you?', placeholder: 'Founder, operator, investor, advisor…', learns: 'Identity anchored' },
  { key: 'focus', label: 'What are you building or focused on?', placeholder: 'The work that matters this quarter…', learns: 'Current focus captured' },
  { key: 'need', label: 'What do you need right now?', placeholder: 'The outcome you are trying to create…', learns: 'Active need created' },
  { key: 'help', label: 'What can you help others with?', placeholder: 'Where you are genuinely useful…', learns: 'Offers indexed' },
  { key: 'industries', label: 'Which industries do you understand?', placeholder: 'Manufacturing, SaaS, healthcare…', learns: 'Domains mapped' },
  { key: 'where', label: 'Where are you based?', placeholder: 'City, region…', learns: 'Geography noted' },
  { key: 'meet', label: 'Who do you want to meet?', placeholder: 'The people who could change the outcome…', learns: 'Match targets set' },
  { key: 'valuable', label: 'What types of intros are valuable to you?', placeholder: 'Warm, specific, decision-level…', learns: 'Intro preferences saved' },
  { key: 'never', label: 'What should Intros never do on your behalf?', placeholder: 'Your hard boundaries…', learns: 'Boundaries locked' },
]
