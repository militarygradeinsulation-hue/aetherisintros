import type { BusinessDetails } from './business-posts'
import { people as seedPeople } from './data'
import { calculateConnectionScore, determineRadarState } from './lib/engine'
import type { Person, PrivacyScope, ScoreBreakdown } from './types'
import type { GiverBand } from './reciprocity-core'

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
  /** Network-safe executive identity fields persisted on the verified profile. */
  whatIDo?: string
  building?: string
  openTo?: string[]
  schedulingEnabled?: boolean
  /** Giver band, present only when the member chose to show it (0055). */
  giverBand?: GiverBand | null
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
    availability: 'Open to 4 conversations a month', mutuals: ['Mina Park', 'Caleb Wynn'],
    introState: 'conversing', joined: '2024',
  },
  p2: {
    role: 'Investor', industry: 'Private equity', expertise: ['Value creation', 'Portfolio operations', 'B2B growth'],
    focus: 'Standardising growth reporting across eight operating companies.',
    thesis: 'Operators who can show where revenue leaks are worth more than another dashboard.',
    availability: 'Selective · warm paths only', mutuals: ['Adrian Vale'],
    introState: 'waiting', joined: '2025',
  },
  p3: {
    role: 'Executive', industry: 'Manufacturing', expertise: ['Industrial sales', 'CRM adoption', 'Pipeline design'],
    focus: 'Making pipeline visibility survive a doubling sales team.',
    thesis: 'I buy clarity, not software. Show me where the handoff breaks.',
    availability: 'Meets weekly with new operators', mutuals: ['Celeste Arden'],
    introState: 'introduced', joined: '2024',
  },
  p4: {
    role: 'Operator', industry: 'Energy', expertise: ['Channel design', 'Enterprise partnerships'],
    focus: 'Building a national partner motion after a remit expansion.',
    thesis: 'Partnerships work when both sides can name the customer outcome.',
    availability: 'Reconnecting after a role change', mutuals: ['Nolan Pierce'],
    introState: 'recommended', joined: '2023',
  },
  p5: {
    role: 'Founder', industry: 'Fintech', expertise: ['Payments', 'Enterprise sales', 'Capital strategy'],
    focus: 'Preparing enterprise distribution ahead of a raise.',
    thesis: 'Distribution beats product polish. I want operators who have done it once already.',
    availability: 'Quiet quarter · asynchronous first', mutuals: ['Caleb Wynn'],
    introState: 'closed', joined: '2023',
  },
  p6: {
    role: 'Specialist', industry: 'Executive search', expertise: ['AI leadership hiring', 'Referral networks'],
    focus: 'Two systems leadership searches in market now.',
    thesis: 'I trade in trust. One bad referral costs a decade of credibility.',
    availability: 'Always open to specialists', mutuals: ['Rohan Vey'],
    introState: 'requested', joined: '2025',
  },
}

const newMembers: RawMember[] = [
  {
    id: 'p7', name: 'Mara Solis', initials: 'MS', title: 'Chief Operating Officer', company: 'Meridian Field Services',
    location: 'Dallas, TX', role: 'Executive', industry: 'Field services',
    tags: ['Operations', 'Field service', 'Scale'], expertise: ['Multi-site operations', 'Workforce planning', 'M&A integration'],
    needs: ['Operators who scaled service businesses past $50M', 'US expansion advisors'],
    offers: ['Field-service playbooks', 'Integration experience', 'Executive references'],
    focus: 'Taking a $28M service business into four new US regions.',
    thesis: 'Growth is an operating problem long before it is a marketing problem.',
    availability: 'Two conversations a week', mutuals: ['Nolan Pierce', 'Mina Park'],
    lastInteractionDays: 6, relationshipStatus: 'active', introState: 'recommended', joined: '2025',
    score: { strategicFit: 91, mutualValue: 89, timing: 94, trust: 68, relationshipStrength: 60, decisionInfluence: 93, opportunityValue: 88, friction: 16 },
    whyThem: 'She is mid-expansion and the exact profile Intros can help both learn from and support.',
    whyYou: 'You can show her where handoffs break before four new regions multiply the problem.',
    whyNow: 'Regional expansion decisions are being made this quarter.',
    bestPath: ['You', 'Nolan Pierce', 'Mara Solis'],
    nextAction: 'Offer one specific observation about multi-region handoffs, then ask what she is seeing.',
    dontDo: 'Do not send a generic capability overview.', confidence: 90, opportunityLow: 60000, opportunityHigh: 240000,
  },
  {
    id: 'p8', name: 'Darius Cole', initials: 'DC', title: 'Managing Director', company: 'Halstead Bridge Capital',
    location: 'New York, NY', role: 'Investor', industry: 'Finance',
    tags: ['Credit', 'Growth capital', 'Diligence'], expertise: ['Structured finance', 'Diligence', 'Board work'],
    needs: ['Manufacturing operators for diligence calls', 'Advisory-grade domain specialists'],
    offers: ['Capital introductions', 'Board perspective', 'LP relationships'],
    focus: 'Sourcing industrial platforms with real operating upside.',
    thesis: 'Capital is common. Operators who can diagnose a business quickly are not.',
    availability: 'Open to advisory work', mutuals: ['Mina Park'],
    lastInteractionDays: 21, relationshipStatus: 'new', introState: 'accepted', joined: '2025',
    score: { strategicFit: 86, mutualValue: 84, timing: 80, trust: 58, relationshipStrength: 52, decisionInfluence: 94, opportunityValue: 92, friction: 30 },
    whyThem: 'He needs credible operators for diligence and advisory seats across industrial deals.',
    whyYou: 'Your forensic approach gives him faster conviction than a generic consultant.',
    whyNow: 'He said he is open to advisory work over the next two quarters.',
    bestPath: ['You', 'Mina Park', 'Darius Cole'],
    nextAction: 'Send one page on how you diagnose a revenue system in a week.',
    dontDo: 'Do not ask him to introduce you to portfolio companies yet.', confidence: 84, opportunityLow: 40000, opportunityHigh: 300000,
  },
  {
    id: 'p9', name: 'Elara Voss', initials: 'EV', title: 'Co-founder & CTO', company: 'Northwind Health Systems',
    location: 'Boston, MA', role: 'Founder', industry: 'Healthcare',
    tags: ['Health tech', 'AI', 'Clinical data'], expertise: ['Clinical data platforms', 'AI evaluation', 'Regulated engineering'],
    needs: ['Health system executive introductions', 'Enterprise security advisors'],
    offers: ['Clinical AI expertise', 'Regulated deployment experience'],
    focus: 'Moving from pilot hospitals to a signed health system network.',
    thesis: 'In healthcare, trust compounds slower and matters more.',
    availability: 'Fortnightly conversations', mutuals: ['Darius Cole', 'Adrian Vale'],
    lastInteractionDays: 13, relationshipStatus: 'active', introState: 'recommended', joined: '2026',
    score: { strategicFit: 82, mutualValue: 86, timing: 76, trust: 71, relationshipStrength: 63, decisionInfluence: 84, opportunityValue: 79, friction: 22 },
    whyThem: 'She is entering the exact enterprise credibility phase Intros makes easier.',
    whyYou: 'You can map who inside a health system actually decides, and why now.',
    whyNow: 'Two pilots convert or lapse before the next budget cycle.',
    bestPath: ['You', 'Adrian Vale', 'Elara Voss'],
    nextAction: 'Share how you would map decision influence inside one health system.',
    dontDo: 'Do not promise clinical introductions you cannot verify.', confidence: 81, opportunityLow: 30000, opportunityHigh: 180000,
  },
  {
    id: 'p10', name: 'Mateo Quinn', initials: 'MQ', title: 'VP Logistics Strategy', company: 'Portline Freight Group',
    location: 'Miami, FL', role: 'Operator', industry: 'Logistics',
    tags: ['Supply chain', 'Cross-border', 'Network design'], expertise: ['Network design', 'Cross-border trade', 'Cost modelling'],
    needs: ['AI forecasting specialists', 'Nearshoring partners'],
    offers: ['Logistics network access', 'Latin America relationships'],
    focus: 'Rebuilding a nearshoring lane strategy for 2027 volume.',
    thesis: 'Every logistics decision is a relationship decision with a spreadsheet attached.',
    availability: 'Open to intros with context', mutuals: ['Mara Solis'],
    lastInteractionDays: 44, relationshipStatus: 'new', introState: 'recommended', joined: '2025',
    score: { strategicFit: 74, mutualValue: 78, timing: 68, trust: 60, relationshipStrength: 55, decisionInfluence: 80, opportunityValue: 72, friction: 26 },
    whyThem: 'He is actively sourcing forecasting capability and values operator credibility.',
    whyYou: 'Your systems work translates directly into lane-level decision quality.',
    whyNow: 'Lane commitments for next year are being modelled now.',
    bestPath: ['You', 'Mara Solis', 'Mateo Quinn'],
    nextAction: 'Ask which lane decision is currently hardest to defend internally.',
    dontDo: 'Do not lead with technology vocabulary.', confidence: 76,
  },
  {
    id: 'p11', name: 'Anika Rao', initials: 'AR', title: 'Founder & Principal', company: 'Raghavan Advisory',
    location: 'San Francisco, AK', role: 'Advisor', industry: 'SaaS',
    tags: ['Go-to-market', 'Pricing', 'Board advisory'], expertise: ['Pricing strategy', 'GTM diagnostics', 'Board readiness'],
    needs: ['Founders preparing a Series B narrative', 'Warm operator introductions'],
    offers: ['Pricing teardowns', 'Board-ready GTM reviews', 'Investor relationships'],
    focus: 'Advising six SaaS founders through pricing and GTM resets.',
    thesis: 'Most growth problems are unresolved pricing and positioning arguments.',
    availability: 'One new client per quarter', mutuals: ['Elara Voss', 'Adrian Vale'],
    lastInteractionDays: 9, relationshipStatus: 'strong', introState: 'conversing', joined: '2024',
    score: { strategicFit: 84, mutualValue: 90, timing: 82, trust: 86, relationshipStrength: 84, decisionInfluence: 76, opportunityValue: 70, friction: 12 },
    whyThem: 'She sits beside founders at exactly the moment relationship context matters most.',
    whyYou: 'Aetheris gives her clients evidence for who to talk to next, not just what to fix.',
    whyNow: 'Three of her clients are raising in the next two quarters.',
    bestPath: ['You', 'Anika Rao'],
    nextAction: 'Offer to run one client relationship map as a shared experiment.',
    dontDo: 'Do not position this as competing with her advisory work.', confidence: 92, opportunityLow: 20000, opportunityHigh: 140000,
  },
  {
    id: 'p12', name: 'Luc Moreau', initials: 'LM', title: 'President', company: 'Bergeron Construction Group',
    location: 'Denver, CO', role: 'Executive', industry: 'Construction',
    tags: ['Construction', 'Bids', 'Regional growth'], expertise: ['Commercial bidding', 'Project delivery', 'Regional expansion'],
    needs: ['Better bid decision intelligence', 'Owner-side relationships'],
    offers: ['Regional developer relationships', 'Delivery credibility'],
    focus: 'Choosing which commercial bids deserve real effort.',
    thesis: 'We win work through relationships and lose it through bad qualification.',
    availability: 'Prefers introductions from people he knows', mutuals: ['Mateo Quinn'],
    lastInteractionDays: 168, relationshipStatus: 'dormant', introState: 'recommended', joined: '2023',
    score: { strategicFit: 71, mutualValue: 73, timing: 55, trust: 74, relationshipStrength: 72, decisionInfluence: 82, opportunityValue: 66, friction: 24 },
    whyThem: 'His qualification problem is a scoring problem, which is exactly what Intros does.',
    whyYou: 'You can help him decide which relationships justify a bid.',
    whyNow: 'A quiet period makes this the right moment to rebuild the relationship.',
    bestPath: ['You', 'Mateo Quinn', 'Luc Moreau'],
    nextAction: 'Reconnect with a short note about qualification, not software.',
    dontDo: 'Do not reference how long it has been.', confidence: 74,
  },
  {
    id: 'p13', name: 'Freya Bell', initials: 'FB', title: 'Brand Founder', company: 'Fenwick & Lind',
    location: 'Austin, TX', role: 'Founder', industry: 'Consumer brands',
    tags: ['Consumer', 'Retail', 'DTC'], expertise: ['Brand building', 'Retail distribution', 'Creative direction'],
    needs: ['Retail buyers', 'Operators who scaled DTC into wholesale'],
    offers: ['Brand strategy', 'Creative talent network'],
    focus: 'Moving a considered consumer brand into national wholesale.',
    thesis: 'Distribution without brand discipline is just expensive noise.',
    availability: 'Open to peer founders', mutuals: ['Anika Rao'],
    lastInteractionDays: 27, relationshipStatus: 'new', introState: 'requested', joined: '2026',
    score: { strategicFit: 66, mutualValue: 74, timing: 70, trust: 58, relationshipStrength: 52, decisionInfluence: 72, opportunityValue: 60, friction: 22 },
    whyThem: 'She is building the kind of relationship-led distribution Intros maps well.',
    whyYou: 'You can show her which buyer relationships already exist two steps away.',
    whyNow: 'Wholesale conversations start before the next buying season.',
    bestPath: ['You', 'Anika Rao', 'Freya Bell'],
    nextAction: 'Share two buyer paths already visible in the graph.',
    dontDo: 'Do not treat her brand as a commodity DTC story.', confidence: 72,
  },
  {
    id: 'p14', name: 'Kenji Vale', initials: 'KV', title: 'Head of Applied AI', company: 'Cassian Labs',
    location: 'Seattle, WA', role: 'Specialist', industry: 'AI',
    tags: ['Applied AI', 'Evaluation', 'Systems'], expertise: ['Model evaluation', 'Applied AI systems', 'Data governance'],
    needs: ['Enterprise design partners', 'Operators who can define the real problem'],
    offers: ['Applied AI review', 'Evaluation frameworks', 'Technical credibility'],
    focus: 'Finding design partners with genuine operational problems.',
    thesis: 'Most AI projects fail at problem definition, not model quality.',
    availability: 'Two design partner slots', mutuals: ['Caleb Wynn', 'Elara Voss'],
    lastInteractionDays: 3, relationshipStatus: 'active', introState: 'accepted', joined: '2025',
    score: { strategicFit: 88, mutualValue: 87, timing: 90, trust: 74, relationshipStrength: 68, decisionInfluence: 79, opportunityValue: 76, friction: 14 },
    whyThem: 'He needs operators who can frame problems precisely, which is your strength.',
    whyYou: 'You can bring him real operational problems with named decision-makers.',
    whyNow: 'Two design partner slots close this month.',
    bestPath: ['You', 'Caleb Wynn', 'Kenji Vale'],
    nextAction: 'Propose one concrete operational problem worth evaluating together.',
    dontDo: 'Do not send an abstract partnership proposal.', confidence: 88, opportunityLow: 25000, opportunityHigh: 150000,
  },
]

/** A second cohort so the network reads as a populated, multi-industry professional community. */
const cohort: RawMember[] = [
  {
    id: 'p15', name: 'Amara Nwosu', initials: 'AN', title: 'Chief People Officer', company: 'Lumen Retail Group',
    location: 'Atlanta, GA', role: 'Executive', industry: 'Retail',
    tags: ['People', 'Retail', 'Change'], expertise: ['Workforce strategy', 'Frontline retention', 'Leadership development'],
    needs: ['Operators who cut frontline turnover below 40%', 'Compensation design advisors'],
    offers: ['Retail executive network', 'Change management playbooks'],
    focus: 'Rebuilding store leadership after two years of turnover.',
    thesis: 'Retail strategy fails on the floor, not in the deck.',
    availability: 'Open to two conversations a month', mutuals: ['Freya Bell'],
    lastInteractionDays: 18, relationshipStatus: 'new', introState: 'recommended', joined: '2025',
    score: { strategicFit: 72, mutualValue: 80, timing: 74, trust: 58, relationshipStrength: 52, decisionInfluence: 86, opportunityValue: 68, friction: 22 },
    whyThem: 'She owns the frontline performance problem retail operators keep describing to the network.',
    whyYou: 'You can show where the handoff between district leaders and stores loses margin.',
    whyNow: 'Store leadership hiring plans are set in the next six weeks.',
    bestPath: ['You', 'Freya Bell', 'Amara Nwosu'],
    nextAction: 'Ask which store metric leadership argues about most.',
    dontDo: 'Do not open with an HR technology pitch.', confidence: 78,
  },
  {
    id: 'p16', name: 'Elias North', initials: 'EN', title: 'General Counsel', company: 'Kestrel Industrial',
    location: 'Minneapolis, MN', role: 'Executive', industry: 'Legal',
    tags: ['Legal', 'M&A', 'Risk'], expertise: ['Commercial contracts', 'M&A integration', 'Data governance'],
    needs: ['AI governance specialists', 'Post-close integration operators'],
    offers: ['Deal structuring perspective', 'Risk review', 'Industrial board contacts'],
    focus: 'Standing up AI governance before the next two acquisitions close.',
    thesis: 'Good governance is a speed feature, not a brake.',
    availability: 'Prefers introductions with a clear agenda', mutuals: ['Darius Cole', 'Nolan Pierce'],
    lastInteractionDays: 39, relationshipStatus: 'new', introState: 'recommended', joined: '2025',
    score: { strategicFit: 70, mutualValue: 76, timing: 72, trust: 64, relationshipStrength: 54, decisionInfluence: 88, opportunityValue: 64, friction: 26 },
    whyThem: 'He is writing the rules two acquisitions will operate under.',
    whyYou: 'You can frame governance as an operating decision, not a legal document.',
    whyNow: 'Both acquisitions close within the quarter.',
    bestPath: ['You', 'Darius Cole', 'Elias North'],
    nextAction: 'Offer one page on how you separate private context from shareable context.',
    dontDo: 'Do not treat governance as an obstacle.', confidence: 75,
  },
  {
    id: 'p17', name: 'Simone Adebayo', initials: 'SA', title: 'Head of Clinical Operations', company: 'Ridgeline Health Partners',
    location: 'Nashville, TN', role: 'Operator', industry: 'Healthcare',
    tags: ['Clinical ops', 'Access', 'Throughput'], expertise: ['Care throughput', 'Staffing models', 'Vendor evaluation'],
    needs: ['Operators who fixed patient access without more staff', 'Evidence-first vendors'],
    offers: ['Health system decision context', 'Clinical sponsor perspective'],
    focus: 'Cutting new-patient wait time across eleven clinics.',
    thesis: 'Show me the decision it changed, not the dashboard it added.',
    availability: 'One conversation a week', mutuals: ['Elara Voss'],
    lastInteractionDays: 8, relationshipStatus: 'active', introState: 'recommended', joined: '2026',
    score: { strategicFit: 80, mutualValue: 84, timing: 88, trust: 66, relationshipStrength: 58, decisionInfluence: 85, opportunityValue: 74, friction: 18 },
    whyThem: 'She is the clinical sponsor health-tech founders in the network keep looking for.',
    whyYou: 'You can bring her operators who solved access without headcount.',
    whyNow: 'Access targets are being set for next year now.',
    bestPath: ['You', 'Elara Voss', 'Simone Adebayo'],
    nextAction: 'Ask which clinic has the widest gap between schedule and reality.',
    dontDo: 'Do not send a product overview before understanding the constraint.', confidence: 83,
  },
  {
    id: 'p18', name: 'Theo Maren', initials: 'TM', title: 'Founder & CEO', company: 'Solano Grid Works',
    location: 'Phoenix, AZ', role: 'Founder', industry: 'Energy',
    tags: ['Energy', 'Infrastructure', 'Project finance'], expertise: ['Grid infrastructure', 'Project finance', 'Utility sales'],
    needs: ['Utility executive introductions', 'Infrastructure capital partners'],
    offers: ['Energy project experience', 'Utility procurement insight'],
    focus: 'Winning two utility framework agreements before winter planning.',
    thesis: 'Infrastructure is sold on credibility and delivered on discipline.',
    availability: 'Open to warm intros only', mutuals: ['Celeste Arden'],
    lastInteractionDays: 25, relationshipStatus: 'new', introState: 'requested', joined: '2025',
    score: { strategicFit: 77, mutualValue: 79, timing: 81, trust: 60, relationshipStrength: 55, decisionInfluence: 83, opportunityValue: 86, friction: 28 },
    whyThem: 'His growth depends entirely on trusted access to utility decision-makers.',
    whyYou: 'You can map who inside a utility actually signs, and when.',
    whyNow: 'Utility planning cycles close in eleven weeks.',
    bestPath: ['You', 'Celeste Arden', 'Theo Maren'],
    nextAction: 'Share the two utility paths already visible in your graph.',
    dontDo: 'Do not promise procurement access you cannot verify.', confidence: 80,
  },
  {
    id: 'p19', name: 'Clara Fenwick', initials: 'CF', title: 'Partner', company: 'Beckett & Rowe',
    location: 'Chicago, IL', role: 'Advisor', industry: 'Professional services',
    tags: ['Advisory', 'Turnaround', 'Finance'], expertise: ['Turnaround finance', 'Cash management', 'Lender relations'],
    needs: ['Operating partners for two turnarounds', 'Interim CFO candidates'],
    offers: ['Lender relationships', 'Turnaround diagnostics', 'Board references'],
    focus: 'Stabilising two mid-market businesses before refinancing.',
    thesis: 'Cash tells the truth long before the management report does.',
    availability: 'Selective · two engagements at a time', mutuals: ['Mina Park', 'Darius Cole'],
    lastInteractionDays: 14, relationshipStatus: 'active', introState: 'accepted', joined: '2024',
    score: { strategicFit: 83, mutualValue: 85, timing: 79, trust: 80, relationshipStrength: 74, decisionInfluence: 84, opportunityValue: 78, friction: 16 },
    whyThem: 'Her engagements need exactly the diagnostic view you produce.',
    whyYou: 'You give her clients a relationship path to the customers who decide the recovery.',
    whyNow: 'Both refinancings are being negotiated this quarter.',
    bestPath: ['You', 'Mina Park', 'Clara Fenwick'],
    nextAction: 'Offer one diagnostic on the weaker of the two businesses.',
    dontDo: 'Do not position this as competing with her advisory mandate.', confidence: 86,
  },
  {
    id: 'p20', name: 'Idris Hale', initials: 'IH', title: 'VP Engineering', company: 'Braxton Software Group',
    location: 'Toronto, ON', role: 'Executive', industry: 'SaaS',
    tags: ['Engineering', 'Platform', 'Reliability'], expertise: ['Platform engineering', 'Reliability', 'Technical due diligence'],
    needs: ['Design partners for a reliability practice', 'CTO peers post-acquisition'],
    offers: ['Technical diligence', 'Engineering leadership coaching'],
    focus: 'Merging three engineering organisations into one platform team.',
    thesis: 'Reliability is a commercial promise, not an engineering hobby.',
    availability: 'Fortnightly conversations', mutuals: ['Kenji Vale', 'Anika Rao'],
    lastInteractionDays: 11, relationshipStatus: 'active', introState: 'conversing', joined: '2025',
    score: { strategicFit: 76, mutualValue: 81, timing: 77, trust: 72, relationshipStrength: 66, decisionInfluence: 78, opportunityValue: 66, friction: 18 },
    whyThem: 'He is the technical counterweight founders and investors both need in the room.',
    whyYou: 'Your systems framing helps him argue reliability in commercial terms.',
    whyNow: 'The platform merge decision lands this month.',
    bestPath: ['You', 'Kenji Vale', 'Idris Hale'],
    nextAction: 'Compare notes on how reliability shows up in renewal conversations.',
    dontDo: 'Do not reduce the merge to a tooling question.', confidence: 82,
  },
  {
    id: 'p21', name: 'Elise Laurent', initials: 'EL', title: 'Managing Partner', company: 'Verdant Growth Partners',
    location: 'Montréal, QC', role: 'Investor', industry: 'Venture capital',
    tags: ['Venture', 'B2B', 'Seed'], expertise: ['Seed investing', 'Founder coaching', 'Market sizing'],
    needs: ['Operator advisors for portfolio founders', 'Enterprise buyers for reference calls'],
    offers: ['Capital', 'Founder introductions', 'Board seats'],
    focus: 'Backing four B2B founders through their first enterprise motion.',
    thesis: 'The first ten enterprise customers come from relationships, not campaigns.',
    availability: 'Open to operators with real scars', mutuals: ['Anika Rao', 'Elara Voss'],
    lastInteractionDays: 30, relationshipStatus: 'new', introState: 'recommended', joined: '2026',
    score: { strategicFit: 85, mutualValue: 87, timing: 76, trust: 62, relationshipStrength: 55, decisionInfluence: 90, opportunityValue: 88, friction: 24 },
    whyThem: 'Her portfolio needs the exact operator advice you already give.',
    whyYou: 'You can turn her founders’ networks into a credible pipeline.',
    whyNow: 'Three portfolio companies start enterprise motions this quarter.',
    bestPath: ['You', 'Anika Rao', 'Elise Laurent'],
    nextAction: 'Offer to map one portfolio founder’s buyer network as a trial.',
    dontDo: 'Do not pitch the fund; help one founder first.', confidence: 84,
  },
  {
    id: 'p22', name: 'Micah Kone', initials: 'MK', title: 'Director of Procurement', company: 'Atlas Provisions',
    location: 'Columbus, OH', role: 'Operator', industry: 'Food & beverage',
    tags: ['Procurement', 'Supply', 'Cost'], expertise: ['Supplier negotiation', 'Category strategy', 'Cost modelling'],
    needs: ['Suppliers who can hold price through volatility', 'Demand forecasting help'],
    offers: ['Buyer-side perspective', 'Category access', 'Honest vendor feedback'],
    focus: 'Rebuilding supplier terms across four categories.',
    thesis: 'Vendors who explain their cost structure win longer contracts.',
    availability: 'Open to specific, prepared conversations', mutuals: ['Mateo Quinn'],
    lastInteractionDays: 52, relationshipStatus: 'new', introState: 'recommended', joined: '2025',
    score: { strategicFit: 66, mutualValue: 72, timing: 64, trust: 56, relationshipStrength: 50, decisionInfluence: 80, opportunityValue: 62, friction: 30 },
    whyThem: 'He is the buyer many members in the network are trying to reach honestly.',
    whyYou: 'You can help suppliers arrive with the evidence he actually wants.',
    whyNow: 'Category negotiations reopen next quarter.',
    bestPath: ['You', 'Mateo Quinn', 'Micah Kone'],
    nextAction: 'Ask which category has the least reliable supplier data.',
    dontDo: 'Do not arrive without numbers.', confidence: 71,
  },
  {
    id: 'p23', name: 'Astrid Dahl', initials: 'AD', title: 'Chief Marketing Officer', company: 'Halden Instruments',
    location: 'Boston, MA', role: 'Executive', industry: 'Industrial technology',
    tags: ['Marketing', 'Industrial', 'Demand'], expertise: ['Technical positioning', 'Channel marketing', 'Pricing communication'],
    needs: ['Operators who fixed sales and marketing handoffs', 'Industrial demand specialists'],
    offers: ['Positioning review', 'Industrial channel relationships'],
    focus: 'Rebuilding demand generation for a technical buyer.',
    thesis: 'Industrial buyers do not respond to volume. They respond to precision.',
    availability: 'Two conversations a month', mutuals: ['Nolan Pierce', 'Anika Rao'],
    lastInteractionDays: 16, relationshipStatus: 'active', introState: 'recommended', joined: '2025',
    score: { strategicFit: 81, mutualValue: 83, timing: 80, trust: 68, relationshipStrength: 62, decisionInfluence: 76, opportunityValue: 70, friction: 18 },
    whyThem: 'Her handoff problem is the one your forensic work explains best.',
    whyYou: 'You can prove where marketing-created demand disappears.',
    whyNow: 'Next year’s demand plan is being written now.',
    bestPath: ['You', 'Nolan Pierce', 'Astrid Dahl'],
    nextAction: 'Offer one observation about where qualified demand goes quiet.',
    dontDo: 'Do not critique her brand work.', confidence: 84,
  },
  {
    id: 'p24', name: 'Gabriel Soto', initials: 'GS', title: 'Founder', company: 'Terrace Property Group',
    location: 'San Mateo, AK', role: 'Founder', industry: 'Real estate',
    tags: ['Real estate', 'Development', 'Capital'], expertise: ['Mixed-use development', 'Capital raising', 'Municipal relations'],
    needs: ['Institutional capital relationships', 'Operators for two mixed-use sites'],
    offers: ['Development experience', 'Municipal relationships', 'Deal access'],
    focus: 'Financing two mixed-use sites before entitlements expire.',
    thesis: 'In development, timing is the whole business.',
    availability: 'Open to capital conversations', mutuals: ['Luc Moreau', 'Clara Fenwick'],
    lastInteractionDays: 63, relationshipStatus: 'dormant', introState: 'recommended', joined: '2024',
    score: { strategicFit: 68, mutualValue: 74, timing: 70, trust: 66, relationshipStrength: 60, decisionInfluence: 82, opportunityValue: 84, friction: 26 },
    whyThem: 'His capital need has a hard deadline, which makes timing unusually clear.',
    whyYou: 'You can identify which capital relationships are already two steps away.',
    whyNow: 'Entitlements expire within seven months.',
    bestPath: ['You', 'Clara Fenwick', 'Gabriel Soto'],
    nextAction: 'Ask which site has the tightest entitlement clock.',
    dontDo: 'Do not offer capital introductions you have not confirmed.', confidence: 77,
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
  ...cohort.map(build),
]

export const me = {
  name: 'Jordan Ellery', initials: 'JT', title: 'Founder · Relationship systems strategist',
  company: 'Aetheris', location: 'Charlotte, NC',
  thesis: 'I build systems that turn relationship context into better business decisions.',
  focus: 'Placing Ask Intros with founders, operating partners and trusted connectors.',
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
  {
    id: 'a7', memberId: 'p17', ask: 'Looking for an operator who cut new-patient wait times without adding staff.',
    detail: 'Eleven clinics, the same schedule template, wildly different results. I want to hear how someone else fixed the variation.',
    whyNow: 'Access targets for next year are set in five weeks.',
    offer: 'Clinical sponsor perspective and honest vendor feedback.',
    industry: 'Healthcare', location: 'Nashville, TN', urgency: 'high', posted: '1 day ago', responses: 2, visibility: 'network',
  },
  {
    id: 'a8', memberId: 'p21', ask: 'Looking for operator advisors for four B2B founders starting their enterprise motion.',
    detail: 'Not a mentor list. I want people who have personally closed the first ten enterprise contracts and remember how ugly it was.',
    whyNow: 'Three portfolio companies begin enterprise selling this quarter.',
    offer: 'Advisory equity, founder introductions and capital relationships.',
    industry: 'Venture capital', location: 'Montréal, QC', urgency: 'medium', posted: '4 days ago', responses: 9, visibility: 'network',
  },
  {
    id: 'a9', memberId: 'p19', ask: 'Looking for two interim CFO candidates for mid-market turnarounds.',
    detail: 'Cash-focused, lender-fluent, comfortable delivering unpopular news in week one.',
    whyNow: 'Both refinancings are negotiated this quarter.',
    offer: 'Lender relationships, board references and repeat engagements.',
    industry: 'Professional services', location: 'Chicago, IL', urgency: 'high', posted: '2 days ago', responses: 5, visibility: 'network',
  },
  {
    id: 'a10', memberId: 'p18', ask: 'Looking for a warm path to utility procurement leadership in the Southwest.',
    detail: 'We have delivery credibility and references. What we do not have is the right first conversation.',
    whyNow: 'Utility planning cycles close in eleven weeks.',
    offer: 'Energy project experience and procurement insight.',
    industry: 'Energy', location: 'Phoenix, AZ', urgency: 'high', posted: '3 days ago', responses: 3, visibility: 'network',
  },
  {
    id: 'a11', memberId: 'p23', ask: 'Looking for someone who fixed the sales and marketing handoff in an industrial business.',
    detail: 'We create qualified demand and lose it somewhere between the inquiry and the quote. I want to know where to look.',
    whyNow: 'Next year’s demand plan is being written now.',
    offer: 'Positioning review and industrial channel relationships.',
    industry: 'Industrial technology', location: 'Boston, MA', urgency: 'medium', posted: '6 days ago', responses: 4, visibility: 'network',
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
  { id: 's1', memberId: 'p4', kind: 'Role change', text: 'Celeste Arden now leads national partnerships at Harbor Grid.', when: '4 days ago' },
  { id: 's2', memberId: 'p7', kind: 'Expansion', text: 'Meridian Field Services approved expansion into four US regions.', when: '1 week ago' },
  { id: 's3', memberId: 'p6', kind: 'Intro requested', text: 'Caleb Wynn requested an introduction to a systems leader in your network.', when: '2 days ago' },
  { id: 's4', memberId: 'p3', kind: 'Waiting on you', text: 'Nolan Pierce is waiting on the pipeline observation you promised.', when: 'Yesterday' },
  { id: 's5', memberId: 'p14', kind: 'New need', text: 'Kenji Vale posted a need for two enterprise design partners.', when: '3 days ago' },
  { id: 's6', memberId: 'p11', kind: 'New project', text: 'Anika Rao started three new pricing engagements this month.', when: '5 days ago' },
  { id: 's7', memberId: 'p21', kind: 'New need', text: 'Elise Laurent is looking for operator advisors for four portfolio founders.', when: '4 days ago' },
  { id: 's8', memberId: 'p20', kind: 'Role change', text: 'Idris Hale now leads the merged platform organisation at Braxton.', when: '1 week ago' },
  { id: 's9', memberId: 'p17', kind: 'Expansion', text: 'Ridgeline Health Partners added three clinics to the access programme.', when: '2 days ago' },
  { id: 's10', memberId: 'p19', kind: 'New need', text: 'Clara Fenwick needs two interim HBOs for mid-market turnarounds.', when: '2 days ago' },
  { id: 's11', memberId: 'p24', kind: 'New project', text: 'Gabriel Soto started financing two mixed-use developments in San Mateo.', when: '1 week ago' },
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
    introContext: 'Introduced by Adrian Vale · shared interest in pipeline accountability.',
    commitment: 'You said you would send one observation before Friday.',
    suggested: 'Nolan — the pattern I keep seeing is inbound leads going quiet at the 48-hour mark. Want me to look at that one path with your data?',
    messages: [
      { id: 'm1', from: 'them', text: 'The timing is useful. I’m looking closely at this problem now.', at: 'Mon 10:42' },
      { id: 'm2', from: 'me', text: 'That is exactly why I thought a conversation could be useful. No pitch — just compare notes on the current constraints.', at: 'Mon 10:49' },
      { id: 'm3', from: 'them', text: 'Fair. Our real issue is that nobody trusts the stage data after the demo call.', at: 'Tue 08:15' },
    ],
  },
  {
    id: 't2', memberId: 'p7', unread: true,
    introContext: 'Warm path through Nolan Pierce · she is hiring for four new regions.',
    commitment: 'She asked for one example of a multi-region handoff failure.',
    suggested: 'Mara — the break usually appears between regional dispatch and central billing. Happy to walk through what to watch for before the hiring starts.',
    messages: [
      { id: 'm1', from: 'them', text: 'Nolan mentioned you look at where revenue quietly leaks. We are about to quadruple our regions.', at: 'Wed 16:20' },
    ],
  },
  {
    id: 't3', memberId: 'p11', unread: false,
    introContext: 'Long-standing relationship · overlapping advisory clients.',
    commitment: 'You agreed to map one of her client networks as a shared experiment.',
    suggested: 'Anika — pick the client with the messiest buying committee and I will map who actually decides.',
    messages: [
      { id: 'm1', from: 'me', text: 'Two of your founders would get value from a relationship map before they raise.', at: 'Thu 09:02' },
      { id: 'm2', from: 'them', text: 'Agreed. Let’s try it with one client and see whether the reasoning holds up.', at: 'Thu 09:40' },
      { id: 'm3', from: 'me', text: 'Send me the account and I will show you the decision path, not just the org chart.', at: 'Thu 09:44' },
    ],
  },
  {
    id: 't4', memberId: 'p14', unread: false,
    introContext: 'Introduced by Caleb Wynn · both looking for real operational problems.',
    commitment: 'He is holding a design partner slot until month end.',
    suggested: 'Kenji — I have one operational problem with a named owner and a measurable outcome. Worth twenty minutes?',
    messages: [
      { id: 'm1', from: 'them', text: 'Caleb said you frame problems well. That is rarer than model access.', at: 'Fri 11:12' },
      { id: 'm2', from: 'me', text: 'I will bring one problem, one owner and one number worth moving.', at: 'Fri 11:30' },
    ],
  },
  {
    id: 't5', memberId: 'p1', unread: false,
    introContext: 'Active relationship · he is testing the Intros model with founders.',
    commitment: 'He offered feedback on positioning before you approach operators.',
    suggested: 'Adrian — one question before Friday: what would make you trust the match score enough to forward it?',
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
  { id: 'l1', category: 'People', text: 'Mara Solis is now focused on US expansion.', source: 'Conversation · 2 days ago', confidence: 94, scope: 'shareable', when: '2 days ago' },
  { id: 'l2', category: 'Companies', text: 'Harbor Grid expanded Celeste Arden’s remit to national partnerships.', source: 'Public profile', confidence: 92, scope: 'public', when: '4 days ago' },
  { id: 'l3', category: 'Decisions', text: 'You prefer warm introductions over cold outreach.', source: 'Your actions across 14 intros', confidence: 97, scope: 'private', when: 'This week' },
  { id: 'l4', category: 'Introductions', text: 'Darius Cole said he is open to advisory work.', source: 'Message · Halstead Bridge', confidence: 88, scope: 'team', when: '6 days ago' },
  { id: 'l5', category: 'Needs', text: 'Five needs in the network now match people you already know.', source: 'Graph match pass', confidence: 81, scope: 'private', when: 'Today' },
  { id: 'l6', category: 'Commitments', text: 'You owe Nolan Pierce one pipeline observation before Friday.', source: 'Conversation commitment', confidence: 99, scope: 'private', when: 'Yesterday' },
  { id: 'l7', category: 'Messages', text: 'This relationship is becoming more relevant to your current need.', source: 'Kenji Vale thread', confidence: 84, scope: 'private', when: '3 days ago' },
  { id: 'l8', category: 'Interests', text: 'Anika Rao is most engaged when the topic is pricing evidence.', source: 'Four conversations', confidence: 79, scope: 'team', when: 'Last week' },
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

/* ------------------------------------------------- professional feed content */

export interface JournalAttachment {
  path: string
  kind: 'image' | 'video' | 'document'
  name: string
  mime: string
  size: number
}

export interface Post {
  id: string
  memberId: string
  kind: 'Insight' | 'Milestone' | 'Hiring' | 'Raising capital' | 'Partnership' | 'Event takeaway' | 'Strategic ask' | 'Need' | 'Offer' | 'Proof of work'
  text: string
  detail: string
  when: string
  responses: number
  media?: JournalAttachment[] | undefined
  visibility?: 'network' | 'private' | undefined
  /** Structured fields of a Need, Offer or Proof of work post. */
  business?: BusinessDetails | undefined
}

export const posts: Post[] = [
  {
    id: 'f1', memberId: 'p3', kind: 'Insight',
    text: 'Most plants do not have a data problem. They have a handoff problem.',
    detail: 'We replaced two dashboards with one daily standing question: what changed on the floor since yesterday? Scrap fell 11% in six weeks without a single new system.',
    when: '2h ago', responses: 14,
  },
  {
    id: 'f2', memberId: 'p8', kind: 'Raising capital',
    text: 'Opening a Series B in October and doing it differently this time.',
    detail: 'Before the deck, I want three operators who have taken a services business past $50M to tell me where my model breaks. Strategic capital only — I would rather have one investor who knows the sector than five who like the chart.',
    when: '5h ago', responses: 22,
  },
  {
    id: 'f3', memberId: 'p7', kind: 'Hiring',
    text: 'Searching for a VP Revenue Operations who has lived through an integration.',
    detail: 'Two acquisitions, three CRMs, one confused pipeline. I need someone who has cleaned this up before and can hold a room of skeptical regional managers.',
    when: 'Yesterday', responses: 9,
  },
  {
    id: 'f4', memberId: 'p10', kind: 'Partnership',
    text: 'Looking for a logistics partner for a Midwest distribution pilot.',
    detail: 'We have committed volume and a customer willing to co-sign the pilot. What we do not have is a partner who can hold service levels through Q4 peak.',
    when: 'Yesterday', responses: 6,
  },
  {
    id: 'f5', memberId: 'p9', kind: 'Event takeaway',
    text: 'The most useful sentence at the healthcare operators dinner had nothing to do with AI.',
    detail: '“We stopped measuring adoption and started measuring the decision it changed.” Every vendor in the room went quiet. That is the bar now.',
    when: '2 days ago', responses: 18,
  },
  {
    id: 'f6', memberId: 'p5', kind: 'Milestone',
    text: 'Crossed $40M PRR with the same account team we had at $12M.',
    detail: 'Not a growth-hack story. We removed four steps from the enterprise handoff and let the people who close also stay for onboarding.',
    when: '3 days ago', responses: 27,
  },
  {
    id: 'f7', memberId: 'p12', kind: 'Strategic ask',
    text: 'Who has taken a regional construction brand into two new states without diluting the culture?',
    detail: 'Happy to trade everything I have learned about field labor retention for an honest hour on multi-state expansion.',
    when: '4 days ago', responses: 11,
  },
  {
    id: 'f8', memberId: 'p19', kind: 'Insight',
    text: 'Every turnaround I have run started with a management report nobody believed.',
    detail: 'Before the cost work, before the lender conversation, we rebuild one number the whole leadership team agrees on. It usually takes ten days and changes every meeting after it.',
    when: '6h ago', responses: 16,
  },
  {
    id: 'f9', memberId: 'p21', kind: 'Strategic ask',
    text: 'Who has personally closed their company’s first ten enterprise contracts?',
    detail: 'I have four founders about to learn this the expensive way. I would rather they learn it from someone who still remembers the losses.',
    when: '9h ago', responses: 24,
  },
  {
    id: 'f10', memberId: 'p17', kind: 'Insight',
    text: 'Eleven clinics, one schedule template, a four-week spread in patient wait times.',
    detail: 'The difference was not staffing. It was who reviewed the next-day schedule and whether anyone was allowed to change it. Process beat headcount again.',
    when: 'Yesterday', responses: 13,
  },
  {
    id: 'f11', memberId: 'p20', kind: 'Milestone',
    text: 'Three engineering organisations became one platform team this week.',
    detail: 'We kept every reliability commitment during the merge by publishing one shared incident review. Trust survived because the numbers were public internally.',
    when: '2 days ago', responses: 19,
  },
  {
    id: 'f12', memberId: 'p16', kind: 'Insight',
    text: 'AI governance is going to be an operating advantage, not a compliance chore.',
    detail: 'The companies deciding now what context can be shared, with whom, and on what evidence will move faster in eighteen months than the ones still arguing about tools.',
    when: '3 days ago', responses: 21,
  },
  {
    id: 'f13', memberId: 'p15', kind: 'Hiring',
    text: 'Hiring three district leaders who have rebuilt a store team after heavy turnover.',
    detail: 'I am less interested in retail pedigree than in someone who can walk into a demoralised store and be believed by week two.',
    when: '4 days ago', responses: 8,
  },
]

export const trendingSectors: Array<{ sector: string; note: string; move: string }> = [
  { sector: 'Industrial AI', note: '9 members added this focus', move: '+31%' },
  { sector: 'Private equity operations', note: '6 active operating-partner asks', move: '+18%' },
  { sector: 'Field services roll-ups', note: '4 needs matched this week', move: '+12%' },
  { sector: 'Healthcare logistics', note: '3 new members, 2 warm paths', move: '+9%' },
  { sector: 'Enterprise fintech', note: 'Hiring demand cooling slightly', move: '−4%' },
]

export const events: Array<{ id: string; name: string; when: string; where: string; who: string }> = [
  { id: 'e1', name: 'Operators & Owners Dinner', when: 'Sep 24 · 6:30pm', where: 'Charlotte, NC', who: '18 members attending · 4 in your graph' },
  { id: 'e2', name: 'Midwest Manufacturing Forum', when: 'Oct 2 · all day', where: 'Indianapolis, IN', who: '31 members · Adrian Vale speaking' },
  { id: 'e3', name: 'PE Value Creation Roundtable', when: 'Oct 15 · private', where: 'Chicago, IL', who: 'Invitation only · 2 warm paths available' },
]

export const circles: Array<{ id: string; name: string; members: string; why: string }> = [
  { id: 'c1', name: 'Industrial Operators', members: '212 members', why: 'Your last three needs were manufacturing-shaped.' },
  { id: 'c2', name: 'PE Operating Partners', members: '96 members', why: 'Two members already share a trust path with you.' },
  { id: 'c3', name: 'Founders Raising in 2026', members: '148 members', why: 'Matches the capital strategy conversations in your memory.' },
]

export const howItWorks5 = [
  { step: 'Capture context', copy: 'Your focus, needs, offers and conversations become structured relationship context.' },
  { step: 'Map relationships', copy: 'People, companies and trust paths are connected into one living graph.' },
  { step: 'Identify shared goals', copy: 'Intros looks for genuine overlap between what you need and what others can move.' },
  { step: 'Recommend warm introductions', copy: 'Only matches with mutual value, credible timing and a real path are surfaced.' },
  { step: 'Track outcomes', copy: 'What happened next is remembered, so the next recommendation is sharper.' },
]
