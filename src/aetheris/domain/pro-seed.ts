/**
 * Seeded professional-layer demo content. Realistic, fictional, and specific.
 * Every record is shaped exactly like the Postgres rows in ./schema.sql.
 */
import type {
  AcquisitionIntent, AetherisStandardAcceptance, BoardAdvisoryIntent, CapabilityProblem,
  CapitalProfile, ContextualReputation, DealRoom, EventPresence, ExpertiseOffer,
  HumanConciergeReview, ImportBatch, IndustryIntelligenceItem, IndustryRoom, IntroducerRecord,
  KnowledgeAsset, MarketplaceListing, PassportCredential, PeerCouncil, PitchPermissionRequest,
  ProfessionalAvailability, ProfessionalBoundaryRule, ProfessionalInboxDecision,
  ProfessionalOpportunity, ProfessionalPassportProfile, ProfessionalReferral, ProofOfWorkEdge,
  ProofOfWorkNode, Provenanced, SuggestedTeam, TransactionRecord, TravelPlan,
} from './pro-models'
import type { ID } from './models'

const iso = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
const prov = (sourceType: 'explicit' | 'derived' | 'inferred', confidence: number, scope: 'private' | 'shareable' | 'public' | 'team' | 'organization' = 'shareable') =>
  ({ sourceType, confidence, evidenceIds: [] as ID[], scope }) as Provenanced

/* ------------------------------------------------------------- passports */

export const seedPassportProfiles: ProfessionalPassportProfile[] = [
  {
    id: 'pp-me', memberId: 'me', identityState: 'verified',
    identityNote: 'Identity confirmed by work email domain and two verified references.',
    headline: 'Builds relationship systems for operators who sell through trust, not volume.',
    credibilitySummary: 'Six years building revenue and relationship systems inside industrial services and PE-backed operators. Three systems in active placement, four recorded outcomes.',
    functionalExpertise: ['Revenue systems', 'Relationship strategy', 'Operator onboarding', 'Pricing discipline'],
    industries: ['Industrial services', 'Private equity', 'Professional services'],
    contactPreferences: ['Warm introductions only', 'Partnership conversations', 'No sales outreach'],
    fieldScopes: { credentials: 'public', investments: 'private', references: 'shareable', outcomes: 'shareable', priorRoles: 'public' },
    outcomesCreated: 6, introductionsCompleted: 14, referencesVerified: 2, updatedAt: iso(-2),
  },
  {
    id: 'pp-p3', memberId: 'p3', identityState: 'verified',
    identityNote: 'Company registration and executive listing confirmed.',
    headline: 'Took a family-owned metal fabricator from $18M to $63M without outside capital.',
    credibilitySummary: 'Twenty-two years in metal fabrication. Rebuilt quoting, scheduling and shop-floor reporting through two downturns. Evidence-backed on scaling a family manufacturer.',
    functionalExpertise: ['Manufacturing operations', 'Quoting and estimating', 'Plant scheduling', 'Succession planning'],
    industries: ['Manufacturing', 'Industrial services'],
    contactPreferences: ['Warm introductions only', 'Advisory and board inquiries', 'No sales outreach'],
    fieldScopes: { credentials: 'public', investments: 'private', references: 'shareable', outcomes: 'public', priorRoles: 'public' },
    outcomesCreated: 9, introductionsCompleted: 21, referencesVerified: 4, updatedAt: iso(-9),
  },
  {
    id: 'pp-p2', memberId: 'p2', identityState: 'verified',
    identityNote: 'Fund registration and operating-partner listing confirmed.',
    headline: 'Operating partner across eight industrial and field-service platforms.',
    credibilitySummary: 'Runs value creation for a lower-middle-market fund. Repeatedly trusted for PE operating introductions; twelve operator placements with recorded results.',
    functionalExpertise: ['Value creation', 'Commercial diligence', 'Operator recruiting', 'Pricing'],
    industries: ['Private equity', 'Industrial services', 'Logistics'],
    contactPreferences: ['Warm introductions only', 'Capital conversations', 'Advisory and board inquiries'],
    fieldScopes: { credentials: 'public', investments: 'team', references: 'shareable', outcomes: 'shareable', priorRoles: 'public' },
    outcomesCreated: 12, introductionsCompleted: 38, referencesVerified: 6, updatedAt: iso(-4),
  },
  {
    id: 'pp-p17', memberId: 'p17', identityState: 'verified',
    identityNote: 'Health-system credential verified with the licensing board record.',
    headline: 'Rebuilt clinical throughput across nine ambulatory sites.',
    credibilitySummary: 'Clinical operations leader with published throughput data and a model now trialled by a second health system.',
    functionalExpertise: ['Clinical operations', 'Capacity modelling', 'Care-team scheduling'],
    industries: ['Healthcare'],
    contactPreferences: ['Selective expert calls', 'Warm introductions only'],
    fieldScopes: { credentials: 'public', references: 'shareable', outcomes: 'public', investments: 'private', priorRoles: 'public' },
    outcomesCreated: 5, introductionsCompleted: 7, referencesVerified: 3, updatedAt: iso(-14),
  },
  {
    id: 'pp-p14', memberId: 'p14', identityState: 'verified',
    identityNote: 'Patent record and research affiliation confirmed.',
    headline: 'Puts applied AI on factory floors where uptime matters more than novelty.',
    credibilitySummary: 'Two granted patents in vision inspection, three production deployments, one published failure analysis. Strong advisory reputation in industrial AI.',
    functionalExpertise: ['Applied AI', 'Computer vision', 'MLOps', 'Industrial deployment'],
    industries: ['AI', 'Manufacturing'],
    contactPreferences: ['Advisory and board inquiries', 'Selective expert calls', 'No sales outreach'],
    fieldScopes: { credentials: 'public', references: 'shareable', outcomes: 'shareable', investments: 'private', priorRoles: 'public' },
    outcomesCreated: 4, introductionsCompleted: 9, referencesVerified: 2, updatedAt: iso(-7),
  },
  {
    id: 'pp-p7', memberId: 'p7', identityState: 'self-reported',
    identityNote: 'Company confirmed; role is self-stated pending a reference.',
    headline: 'Runs 400 field technicians across four states.',
    credibilitySummary: 'Field-service operator. Dispatch and first-time-fix experience is firsthand; financial claims are self-stated.',
    functionalExpertise: ['Field operations', 'Dispatch', 'Technician retention'],
    industries: ['Field services'],
    contactPreferences: ['Warm introductions only', 'No sales outreach'],
    fieldScopes: { credentials: 'shareable', references: 'private', outcomes: 'shareable', investments: 'private', priorRoles: 'public' },
    outcomesCreated: 2, introductionsCompleted: 3, referencesVerified: 0, updatedAt: iso(-21),
  },
  {
    id: 'pp-p21', memberId: 'p21', identityState: 'verified',
    identityNote: 'Fund registration verified.',
    headline: 'Leads seed and Series A rounds in healthcare and industrial software.',
    credibilitySummary: 'Nineteen investments, six with disclosed follow-on. Prefers warm paths and pre-qualified conversations.',
    functionalExpertise: ['Early-stage investing', 'Go-to-market diligence', 'Board work'],
    industries: ['Venture capital', 'Healthcare', 'SaaS'],
    contactPreferences: ['Warm introductions only', 'Capital conversations'],
    fieldScopes: { credentials: 'public', investments: 'shareable', references: 'shareable', outcomes: 'shareable', priorRoles: 'public' },
    outcomesCreated: 7, introductionsCompleted: 26, referencesVerified: 5, updatedAt: iso(-3),
  },
  {
    id: 'pp-p12', memberId: 'p12', identityState: 'verified',
    identityNote: 'Contractor licence and company registration confirmed.',
    headline: 'Third-generation president of a commercial construction group.',
    credibilitySummary: 'Runs $210M of annual commercial work. Currently thinking about ownership transition; that context is private.',
    functionalExpertise: ['Commercial construction', 'Project controls', 'Ownership transition'],
    industries: ['Construction'],
    contactPreferences: ['Confidential owner conversations', 'Warm introductions only', 'No sales outreach'],
    fieldScopes: { credentials: 'public', references: 'shareable', outcomes: 'shareable', investments: 'private', priorRoles: 'public' },
    outcomesCreated: 3, introductionsCompleted: 5, referencesVerified: 2, updatedAt: iso(-11),
  },
]

export const seedCredentials: PassportCredential[] = [
  { id: 'pc1', memberId: 'p3', kind: 'Prior role', title: 'VP Operations', organization: 'Cardinal Sheet Metal', detail: 'Ran two plants through the 2016 downturn without a layoff.', from: '2009', to: '2014', state: 'verified', verifiedBy: 'Former CEO reference', evidenceIds: [], scope: 'public' },
  { id: 'pc2', memberId: 'p3', kind: 'Board role', title: 'Board member', organization: 'Indiana Manufacturers Association', detail: 'Workforce development committee.', from: '2021', state: 'verified', verifiedBy: 'Association listing', evidenceIds: [], scope: 'public' },
  { id: 'pc3', memberId: 'p3', kind: 'Work sample', title: 'Quoting rebuild memo', organization: 'ForgeLine Systems', detail: 'Fourteen-page internal memo on quote turnaround from 11 days to 3.', from: '2024', state: 'unverified', evidenceIds: [], scope: 'shareable' },
  { id: 'pc4', memberId: 'p14', kind: 'Patent', title: 'Weld seam anomaly detection', organization: 'USPTO 11,942,118', detail: 'Vision model for weld inspection at line speed.', from: '2023', state: 'verified', verifiedBy: 'Patent registry', evidenceIds: [], scope: 'public' },
  { id: 'pc5', memberId: 'p14', kind: 'Publication', title: 'Why factory AI pilots stall', organization: 'Applied Manufacturing Review', detail: 'Failure analysis of eleven stalled deployments.', from: '2025', state: 'verified', verifiedBy: 'Journal record', evidenceIds: [], scope: 'public' },
  { id: 'pc6', memberId: 'p17', kind: 'License', title: 'RN, administrative endorsement', organization: 'State board of nursing', detail: 'Active licence in good standing.', from: '2011', state: 'verified', verifiedBy: 'Licensing board', evidenceIds: [], scope: 'public' },
  { id: 'pc7', memberId: 'p17', kind: 'Research', title: 'Nine-site throughput study', organization: 'Ridgeline Health Partners', detail: '11% lift in completed visits, 14 months of data.', from: '2025', state: 'verified', verifiedBy: 'Internal audit', evidenceIds: [], scope: 'public' },
  { id: 'pc8', memberId: 'p2', kind: 'Advisory role', title: 'Operating advisor', organization: 'Two portfolio companies', detail: 'Commercial reset in field services and industrial distribution.', from: '2022', state: 'verified', verifiedBy: 'Fund confirmation', evidenceIds: [], scope: 'public' },
  { id: 'pc9', memberId: 'p2', kind: 'Investment', title: 'Eight platform investments', organization: 'Northline Capital', detail: 'Lower-middle-market industrial and field services.', from: '2018', state: 'verified', verifiedBy: 'Fund registration', evidenceIds: [], scope: 'team' },
  { id: 'pc10', memberId: 'p21', kind: 'Investment', title: 'Nineteen early-stage investments', organization: 'Verdant Growth Partners', detail: 'Seed and Series A in healthcare and industrial software.', from: '2017', state: 'verified', verifiedBy: 'Fund registration', evidenceIds: [], scope: 'shareable' },
  { id: 'pc11', memberId: 'p12', kind: 'License', title: 'General contractor licence', organization: 'State licensing board', detail: 'Unrestricted commercial licence.', from: '2013', state: 'verified', verifiedBy: 'Licensing board', evidenceIds: [], scope: 'public' },
  { id: 'pc12', memberId: 'p18', kind: 'Public service', title: 'Army Corps of Engineers', organization: 'US Army', detail: 'Six years, power distribution projects.', from: '2008', to: '2014', state: 'verified', verifiedBy: 'Service record', evidenceIds: [], scope: 'public' },
  { id: 'pc13', memberId: 'p18', kind: 'Speaking', title: 'Grid interconnection queue realities', organization: 'Midwest Energy Forum', detail: 'Two hundred attendees, published slides.', from: '2025', state: 'verified', verifiedBy: 'Conference programme', evidenceIds: [], scope: 'public' },
  { id: 'pc14', memberId: 'me', kind: 'Work sample', title: 'Golden Report methodology', organization: 'Aetheris', detail: 'Company-fit report used in five diligence conversations.', from: '2025', state: 'unverified', evidenceIds: [], scope: 'public' },
  { id: 'pc15', memberId: 'p9', kind: 'Certification', title: 'HITRUST certified architect', organization: 'HITRUST', detail: 'Covers the current platform architecture.', from: '2024', state: 'verified', verifiedBy: 'Certificate registry', evidenceIds: [], scope: 'public' },
]

/* ------------------------------------------------------- proof of work */

export const seedProofNodes: ProofOfWorkNode[] = [
  { id: 'pw1', kind: 'Outcome', label: 'ForgeLine quote turnaround: 11 days to 3', memberIds: ['p3'], companyId: 'co-forgeline', outcomeId: 'out1', role: 'Accountable executive', contribution: 'Rebuilt estimating, added a two-person quote desk, published weekly quote ageing.', from: '2024-02', to: '2025-01', collaboratorIds: ['p7'], evidence: 'Signed outcome memo and 14 months of quote ageing data.', state: 'verified', provenance: prov('explicit', 94, 'public') },
  { id: 'pw2', kind: 'Company', label: 'ForgeLine Systems: $18M to $63M', memberIds: ['p3'], companyId: 'co-forgeline', role: 'CEO', contribution: 'Scaled a family-owned fabricator without outside capital across nine years.', from: '2016', collaboratorIds: [], evidence: 'Audited statements shared under NDA; range disclosed publicly.', state: 'verified', provenance: prov('explicit', 90, 'public') },
  { id: 'pw3', kind: 'System', label: 'Clinical Throughput Model', memberIds: ['p17'], systemId: 'sys-clinical-throughput', role: 'Author', contribution: 'Built capacity model and care-team scheduling rules across nine sites.', from: '2024-06', collaboratorIds: ['p9'], evidence: 'Nine-site data set, 11% lift in completed visits.', state: 'verified', provenance: prov('explicit', 88, 'public') },
  { id: 'pw4', kind: 'Introduction', label: 'Introduced ForgeLine to Northline operating team', memberIds: ['me', 'p3', 'p2'], role: 'Connector', contribution: 'Double opt-in introduction with a two-page context memo.', from: iso(-84), collaboratorIds: [], evidence: 'Both parties accepted; conversation continued for four months.', state: 'verified', provenance: prov('explicit', 92, 'shareable') },
  { id: 'pw5', kind: 'Investment', label: 'Series A in Northwind Health Systems', memberIds: ['p21', 'p9'], role: 'Lead investor', contribution: 'Led the round and took a board observer seat.', from: '2024-09', collaboratorIds: [], evidence: 'Public funding announcement.', state: 'verified', provenance: prov('explicit', 96, 'public') },
  { id: 'pw6', kind: 'Publication', label: 'Why factory AI pilots stall', memberIds: ['p14'], role: 'Author', contribution: 'Failure analysis of eleven stalled industrial AI deployments.', from: '2025-03', collaboratorIds: ['p23'], evidence: 'Published in Applied Manufacturing Review.', state: 'verified', provenance: prov('explicit', 95, 'public') },
  { id: 'pw7', kind: 'Project', label: 'Weld inspection line at Halden Instruments', memberIds: ['p14', 'p23'], role: 'Technical lead', contribution: 'Deployed vision inspection on two lines; 0.4% escape rate to 0.05%.', from: '2025-01', to: '2025-08', collaboratorIds: [], evidence: 'Production QA reports for eight months.', state: 'verified', provenance: prov('explicit', 86, 'shareable') },
  { id: 'pw8', kind: 'Board', label: 'Board member, Indiana Manufacturers Association', memberIds: ['p3'], role: 'Board member', contribution: 'Workforce development committee; apprenticeship programme design.', from: '2021', collaboratorIds: [], evidence: 'Association listing.', state: 'verified', provenance: prov('explicit', 93, 'public') },
  { id: 'pw9', kind: 'Reference', label: 'Reference from former CEO, Cardinal Sheet Metal', memberIds: ['p3'], role: 'Referee', contribution: 'Confirms plant leadership through the 2016 downturn.', from: '2024-11', collaboratorIds: [], evidence: 'Verified reference call recorded in the ledger.', state: 'verified', provenance: prov('explicit', 91, 'shareable') },
  { id: 'pw10', kind: 'Team', label: 'Revenue reset team, Northline portfolio company', memberIds: ['p2', 'me', 'p7'], role: 'Advisor', contribution: 'Pricing discipline, quote desk, weekly commercial review.', from: '2025-04', collaboratorIds: [], evidence: 'Engagement completed and paid.', state: 'verified', provenance: prov('explicit', 89, 'shareable') },
  { id: 'pw11', kind: 'Project', label: 'Interconnection queue playbook', memberIds: ['p18'], role: 'Author', contribution: 'Documented queue strategy across three utilities.', from: '2025-05', collaboratorIds: ['p16'], evidence: 'Used by two developers; slides published.', state: 'self-reported', provenance: prov('derived', 68, 'shareable') },
  { id: 'pw12', kind: 'Outcome', label: 'Ridgeline to Northwind model transfer', memberIds: ['p17', 'p9'], outcomeId: 'out5', role: 'Author and sponsor', contribution: 'Shared the throughput model with a second health system.', from: iso(-8), collaboratorIds: ['me'], evidence: 'Nine-site data shared with both parties.', state: 'verified', provenance: prov('explicit', 71, 'shareable') },
]

export const seedProofEdges: ProofOfWorkEdge[] = [
  { id: 'pe1', fromId: 'pw2', toId: 'pw1', kind: 'produced-outcome', note: 'The scaling story rests on the quoting rebuild.', provenance: prov('explicit', 90) },
  { id: 'pe2', fromId: 'pw4', toId: 'pw10', kind: 'introduced', note: 'The introduction produced the revenue reset engagement.', provenance: prov('explicit', 88) },
  { id: 'pe3', fromId: 'pw6', toId: 'pw7', kind: 'authored', note: 'The published failure analysis shaped the deployment plan.', provenance: prov('derived', 74) },
  { id: 'pe4', fromId: 'pw3', toId: 'pw12', kind: 'delivered', note: 'The model transferred to a second system.', provenance: prov('explicit', 85) },
  { id: 'pe5', fromId: 'pw9', toId: 'pw2', kind: 'referenced', note: 'Verified reference supports the operating claim.', provenance: prov('explicit', 91) },
  { id: 'pe6', fromId: 'pw5', toId: 'pw3', kind: 'invested-in', note: 'Investor exposure to the clinical model through the board seat.', provenance: prov('derived', 70) },
  { id: 'pe7', fromId: 'pw8', toId: 'pw2', kind: 'served-on', note: 'Board service sits alongside the operating record.', provenance: prov('explicit', 89) },
]

/* --------------------------------------------- contextual reputation */

export const seedReputations: ContextualReputation[] = [
  { id: 'cr1', memberId: 'p3', context: 'Scaling a family-owned manufacturer', bestFor: 'Owners past $20M who still quote by hand', trustedIn: ['Quoting discipline', 'Plant scheduling', 'Succession conversations'], provenWith: ['ForgeLine Systems', 'Cardinal Sheet Metal'], outcomesCreated: 4, introQuality: 91, referralStrength: 88, evidenceIds: [], proofNodeIds: ['pw1', 'pw2', 'pw9'], scope: 'public', sourceType: 'explicit', confidence: 92 },
  { id: 'cr2', memberId: 'p2', context: 'PE operating introductions', bestFor: 'Founders and operators who want candid diligence, not a pitch', trustedIn: ['Value creation', 'Operator recruiting', 'Commercial diligence'], provenWith: ['Northline Capital', 'Two portfolio resets'], outcomesCreated: 6, introQuality: 94, referralStrength: 90, evidenceIds: [], proofNodeIds: ['pw4', 'pw10'], scope: 'shareable', sourceType: 'explicit', confidence: 90 },
  { id: 'cr3', memberId: 'p14', context: 'Industrial AI advisory', bestFor: 'Manufacturers deciding whether a vision project is real', trustedIn: ['Deployment reality', 'Failure analysis', 'Vendor evaluation'], provenWith: ['Halden Instruments', 'Cassian Labs'], outcomesCreated: 3, introQuality: 86, referralStrength: 79, evidenceIds: [], proofNodeIds: ['pw6', 'pw7'], scope: 'public', sourceType: 'explicit', confidence: 87 },
  { id: 'cr4', memberId: 'p17', context: 'Clinical throughput and capacity', bestFor: 'Ambulatory networks with visit backlogs', trustedIn: ['Capacity modelling', 'Care-team scheduling'], provenWith: ['Ridgeline Health Partners'], outcomesCreated: 2, introQuality: 84, referralStrength: 76, evidenceIds: [], proofNodeIds: ['pw3', 'pw12'], scope: 'public', sourceType: 'explicit', confidence: 85 },
  { id: 'cr5', memberId: 'p12', context: 'Confidential owner transitions', bestFor: 'Owners weighing succession against a sale', trustedIn: ['Construction ownership transfer', 'Family governance'], provenWith: ['Bergeron Construction Group'], outcomesCreated: 1, introQuality: 80, referralStrength: 72, evidenceIds: [], proofNodeIds: [], scope: 'private', sourceType: 'derived', confidence: 64 },
  { id: 'cr6', memberId: 'p10', context: 'Freight network redesign', bestFor: 'Shippers rebuilding lanes after a carrier exit', trustedIn: ['Lane strategy', 'Carrier negotiation'], provenWith: ['Portline Freight Group'], outcomesCreated: 2, introQuality: 78, referralStrength: 74, evidenceIds: [], proofNodeIds: [], scope: 'shareable', sourceType: 'derived', confidence: 71 },
  { id: 'cr7', memberId: 'p21', context: 'Healthcare early-stage capital', bestFor: 'Founders with clinical evidence and a real buyer', trustedIn: ['Seed and Series A', 'Board work'], provenWith: ['Northwind Health Systems'], outcomesCreated: 3, introQuality: 89, referralStrength: 85, evidenceIds: [], proofNodeIds: ['pw5'], scope: 'shareable', sourceType: 'explicit', confidence: 88 },
  { id: 'cr8', memberId: 'me', context: 'Revenue systems in industrial services', bestFor: 'Operators whose pipeline depends on quoting speed', trustedIn: ['Pricing discipline', 'Commercial review cadence'], provenWith: ['ForgeLine Systems', 'Raghavan Advisory'], outcomesCreated: 3, introQuality: 87, referralStrength: 81, evidenceIds: [], proofNodeIds: ['pw1', 'pw10'], scope: 'shareable', sourceType: 'explicit', confidence: 84 },
]

/* ---------------------------------------------- opportunity exchange */

export const seedOpportunities: ProfessionalOpportunity[] = [
  {
    id: 'op1', ownerId: 'p2', title: 'Operating partner for a field-services platform', kind: 'Advisory role',
    objective: 'Place an operator who has run 300+ technicians into a newly acquired platform.',
    whoItIsFor: 'Field-service operators with dispatch and first-time-fix experience.',
    qualification: ['Ran a workforce above 250 technicians', 'Rebuilt dispatch or scheduling', 'Comfortable with PE reporting cadence'],
    whatIsNeeded: 'Two days a month for six months, then a decision on a full role.',
    whatIsOffered: 'Advisory equity, direct access to the deal team, first look at the next platform.',
    mutualValue: 'The platform gets an operator who has done it. The operator gets a live PE relationship without a full-time commitment.',
    whyNow: 'The acquisition closed eleven days ago and the integration plan is being written this month.',
    expiresOn: iso(24), visibility: 'network', confidential: false, companyId: 'co-northline',
    personIds: ['p7'], systemIds: [], circleIds: ['cir-pe-revenue'], evidence: ['Signed platform acquisition announcement.'],
    interest: [{ memberId: 'p7', note: 'Runs 400 technicians across four states.', when: iso(-3), state: 'interested' }],
    questions: [{ id: 'oq1', memberId: 'p7', question: 'Is the reporting cadence monthly or weekly in the first quarter?', answer: 'Weekly for the first eight weeks, then monthly.', when: iso(-2) }],
    saved: true, status: 'in-conversation', createdAt: iso(-11),
  },
  {
    id: 'op2', ownerId: 'p3', title: 'Distribution partner for shop-floor scheduling', kind: 'Distribution',
    objective: 'Find a channel partner already selling into mid-market fabricators.',
    whoItIsFor: 'Industrial software resellers and MEP consultants in the Midwest.',
    qualification: ['Existing relationships with 20+ fabricators', 'Implementation capability', 'No competing scheduling product'],
    whatIsNeeded: 'A partner who can implement, not just resell.',
    whatIsOffered: 'Referral economics, joint implementation, reference access to two plants.',
    mutualValue: 'They get a product their customers already ask for; we get distribution without hiring a field team.',
    whyNow: 'Two plants are live and reference-ready before the spring buying season.',
    expiresOn: iso(41), visibility: 'network', confidential: false, companyId: 'co-forgeline',
    personIds: [], systemIds: ['sys-golden-report'], circleIds: ['cir-ai-manufacturing'], evidence: ['Two reference plants with 14 months of data.'],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-6),
  },
  {
    id: 'op3', ownerId: 'p9', title: 'Clinical pilot for capacity modelling', kind: 'Pilot',
    objective: 'Run the throughput model in a second ambulatory network.',
    whoItIsFor: 'Health systems with eight or more ambulatory sites and a visit backlog.',
    qualification: ['Eight or more sites', 'Scheduling data access', 'Named clinical sponsor'],
    whatIsNeeded: 'A twelve-week pilot with one clinical sponsor and scheduling data access.',
    whatIsOffered: 'Model, implementation support and shared publication rights.',
    mutualValue: 'They get a validated capacity model; we get a second evidence set.',
    whyNow: 'The migration freeze lifts in three weeks and the clinical sponsor is already briefed.',
    expiresOn: iso(19), visibility: 'network', confidential: false, companyId: 'co-northwind',
    personIds: ['p17'], systemIds: ['sys-clinical-throughput'], circleIds: ['cir-infra-buyers'],
    evidence: ['Nine-site study, 11% lift in completed visits.'],
    interest: [{ memberId: 'p17', note: 'Author of the original model.', when: iso(-8), state: 'warm-path' }],
    questions: [], saved: true, status: 'room-open', roomId: 'room-clinical', createdAt: iso(-14),
  },
  {
    id: 'op4', ownerId: 'p12', title: 'Ownership transition for a commercial contractor', kind: 'Succession',
    objective: 'Understand transition options without signalling anything to the market.',
    whoItIsFor: 'Buyers, operators and advisors experienced in construction ownership transfer.',
    qualification: ['Construction or industrial services experience', 'Can work under confidentiality', 'No brokered outreach'],
    whatIsNeeded: 'Two candid conversations and one structural option worth modelling.',
    whatIsOffered: 'Direct access to a $210M revenue business and complete discretion.',
    mutualValue: 'Both sides learn whether a structure exists before anyone commits.',
    whyNow: 'The founder turns 61 in April and the family has asked for a plan.',
    expiresOn: iso(60), visibility: 'private', confidential: true,
    personIds: ['p2', 'p19'], systemIds: [], circleIds: [], evidence: ['Family governance memo held privately.'],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-4),
  },
  {
    id: 'op5', ownerId: 'p18', title: 'Joint venture for behind-the-meter storage', kind: 'Joint venture',
    objective: 'Pair grid interconnection experience with a developer holding site control.',
    whoItIsFor: 'Developers with site control and an interconnection queue position.',
    qualification: ['Site control on at least two sites', 'Queue position filed', 'Comfortable with shared development risk'],
    whatIsNeeded: 'A developer partner and a financing conversation.',
    whatIsOffered: 'Interconnection strategy, utility relationships, engineering leadership.',
    mutualValue: 'They shorten the queue timeline; we get project scale we cannot fund alone.',
    whyNow: 'The queue reform window closes at the end of the quarter.',
    expiresOn: iso(28), visibility: 'network', confidential: false,
    personIds: ['p16'], systemIds: [], circleIds: [], evidence: ['Queue playbook used by two developers.'],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-9),
  },
  {
    id: 'op6', ownerId: 'p14', title: 'Board seat: industrial software company', kind: 'Board seat',
    objective: 'Find one technical board member for a $40M ARR industrial software business.',
    whoItIsFor: 'Operators or technologists who have shipped into plants.',
    qualification: ['Shipped software into industrial environments', 'Board or advisory experience', 'No competing vendor role'],
    whatIsNeeded: 'Four meetings a year and two diligence calls before joining.',
    whatIsOffered: 'Board seat with equity and a real vote on the product roadmap.',
    mutualValue: 'The board gains deployment realism; the member gains governance experience in a growing business.',
    whyNow: 'The board is being reconstituted before the next fiscal year.',
    expiresOn: iso(35), visibility: 'network', confidential: false, companyId: 'co-braxton',
    personIds: ['p20'], systemIds: [], circleIds: [], evidence: ['Board charter draft shared under NDA.'],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-16),
  },
  {
    id: 'op7', ownerId: 'p10', title: 'Supplier relationship: regional cold-chain carrier', kind: 'Supplier relationship',
    objective: 'Replace a carrier that exited three Midwest lanes.',
    whoItIsFor: 'Cold-chain carriers with Midwest capacity.',
    qualification: ['Refrigerated capacity in Ohio, Indiana or Michigan', 'On-time record above 94%', 'Can start within 45 days'],
    whatIsNeeded: 'Committed capacity on three lanes.',
    whatIsOffered: 'Twelve-month volume commitment and payment terms of 21 days.',
    mutualValue: 'They get predictable volume; we get lanes covered before peak.',
    whyNow: 'The incumbent exits in six weeks.',
    expiresOn: iso(14), visibility: 'network', confidential: false,
    personIds: ['p22'], systemIds: [], circleIds: [], evidence: ['Carrier exit notice.'],
    interest: [{ memberId: 'p22', note: 'Buys refrigerated capacity at volume; may know two carriers.', when: iso(-1), state: 'question' }],
    questions: [], saved: false, status: 'open', createdAt: iso(-5),
  },
  {
    id: 'op8', ownerId: 'p23', title: 'Expert request: pricing an industrial retrofit line', kind: 'Expert request',
    objective: 'Get two hours from someone who has priced retrofit work at scale.',
    whoItIsFor: 'Operators who have priced retrofit or aftermarket lines.',
    qualification: ['Priced retrofit or aftermarket revenue', 'Comfortable reviewing a live model'],
    whatIsNeeded: 'One review call and written notes.',
    whatIsOffered: 'Paid engagement or a reciprocal introduction, whichever they prefer.',
    mutualValue: 'We avoid a pricing mistake; they see a live model in a sector they care about.',
    whyNow: 'The pricing decision goes to the executive team in two weeks.',
    expiresOn: iso(11), visibility: 'network', confidential: false,
    personIds: ['me', 'p3'], systemIds: [], circleIds: [], evidence: [],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-2),
  },
  {
    id: 'op9', ownerId: 'p5', title: 'Acquisition: bolt-on payments infrastructure', kind: 'Acquisition',
    objective: 'Acquire a small reconciliation product to fill a platform gap.',
    whoItIsFor: 'Founders of $1M–$4M ARR reconciliation or ledger tools.',
    qualification: ['$1M–$4M ARR', 'US or Canada', 'Founder-led with clean cap table'],
    whatIsNeeded: 'Two conversations and a data room.',
    whatIsOffered: 'Cash and stock, retained team, product continuity commitment.',
    mutualValue: 'They get distribution and a home for the team; we close a gap faster than building it.',
    whyNow: 'The build-versus-buy decision is being made this quarter.',
    expiresOn: iso(45), visibility: 'connections', confidential: true,
    personIds: [], systemIds: [], circleIds: [], evidence: ['Board-approved acquisition mandate.'],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-20),
  },
  {
    id: 'op10', ownerId: 'me', title: 'Speaking: relationship systems for operators', kind: 'Speaking',
    objective: 'Give one substantive talk to owners who sell through relationships.',
    whoItIsFor: 'Industry forums and owner groups with 60+ attendees.',
    qualification: ['Owner or operator audience', 'No pay-to-speak arrangement'],
    whatIsNeeded: 'A room of operators and forty minutes.',
    whatIsOffered: 'A worked case, the method and the failure modes, published slides.',
    mutualValue: 'They get a session with evidence; we meet operators who have the problem.',
    whyNow: 'Spring programmes are being set now.',
    expiresOn: iso(50), visibility: 'network', confidential: false,
    personIds: [], systemIds: ['sys-golden-report'], circleIds: ['cir-indiana'], evidence: [],
    interest: [], questions: [], saved: false, status: 'open', createdAt: iso(-30),
  },
  {
    id: 'op11', ownerId: 'p6', title: 'Hiring: plant controller, Indianapolis', kind: 'Hiring',
    objective: 'Hire a controller who has closed books in a multi-plant manufacturer.',
    whoItIsFor: 'Controllers and finance managers in manufacturing.',
    qualification: ['Multi-plant close experience', 'Standard costing', 'On-site in Indianapolis'],
    whatIsNeeded: 'One strong candidate, not a pipeline.',
    whatIsOffered: 'Direct access to the CFO and a decision within two weeks of a referral.',
    mutualValue: 'A referred candidate skips the queue; the referrer places someone they trust.',
    whyNow: 'The current controller retires in ninety days.',
    expiresOn: iso(-3), visibility: 'network', confidential: false,
    personIds: [], systemIds: [], circleIds: ['cir-indiana'], evidence: [],
    interest: [], questions: [], saved: false, status: 'expired', createdAt: iso(-48),
  },
]

/* ---------------------------------------------------------- deal rooms */

export const seedDealRooms: DealRoom[] = [
  {
    id: 'dr1', name: 'Northwind clinical pilot', opportunityId: 'op3', stage: 'Diligence',
    partyIds: ['p9', 'p17', 'me'], companyIds: ['co-northwind'],
    originatingPath: 'Knowledge asset → Enterprise Infrastructure Buyers circle → Simone Adebayo → double opt-in intro → clinical sponsor',
    systemIds: ['sys-clinical-throughput'], threadIds: [], meetingIds: [],
    files: [
      { id: 'df1', label: 'Nine-site throughput study', kind: 'reference', note: 'Shared with both clinical sponsors.' },
      { id: 'df2', label: 'Pilot scope draft v3', kind: 'placeholder', note: 'Document store not connected in preview.' },
    ],
    evidenceIds: [],
    diligence: [
      { id: 'dd1', question: 'Which scheduling fields are available without a data agreement?', owner: 'Elara Voss', answer: 'Appointment type, provider, arrival and completion timestamps.', state: 'answered' },
      { id: 'dd2', question: 'Who signs off on publication rights?', owner: 'Legal', state: 'open' },
      { id: 'dd3', question: 'Can the pilot start before the migration freeze lifts?', owner: 'Simone Adebayo', state: 'open' },
    ],
    openLoops: [{ id: 'dl1', label: 'Send the twelve-week scope to the clinical sponsor', done: false }, { id: 'dl2', label: 'Confirm data access path with IT', done: true }],
    decisions: [{ id: 'dc1', record: 'Both systems agreed to a twelve-week pilot scope before any commercial terms.', when: iso(-6), by: 'Joint' }],
    permissions: [
      { memberId: 'p9', canSee: 'Scope, evidence, diligence answers', cannotSee: 'Private notes on the second system' },
      { memberId: 'p17', canSee: 'Scope, evidence, publication terms', cannotSee: 'Commercial modelling' },
    ],
    milestones: [
      { id: 'dm1', label: 'Scope signed', owner: 'Joseph', due: iso(9), done: false },
      { id: 'dm2', label: 'Data access confirmed', owner: 'Northwind IT', due: iso(16), done: false },
      { id: 'dm3', label: 'Pilot start', owner: 'Joint', due: iso(30), done: false },
    ],
    transactionIds: ['tx1'], nextAction: 'Answer the publication-rights question before the scope goes out.',
    valueState: 'modeled', modeledValue: 'Twelve-week pilot, no committed contract value yet.',
    outcome: '', privateNote: 'Private: the second system moves slowly on legal. Do not promise a date.',
    createdAt: iso(-14),
  },
  {
    id: 'dr2', name: 'Bergeron transition options', opportunityId: 'op4', stage: 'Evaluating',
    partyIds: ['p12', 'p2'], companyIds: [],
    originatingPath: 'Private owner conversation → confidential succession interest → human concierge review',
    systemIds: [], threadIds: [], meetingIds: [],
    files: [{ id: 'df3', label: 'Family governance memo', kind: 'placeholder', note: 'Held privately by the owner; not uploaded.' }],
    evidenceIds: [],
    diligence: [{ id: 'dd4', question: 'Is a partial recapitalisation acceptable to the family?', owner: 'Luc Moreau', state: 'open' }],
    openLoops: [{ id: 'dl3', label: 'Model two structures before naming any buyer', done: false }],
    decisions: [],
    permissions: [{ memberId: 'p2', canSee: 'Sector, size band, structure preference', cannotSee: 'Company identity until the owner approves' }],
    milestones: [{ id: 'dm4', label: 'Owner decides whether to reveal identity', owner: 'Luc Moreau', due: iso(21), done: false }],
    transactionIds: [], nextAction: 'Concierge review before any identity is revealed.',
    valueState: 'unquantified', outcome: '',
    privateNote: 'Confidential. Nothing here is visible to the network.',
    createdAt: iso(-4),
  },
]

/* -------------------------------------------------- expertise exchange */

export const seedExpertise: ExpertiseOffer[] = [
  { id: 'ex1', memberId: 'p3', topic: 'Quoting and estimating in fabrication', offer: 'Thirty minutes on why your quotes take eleven days and what to cut first.', audience: 'Owners and plant managers in fabrication or machining', format: '30 minute call', availability: 'Two slots a month, Thursday mornings', durationMinutes: 30, constraints: 'No vendors. I will not review software you are trying to sell me.', terms: 'Free', proofNodeIds: ['pw1', 'pw2'], industries: ['Manufacturing'], geography: 'Anywhere, US hours', visibility: 'network', expiresOn: iso(90), requests: [{ id: 'er1', memberId: 'p7', context: 'Dispatch quoting is slowing our field jobs.', state: 'scheduled', when: iso(-5) }], saved: true, createdAt: iso(-40) },
  { id: 'ex2', memberId: 'p14', topic: 'Whether your vision project is real', offer: 'Async review of a factory AI proposal with a written verdict.', audience: 'Manufacturers evaluating a vision or inspection vendor', format: 'Async review', availability: 'Rolling, 5 business day turnaround', durationMinutes: 90, constraints: 'I will not name vendors I advise.', terms: 'Selective', proofNodeIds: ['pw6', 'pw7'], industries: ['AI', 'Manufacturing'], geography: 'Global', visibility: 'network', expiresOn: iso(120), requests: [], saved: false, createdAt: iso(-33) },
  { id: 'ex3', memberId: 'p2', topic: 'PE operating partner perspective', offer: 'Candid read on how a fund would look at your business.', audience: 'Owners and CEOs of $10M–$80M revenue businesses', format: '30 minute call', availability: 'Four slots a quarter', durationMinutes: 30, constraints: 'Not a substitute for banker advice. No brokered introductions.', terms: 'Free', proofNodeIds: ['pw4', 'pw10'], industries: ['Private equity', 'Industrial services'], geography: 'North America', visibility: 'network', expiresOn: iso(75), requests: [{ id: 'er2', memberId: 'p12', context: 'Weighing succession against a partial sale.', state: 'requested', when: iso(-2) }], saved: false, createdAt: iso(-28) },
  { id: 'ex4', memberId: 'p17', topic: 'Clinical capacity modelling', offer: 'Working session on visit backlog and care-team scheduling.', audience: 'Ambulatory operations leaders', format: 'Working session', availability: 'One a month', durationMinutes: 60, constraints: 'No patient data. Aggregate only.', terms: 'Free', proofNodeIds: ['pw3'], industries: ['Healthcare'], geography: 'US', visibility: 'network', expiresOn: iso(60), requests: [], saved: false, createdAt: iso(-22) },
  { id: 'ex5', memberId: 'p19', topic: 'Federal contracting entry', offer: 'Talk through what it actually costs to chase your first federal award.', audience: 'Founders and owners considering federal work', format: '30 minute call', availability: 'Two a month', durationMinutes: 30, constraints: 'Not legal advice.', terms: 'Free', proofNodeIds: [], industries: ['Professional services', 'Defense'], geography: 'US', visibility: 'network', expiresOn: iso(85), requests: [], saved: false, createdAt: iso(-18) },
  { id: 'ex6', memberId: 'p21', topic: 'Series A deck review', offer: 'Written response on the three things an investor will push on.', audience: 'Founders raising seed or Series A in healthcare or industrial software', format: 'Written response', availability: 'Two a month', durationMinutes: 45, constraints: 'A review is not a pitch meeting and does not lead to one.', terms: 'Selective', proofNodeIds: ['pw5'], industries: ['Healthcare', 'SaaS'], geography: 'North America', visibility: 'network', expiresOn: iso(70), requests: [], saved: false, createdAt: iso(-12) },
  { id: 'ex7', memberId: 'me', topic: 'Relationship systems that survive a busy quarter', offer: 'Thirty minutes on which relationships to keep warm and which to let rest.', audience: 'Founders and operators with more relationships than time', format: '30 minute call', availability: 'Three a month', durationMinutes: 30, constraints: 'No sales conversation on my systems during the call.', terms: 'Free', proofNodeIds: ['pw10'], industries: ['Professional services', 'Industrial services'], geography: 'Global', visibility: 'network', expiresOn: iso(100), requests: [], saved: false, createdAt: iso(-8) },
]

/* ---------------------------------------------------------- referrals */

export const seedReferrals: ProfessionalReferral[] = [
  { id: 'rf1', refereeId: 'p3', referrerId: 'me', category: 'Would introduce', context: 'Manufacturing operations and quoting discipline', strength: 'Strong', evidence: 'Worked together on the quoting rebuild for eleven months.', relationshipBasis: 'Direct engagement, weekly for a year', when: iso(-60), reconfirmBy: iso(305), scope: 'shareable', shareable: true },
  { id: 'rf2', refereeId: 'p2', referrerId: 'p3', category: 'Trust with a client', context: 'PE operating conversations with owner-operators', strength: 'Strong', evidence: 'Sent two peer owners; both conversations were candid and useful.', relationshipBasis: 'Two years, three shared engagements', when: iso(-45), reconfirmBy: iso(320), scope: 'shareable', shareable: true },
  { id: 'rf3', refereeId: 'p14', referrerId: 'p23', category: 'Would call for this problem', context: 'Deciding whether a vision inspection project is viable', strength: 'Confident', evidence: 'Ran the weld inspection line together for eight months.', relationshipBasis: 'Direct project collaboration', when: iso(-30), reconfirmBy: iso(335), scope: 'shareable', shareable: true },
  { id: 'rf4', refereeId: 'p7', referrerId: 'p2', category: 'Would hire', context: 'Field operations leadership at scale', strength: 'Qualified', evidence: 'Observed her dispatch rebuild from the board seat; have not worked with her directly.', relationshipBasis: 'Board observation', when: iso(-20), reconfirmBy: iso(345), scope: 'team', shareable: false },
  { id: 'rf5', refereeId: 'p17', referrerId: 'p9', category: 'Would introduce', context: 'Clinical throughput work in ambulatory networks', strength: 'Strong', evidence: 'Reviewed her nine-site data set line by line.', relationshipBasis: 'Peer review across two systems', when: iso(-15), reconfirmBy: iso(350), scope: 'shareable', shareable: true },
  { id: 'rf6', refereeId: 'me', referrerId: 'p11', category: 'Trust with a client', context: 'Relationship systems for advisory firms', strength: 'Confident', evidence: 'Ran a two-week paid pilot inside the firm.', relationshipBasis: 'Paid engagement', when: iso(-25), reconfirmBy: iso(340), scope: 'shareable', shareable: true },
  { id: 'rf7', refereeId: 'p12', referrerId: 'p19', category: 'Would call for this problem', context: 'Construction ownership transition', strength: 'Confident', evidence: 'Advised on the family governance structure.', relationshipBasis: 'Professional advisory relationship', when: iso(-10), reconfirmBy: iso(355), scope: 'private', shareable: false },
]

/* -------------------------------------------------- introducer records */

export const seedIntroducerRecords: IntroducerRecord[] = [
  { id: 'ir-me', memberId: 'me', introsMade: 14, accepted: 12, conversationsStarted: 11, contextUsefulness: 88, continuedRelationships: 7, opportunitiesCreated: 4, outcomesCreated: 3, declinePattern: 'Two declines, both on timing rather than fit.', typicalResponseHours: 6, introStyle: 'Two-page context memo, double opt-in, no surprise adds.', bestFor: ['Operator to PE', 'System placement', 'Owner to advisor'], note: 'Your record is visible to you. Other members see only the parts you share.', scope: 'private' },
  { id: 'ir-p2', memberId: 'p2', introsMade: 38, accepted: 34, conversationsStarted: 31, contextUsefulness: 94, continuedRelationships: 19, opportunitiesCreated: 11, outcomesCreated: 6, declinePattern: 'Declines when the ask is vague; says so directly.', typicalResponseHours: 9, introStyle: 'Short, blunt, always names the reason.', bestFor: ['Operator placements', 'Diligence conversations', 'Portfolio introductions'], note: 'Trusted for PE operating introductions.', scope: 'shareable' },
  { id: 'ir-p3', memberId: 'p3', introsMade: 21, accepted: 18, conversationsStarted: 16, contextUsefulness: 89, continuedRelationships: 9, opportunitiesCreated: 5, outcomesCreated: 4, declinePattern: 'Will not introduce vendors to peers.', typicalResponseHours: 20, introStyle: 'Prefers a phone call before any introduction.', bestFor: ['Peer manufacturers', 'Plant leadership', 'Association contacts'], note: 'Slow but reliable. Never forwards a cold ask.', scope: 'shareable' },
  { id: 'ir-p21', memberId: 'p21', introsMade: 26, accepted: 20, conversationsStarted: 17, contextUsefulness: 82, continuedRelationships: 11, opportunitiesCreated: 8, outcomesCreated: 3, declinePattern: 'Declines founder introductions outside the thesis without exception.', typicalResponseHours: 14, introStyle: 'One paragraph, always includes the thesis fit.', bestFor: ['Founder to investor', 'Board candidates'], note: 'Consistent, thesis-disciplined.', scope: 'shareable' },
]

/* ---------------------------------------- talent: capability problems */

export const seedProblems: CapabilityProblem[] = [
  { id: 'cp1', ownerId: 'p2', companyId: 'co-northline', confidentialCompany: false, title: 'Newly acquired platform has no commercial leader', kind: 'Leadership gap', problem: 'A field-services platform closed eleven days ago with no commercial leadership and a quoting process run on spreadsheets.', whyItMatters: 'The first hundred days set the pricing discipline for three years.', whatGoodLooksLike: 'Someone who has rebuilt a quote desk and can carry an owner-operator team with them.', constraints: 'Two days a month to start. Must be comfortable with PE cadence.', paths: ['Operator', 'Fractional', 'Advisor'], industries: ['Field services', 'Private equity'], geography: 'Midwest', visibility: 'network', systemIds: ['sys-golden-report'], status: 'exploring', createdAt: iso(-11) },
  { id: 'cp2', ownerId: 'p12', confidentialCompany: true, title: 'Confidential: succession-ready operations leader', kind: 'Capability gap', problem: 'A commercial contractor needs an operations leader who could eventually run the business.', whyItMatters: 'Ownership transition depends on there being someone credible inside.', whatGoodLooksLike: 'Ten years in commercial construction, project controls depth, patient with a family business.', constraints: 'Company identity stays private until mutual interest.', paths: ['Executive', 'Operator'], industries: ['Construction'], geography: 'Quebec and Northeast', visibility: 'private', systemIds: [], status: 'open', createdAt: iso(-4) },
  { id: 'cp3', ownerId: 'p9', companyId: 'co-northwind', confidentialCompany: false, title: 'No one owns capacity modelling', kind: 'Problem to solve', problem: 'Visit backlog is growing while three sites sit under capacity. Nobody owns the model.', whyItMatters: 'Every week of backlog costs completed visits and clinician goodwill.', whatGoodLooksLike: 'A clinical operations advisor for twelve weeks, then a decision on a permanent role.', constraints: 'Aggregate data only during evaluation.', paths: ['Advisor', 'Specialist', 'Fractional'], industries: ['Healthcare'], geography: 'Minneapolis', visibility: 'network', systemIds: ['sys-clinical-throughput'], status: 'team-built', createdAt: iso(-18) },
  { id: 'cp4', ownerId: 'p18', confidentialCompany: false, title: 'Entering the defense supply chain', kind: 'Advisory need', problem: 'We build grid equipment and keep being told to look at defense, without knowing what qualification really costs.', whyItMatters: 'A wrong entry decision burns two years of engineering time.', whatGoodLooksLike: 'A small advisory group: one federal contracting veteran, one quality systems specialist, one operator who has done it.', constraints: 'No agencies, no capture consultants on retainer.', paths: ['Advisor', 'Project team', 'Specialist'], industries: ['Energy', 'Defense'], geography: 'US', visibility: 'network', systemIds: [], status: 'open', createdAt: iso(-7) },
  { id: 'cp5', ownerId: 'p6', confidentialCompany: false, title: 'Cannot find a plant controller who has closed multi-plant books', kind: 'Specialist need', problem: 'Two searches have failed. Candidates have single-site experience only.', whyItMatters: 'The retiring controller leaves in ninety days.', whatGoodLooksLike: 'One referred candidate with standard costing and multi-plant close experience.', constraints: 'On-site in Indianapolis.', paths: ['Specialist', 'Executive'], industries: ['Manufacturing'], geography: 'Indianapolis', visibility: 'network', systemIds: [], status: 'open', createdAt: iso(-13) },
]

export const seedTeams: SuggestedTeam[] = [
  {
    id: 'st1', problemId: 'cp3', objective: 'Own clinical capacity modelling for twelve weeks and hand over a working model.',
    roles: [
      { memberId: 'p17', role: 'Clinical operations lead', why: 'Built and proved the throughput model across nine sites.', path: 'Advisor', proofNodeIds: ['pw3', 'pw12'] },
      { memberId: 'p9', role: 'Technical sponsor', why: 'Owns the scheduling data and the platform decisions.', path: 'Executive', proofNodeIds: [] },
      { memberId: 'me', role: 'Cadence and reporting', why: 'Builds the weekly review that keeps a model alive after handover.', path: 'Consultant', proofNodeIds: ['pw10'] },
    ],
    systemIds: ['sys-clinical-throughput'], circleIds: ['cir-infra-buyers'],
    strongestPath: 'Simone Adebayo has a direct relationship with the clinical sponsor and has already shared the data set.',
    saved: true, invited: ['p17'], createdAt: iso(-16),
  },
]

/* ----------------------------------------------------- capital layer */

export const seedCapital: CapitalProfile[] = [
  { id: 'cap1', memberId: 'p21', side: 'investor', thesis: 'Clinical and industrial software where the buyer already has the budget line.', stages: ['Seed', 'Series A'], sectors: ['Healthcare', 'Industrial software'], geography: 'North America', checkRange: '$1.5M–$6M', leadPreference: 'Lead', tractionExpectation: 'Two reference customers paying list price.', timing: 'Deploying now, four slots this year.', openness: 'Selective', introPreference: 'Warm introduction with the thesis fit named in the first line.', exclusions: ['Consumer', 'Crypto', 'Agency models'], warmPaths: ['me', 'p9'], scope: 'shareable', updatedAt: iso(-3) },
  { id: 'cap2', memberId: 'p8', side: 'investor', thesis: 'Control positions in industrial services with a real operating plan.', stages: ['Growth', 'Control'], sectors: ['Industrial services', 'Logistics'], geography: 'US Midwest and Southeast', checkRange: '$8M–$40M', leadPreference: 'Lead', tractionExpectation: '$3M+ EBITDA with owner continuity.', timing: 'Two platforms this year.', openness: 'Open now', introPreference: 'Introduction from an operator who has worked with the business.', exclusions: ['Turnarounds', 'Pre-revenue'], warmPaths: ['p2'], scope: 'shareable', updatedAt: iso(-6) },
  { id: 'cap3', memberId: 'p9', side: 'company', thesis: 'Capacity intelligence for ambulatory networks.', stages: ['Series A'], sectors: ['Healthcare'], geography: 'US', raisePurpose: 'Two clinical deployments and a data team.', traction: 'Nine-site study, 11% lift, one paid system and a second in pilot.', useOfFunds: '60% engineering, 25% clinical implementation, 15% evidence and publication.', roundState: 'Open, $9M target, $3.5M soft-circled.', desiredInvestorProfile: 'Lead who has taken clinical evidence through a health-system sale cycle.', timing: 'Closing in the next quarter.', openness: 'Open now', introPreference: 'Warm introduction from a clinical operator or an existing investor.', exclusions: ['Strategics with a competing product'], warmPaths: ['p21', 'p17'], scope: 'shareable', updatedAt: iso(-5) },
  { id: 'cap4', memberId: 'p5', side: 'company', thesis: 'Reconciliation infrastructure for mid-market finance teams.', stages: ['Seed'], sectors: ['Fintech'], geography: 'US', raisePurpose: 'Extend the ledger product and close a bolt-on acquisition.', traction: '$2.4M ARR, 140% net retention.', useOfFunds: '50% product, 30% acquisition, 20% go-to-market.', roundState: 'Pre-marketing, no term sheet.', desiredInvestorProfile: 'Investor comfortable with a small acquisition inside the round.', timing: 'Starting conversations in six weeks.', openness: 'Selective', introPreference: 'Introduction from a portfolio founder.', exclusions: [], warmPaths: [], scope: 'private', updatedAt: iso(-9) },
]

export const seedAcquisitions: AcquisitionIntent[] = [
  { id: 'aq1', memberId: 'p12', role: 'Owner', interestLevel: 'Exploring', confidential: true, identityRevealed: false, timeline: '18 to 36 months', sector: 'Commercial construction', geography: 'Quebec and Northeast', sizeBand: '$150M–$250M revenue', companyCharacteristics: 'Third-generation, 380 employees, strong backlog, no institutional debt.', structurePreference: 'Partial recapitalisation with family continuity.', operatorNeed: 'Succession-ready operations leader inside the business first.', financingNeed: 'Would consider a minority partner before a full sale.', advisorIds: ['p19'], trustedPathIds: ['p2'], evidence: ['Family governance memo held privately.'], approvals: [{ memberId: 'p12', approved: true, when: iso(-4) }], conciergeReviewId: 'hc1', scope: 'private', createdAt: iso(-4) },
  { id: 'aq2', memberId: 'p8', role: 'Buyer', interestLevel: 'Serious', confidential: false, identityRevealed: true, timeline: 'Now through year end', sector: 'Industrial and field services', geography: 'US Midwest and Southeast', sizeBand: '$3M–$12M EBITDA', companyCharacteristics: 'Owner-operated, recurring service revenue, technician workforce.', structurePreference: 'Control with owner rollover.', operatorNeed: 'A commercial leader for each platform.', financingNeed: 'Committed facility in place.', advisorIds: ['p2'], trustedPathIds: ['p2', 'p7'], evidence: ['Committed credit facility letter.'], approvals: [], scope: 'shareable', createdAt: iso(-12) },
  { id: 'aq3', memberId: 'p24', role: 'Successor', interestLevel: 'Exploring', confidential: true, identityRevealed: false, timeline: '12 to 24 months', sector: 'Real estate services', geography: 'Southwest', sizeBand: '$20M–$60M revenue', companyCharacteristics: 'Property services with a retiring founder.', structurePreference: 'Earn-in over four years.', operatorNeed: 'Already operating; needs the ownership path.', financingNeed: 'Seller note plus a small equity partner.', advisorIds: [], trustedPathIds: [], evidence: [], approvals: [], scope: 'private', createdAt: iso(-22) },
]

export const seedBoardIntents: BoardAdvisoryIntent[] = [
  { id: 'ba1', side: 'company', memberId: 'p20', companyId: 'co-braxton', expertiseNeeded: ['Industrial deployment', 'Applied AI', 'Security'], expertiseOffered: [], companyStage: 'Growth, $40M ARR', companySize: '600 employees', cadence: 'Four meetings a year plus two calls', compensation: '0.25% over four years, expenses covered', sector: 'Industrial software', geography: 'Denver, remote acceptable', commitment: 'Roughly forty hours a year', conflicts: ['No competing vendor roles'], proofNodeIds: [], referralIds: [], openness: 'Open', visibility: 'network', createdAt: iso(-16) },
  { id: 'ba2', side: 'member', memberId: 'p14', expertiseNeeded: [], expertiseOffered: ['Applied AI', 'Industrial deployment', 'Technical diligence'], companyStage: 'Series A through growth', companySize: 'Any', cadence: 'Quarterly', compensation: 'Equity acceptable', sector: 'Industrial software, manufacturing technology', geography: 'US', commitment: 'One additional board seat only', conflicts: ['No competitors of Cassian Labs'], proofNodeIds: ['pw6', 'pw7'], referralIds: ['rf3'], openness: 'Selective', visibility: 'network', createdAt: iso(-10) },
  { id: 'ba3', side: 'member', memberId: 'p3', expertiseNeeded: [], expertiseOffered: ['Manufacturing operations', 'Quoting discipline', 'Succession planning'], companyStage: 'Owner-operated, $10M–$100M revenue', companySize: '50–500 employees', cadence: 'Quarterly with a plant visit', compensation: 'Cash or equity', sector: 'Manufacturing, industrial services', geography: 'Midwest', commitment: 'Two seats maximum', conflicts: ['No direct competitors of ForgeLine'], proofNodeIds: ['pw1', 'pw2', 'pw8'], referralIds: ['rf1'], openness: 'Open', visibility: 'network', createdAt: iso(-26) },
  { id: 'ba4', side: 'company', memberId: 'p9', companyId: 'co-northwind', expertiseNeeded: ['Health-system commercial', 'Clinical operations', 'Regulatory'], expertiseOffered: [], companyStage: 'Series A', companySize: '2,400 employees served', cadence: 'Monthly during the raise', compensation: 'Advisory equity', sector: 'Healthcare', geography: 'US', commitment: 'Twenty hours a quarter', conflicts: ['No advisors to competing platforms'], proofNodeIds: [], referralIds: [], openness: 'Open', visibility: 'network', createdAt: iso(-8) },
]

/* ------------------------------------------ industry intelligence */

export const seedIndustryRooms: IndustryRoom[] = [
  { id: 'ir-industrial', name: 'Industrial Automation', industry: 'Manufacturing', premise: 'What is actually working on plant floors this quarter, and what stalled.', memberIds: ['p3', 'p14', 'p23', 'me', 'p7'], joined: true, charter: 'Firsthand observations only. Vendor pitches are removed.', createdAt: iso(-120) },
  { id: 'ir-pe', name: 'PE Operations', industry: 'Private equity', premise: 'Value creation as practised, not as presented in the deck.', memberIds: ['p2', 'p8', 'p21', 'me'], joined: true, charter: 'No deal marketing. Attribution stays inside the room.', createdAt: iso(-140) },
  { id: 'ir-health', name: 'Healthcare Systems', industry: 'Healthcare', premise: 'Throughput, staffing and the operational reality behind clinical software.', memberIds: ['p9', 'p17', 'p21'], joined: false, charter: 'Aggregate data only. No patient information.', createdAt: iso(-95) },
  { id: 'ir-logistics', name: 'Logistics Infrastructure', industry: 'Logistics', premise: 'Lanes, capacity and what carriers are quietly doing.', memberIds: ['p10', 'p22'], joined: false, charter: 'Name the source of every rate observation.', createdAt: iso(-80) },
  { id: 'ir-defense', name: 'Defense Supply Chain', industry: 'Defense', premise: 'Qualification, audits and the real cost of entry.', memberIds: ['p18', 'p16', 'p19'], joined: false, charter: 'Nothing controlled or export-restricted.', createdAt: iso(-70) },
  { id: 'ir-service', name: 'Service Business Growth', industry: 'Field services', premise: 'Pricing, dispatch and technician retention in service businesses.', memberIds: ['p7', 'p2', 'me'], joined: true, charter: 'Specific numbers or say you are guessing.', createdAt: iso(-60) },
  { id: 'ir-ai', name: 'Enterprise AI', industry: 'AI', premise: 'What survived contact with procurement and what did not.', memberIds: ['p14', 'p20', 'p5'], joined: false, charter: 'Post failures as readily as wins.', createdAt: iso(-50) },
]

export const seedIntelligenceItems: IndustryIntelligenceItem[] = [
  { id: 'ii1', roomId: 'ir-industrial', kind: 'Field observation', headline: 'Three fabricators cancelled vision projects after the pilot, not before', body: 'In all three cases the pilot passed and procurement stalled on who owned maintenance. The technology was never the blocker.', authorId: 'p14', provenance: 'Firsthand', evidence: 'Direct involvement in all three evaluations.', relatedIds: ['pw6'], when: iso(-3), scope: 'shareable' },
  { id: 'ii2', roomId: 'ir-industrial', kind: 'Open question', headline: 'Is anyone quoting under five days without adding headcount?', body: 'We got from eleven days to three but added two people. Curious whether anyone has done it without.', authorId: 'p3', provenance: 'Firsthand', evidence: 'Our own quote ageing data.', relatedIds: ['pw1'], when: iso(-6), scope: 'shareable' },
  { id: 'ii3', roomId: 'ir-industrial', kind: 'Emerging decision', headline: 'Retrofit pricing is moving from cost-plus to availability-based', body: 'Four operators in this room have shifted retrofit pricing toward uptime guarantees in the last two quarters.', authorId: 'p23', provenance: 'Derived', evidence: 'Pattern across four conversations in this room.', relatedIds: [], when: iso(-9), scope: 'shareable' },
  { id: 'ii4', roomId: 'ir-pe', kind: 'Field observation', headline: 'Operator placement is now the binding constraint, not price', body: 'Two of our last three platforms waited longer for a commercial leader than for financing.', authorId: 'p2', provenance: 'Firsthand', evidence: 'Internal deal timeline records.', relatedIds: ['cp1'], when: iso(-4), scope: 'shareable' },
  { id: 'ii5', roomId: 'ir-pe', kind: 'Opportunity', headline: 'Field-services platform needs an operating partner', body: 'Advisory role, two days a month, closed eleven days ago.', authorId: 'p2', provenance: 'Evidence-backed', evidence: 'Signed acquisition announcement.', relatedIds: ['op1'], when: iso(-11), scope: 'shareable' },
  { id: 'ii6', roomId: 'ir-health', kind: 'Knowledge asset', headline: 'Nine-site throughput study, full method', body: 'Capacity model, scheduling rules and the two changes that produced most of the 11% lift.', authorId: 'p17', provenance: 'Evidence-backed', evidence: 'Fourteen months of scheduling data.', relatedIds: ['ka1'], when: iso(-20), scope: 'public' },
  { id: 'ii7', roomId: 'ir-health', kind: 'Person worth knowing', headline: 'Clinical sponsor at a second system is briefed and interested', body: 'Migration freeze lifts in three weeks; the sponsor has already read the study.', authorId: 'p9', provenance: 'Firsthand', evidence: 'Direct conversation last week.', relatedIds: ['op3'], when: iso(-8), scope: 'shareable' },
  { id: 'ii8', roomId: 'ir-logistics', kind: 'Field observation', headline: 'A regional cold-chain carrier is exiting three Midwest lanes', body: 'Exit notice landed last week. Shippers on those lanes have about six weeks.', authorId: 'p10', provenance: 'Evidence-backed', evidence: 'Written carrier exit notice.', relatedIds: ['op7'], when: iso(-5), scope: 'shareable' },
  { id: 'ii9', roomId: 'ir-defense', kind: 'Open question', headline: 'What does first-article qualification really cost in engineering time?', body: 'Estimates I have been given range from four months to two years. I do not trust either end.', authorId: 'p18', provenance: 'Opinion', evidence: 'Conflicting vendor guidance.', relatedIds: ['cp4'], when: iso(-7), scope: 'shareable' },
  { id: 'ii10', roomId: 'ir-service', kind: 'Field observation', headline: 'First-time-fix moved 9 points when we stopped rewarding closed tickets', body: 'Changed the technician incentive from volume to resolution. Nine points in two quarters, no new hires.', authorId: 'p7', provenance: 'Firsthand', evidence: 'Internal dispatch reporting.', relatedIds: [], when: iso(-2), scope: 'shareable' },
  { id: 'ii11', roomId: 'ir-ai', kind: 'System', headline: 'Inspection models need an owner in maintenance, not in IT', body: 'Every deployment that survived a year had a maintenance owner named before go-live.', authorId: 'p14', provenance: 'Derived', evidence: 'Eleven deployments reviewed.', relatedIds: ['pw6'], when: iso(-11), scope: 'shareable' },
  { id: 'ii12', roomId: 'ir-service', kind: 'Intent', headline: 'Two owners in this room are quietly looking at succession', body: 'Neither wants a broker. Both would talk to an operator first.', authorId: 'me', provenance: 'Derived', evidence: 'Private conversations; identities withheld.', relatedIds: [], when: iso(-13), scope: 'private' },
]

/* ------------------------------------------------------- councils */

export const seedCouncils: PeerCouncil[] = [
  {
    id: 'pc-veteran', name: 'Veteran Founders Council', purpose: 'Founders with service backgrounds working through growth decisions without theatre.',
    basis: 'Level', confidentiality: 'Nothing said here leaves the council. No screenshots, no forwarding.',
    charter: 'Eight members maximum. One decision per member per quarter gets the room.',
    memberIds: ['me', 'p18', 'p19', 'p24'],
    invited: [{ memberId: 'p5', expertise: 'Fintech scaling', status: 'invited' }],
    missingExpertise: ['Regulatory and compliance', 'Federal contracting finance'],
    cadence: 'Monthly, ninety minutes',
    sharedQuestions: [{ id: 'cq1', memberId: 'p18', question: 'Do we chase defense qualification or double down on utility work?', when: iso(-6), responses: [{ memberId: 'p19', text: 'Qualification cost is usually underestimated by a factor of two. Model it at 18 months.' }] }],
    decisions: [{ id: 'cd1', record: 'Agreed the council will not review fundraising decks; that belongs in a capital conversation.', when: iso(-40) }],
    openLoops: [{ id: 'cl1', label: 'Find a regulatory advisor to invite', done: false }],
    advisorRequests: [{ id: 'ca1', need: 'Regulatory expertise for federal work', state: 'open' }],
    contributions: [{ id: 'cc1', memberId: 'p19', text: 'Shared the qualification cost model from two prior entries.', when: iso(-5) }],
    outcomes: ['One member avoided a two-year defense entry that would have failed on quality systems.'],
    joined: true, createdAt: iso(-200),
  },
  {
    id: 'pc-midwest', name: 'Midwest CEOs', purpose: 'Owner-operators between $20M and $150M revenue comparing real numbers.',
    basis: 'Geography', confidentiality: 'Numbers shared here are not repeated outside, including to advisors.',
    charter: 'Twelve members maximum. Bring a number or bring a question.',
    memberIds: ['p3', 'p12', 'p7', 'p22'],
    invited: [{ memberId: 'p24', expertise: 'Property services', status: 'invited' }],
    missingExpertise: ['Regulatory expertise', 'Capital markets'],
    cadence: 'Every six weeks, in person twice a year',
    sharedQuestions: [{ id: 'cq2', memberId: 'p3', question: 'What is a fair quote-desk headcount at $60M revenue?', when: iso(-12), responses: [{ memberId: 'p7', text: 'Two, if scheduling is separate. Three if the same team does both.' }] }],
    decisions: [{ id: 'cd2', record: 'Council agreed to share anonymised pricing benchmarks twice a year.', when: iso(-70) }],
    openLoops: [{ id: 'cl2', label: 'Collect the spring pricing benchmark', done: false }],
    advisorRequests: [],
    contributions: [{ id: 'cc2', memberId: 'p22', text: 'Shared procurement terms achieved with two regional carriers.', when: iso(-10) }],
    outcomes: ['Two members changed payment terms after seeing peer benchmarks.'],
    joined: true, createdAt: iso(-260),
  },
  {
    id: 'pc-peops', name: 'PE Operating Partners', purpose: 'Operating partners comparing value-creation practice across funds.',
    basis: 'Industry', confidentiality: 'No portfolio company names without permission.',
    charter: 'Ten members. No fundraising, no deal marketing.',
    memberIds: ['p2', 'p8', 'p21'],
    invited: [], missingExpertise: ['Human capital', 'Pricing science'],
    cadence: 'Monthly',
    sharedQuestions: [], decisions: [], openLoops: [],
    advisorRequests: [{ id: 'ca2', need: 'Pricing science practitioner', state: 'open' }],
    contributions: [], outcomes: [],
    joined: false, createdAt: iso(-150),
  },
  {
    id: 'pc-indai', name: 'Industrial AI Builders', purpose: 'People shipping AI into plants, comparing what survives production.',
    basis: 'Problem', confidentiality: 'Failure stories stay in the room unless the author publishes them.',
    charter: 'Six members. Every session opens with one thing that broke.',
    memberIds: ['p14', 'p23', 'p20'],
    invited: [], missingExpertise: ['Maintenance leadership', 'Safety systems'],
    cadence: 'Every three weeks',
    sharedQuestions: [], decisions: [], openLoops: [], advisorRequests: [], contributions: [], outcomes: [],
    joined: false, createdAt: iso(-100),
  },
]

/* ------------------------------------------------ events and travel */

export const seedEventPresence: EventPresence[] = [
  {
    id: 'ep1', eventName: 'Midwest Manufacturing Forum', city: 'Indianapolis, IN', dates: `${iso(12)} – ${iso(13)}`,
    optedIn: true, visibility: 'attendees',
    roster: [
      { memberId: 'p3', why: 'He is on the workforce panel and has the quoting data you keep citing.', mutualContext: 'You worked on the quoting rebuild together.' },
      { memberId: 'p23', why: 'Pricing retrofit lines is the exact question she brought to the intelligence room.', mutualContext: 'Both connected to Kenji Vale.', introducerId: 'p14' },
      { memberId: 'p22', why: 'He buys the capacity Mateo Quinn is trying to replace.', mutualContext: 'Shared Midwest CEOs council.' },
    ],
    intents: ['Meet two operators with quoting pain', 'Find one retrofit pricing conversation'],
    meetings: [{ id: 'em1', memberId: 'p3', when: 'Day one, 2:00 PM', state: 'confirmed' }, { id: 'em2', memberId: 'p23', when: 'Day one, 4:30 PM', state: 'suggested' }],
    handoffCode: 'AET-4821', captures: [], followUps: [], outcomes: [], createdAt: iso(-5),
  },
  {
    id: 'ep2', eventName: 'PE Value Creation Roundtable', city: 'Chicago, IL', dates: `${iso(-9)}`,
    optedIn: true, visibility: 'private',
    roster: [{ memberId: 'p2', why: 'She hosted the session on operator placement.', mutualContext: 'Two shared engagements.' }],
    intents: ['Understand how funds are handling operator shortages'],
    meetings: [{ id: 'em3', memberId: 'p2', when: 'After the session', state: 'met' }],
    handoffCode: 'AET-3390',
    captures: [{ id: 'ec1', memberId: 'p2', note: 'Operator placement is her binding constraint; she would take a warm operator referral before a search firm.', approved: false }],
    followUps: [{ id: 'ef1', memberId: 'p2', label: 'Send Mara Solis as a candidate for the field-services platform', done: false }],
    outcomes: [], createdAt: iso(-12),
  },
]

export const seedTravel: TravelPlan[] = [
  {
    id: 'tp1', city: 'Chicago, IL', from: iso(18), to: iso(20), purpose: 'Two operator conversations and one investor meeting.',
    visible: true,
    peopleWorthMeeting: [
      { memberId: 'p2', why: 'Her operator gap is your strongest referral opportunity this quarter.', path: 'Direct relationship' },
      { memberId: 'p8', why: 'Buying industrial services platforms in your sector; you know two owners considering transition.', path: 'Warm through Mina Park' },
      { memberId: 'p10', why: 'Lane redesign is live and you know a carrier buyer.', path: 'Warm through Micah Kone' },
    ],
    warmRelationshipIds: ['p2'], companyIds: ['co-northline'],
    circleActivity: ['PE Portfolio Revenue Systems has three active questions from Chicago members.'],
    events: ['Operators & Owners Dinner, evening of day two'],
    expertiseIds: ['ex3'], systemIds: ['sys-golden-report'],
    plan: [
      { id: 'tpl1', memberId: 'p2', slot: 'Day one, 9:00 AM', why: 'Bring the operator referral in person.', state: 'confirmed' },
      { id: 'tpl2', memberId: 'p8', slot: 'Day one, 3:00 PM', why: 'Ask what he needs before naming any owner.', state: 'suggested' },
      { id: 'tpl3', memberId: 'p10', slot: 'Day two, 8:30 AM', why: 'Carrier capacity introduction.', state: 'suggested' },
    ],
    createdAt: iso(-2),
  },
]

export const seedProAvailability: ProfessionalAvailability[] = [
  { id: 'pa1', memberId: 'me', status: 'Open to partnerships', detail: 'Two distribution conversations for the Golden Report, nothing else.', from: iso(-10), to: iso(50), visibility: 'network', audienceConstraint: 'Operators and advisory firms only', influencesMatching: true, active: true },
  { id: 'pa2', memberId: 'me', status: 'Not accepting sales outreach', detail: 'No vendor demos through March.', from: iso(-30), visibility: 'network', audienceConstraint: 'Everyone', influencesMatching: true, active: true },
  { id: 'pa3', memberId: 'p3', status: 'Open to board roles', detail: 'One additional seat, Midwest manufacturers only.', from: iso(-60), visibility: 'network', audienceConstraint: 'No direct competitors', influencesMatching: true, active: true },
  { id: 'pa4', memberId: 'p9', status: 'Raising capital', detail: 'Series A open, closing next quarter.', from: iso(-20), to: iso(70), visibility: 'connections', audienceConstraint: 'Investors with clinical experience', influencesMatching: true, active: true },
  { id: 'pa5', memberId: 'p8', status: 'Deploying capital', detail: 'Two industrial services platforms this year.', from: iso(-90), visibility: 'network', audienceConstraint: 'Warm introductions only', influencesMatching: true, active: true },
  { id: 'pa6', memberId: 'p12', status: 'Open to acquisition conversations', detail: 'Confidential. Identity is withheld until both sides approve.', from: iso(-4), visibility: 'private', audienceConstraint: 'Advisors and operators with construction experience', influencesMatching: true, active: true },
  { id: 'pa7', memberId: 'p14', status: 'Open to selective expert calls', detail: 'Two async reviews a month.', from: iso(-33), visibility: 'network', audienceConstraint: 'No vendors I advise', influencesMatching: true, active: true },
  { id: 'pa8', memberId: 'p17', status: 'Heads down until November', detail: 'Nine-site rollout. Warm introductions only, no new projects.', from: iso(-14), to: iso(90), visibility: 'network', audienceConstraint: 'Only warm introductions', influencesMatching: true, active: true },
  { id: 'pa9', memberId: 'p6', status: 'Hiring', detail: 'Plant controller, Indianapolis, on-site.', from: iso(-13), visibility: 'network', audienceConstraint: 'Referrals preferred', influencesMatching: true, active: true },
]

/* -------------------------------- pitch permission and boundaries */

export const seedPitchRequests: PitchPermissionRequest[] = [
  { id: 'pp1', requesterId: 'p5', recipientId: 'me', category: 'Software vendor', reason: 'We built reconciliation tooling and think your advisory clients need it.', whyRelevant: 'Two of your clients run multi-entity finance teams.', valueToRecipient: 'A named integration partner and a referral fee if it lands.', whyNow: 'We are choosing three partners this quarter.', evidence: ['$2.4M ARR, 140% net retention'], decision: 'pending', createdAt: iso(-2) },
  { id: 'pp2', requesterId: 'p6', recipientId: 'p3', category: 'Executive search', reason: 'We place plant controllers and you posted a controller need.', whyRelevant: 'You have an open controller seat with a ninety-day clock.', valueToRecipient: 'Two pre-qualified candidates with multi-plant close experience.', whyNow: 'The retirement date is fixed.', warmPath: 'Both connected to Mina Park', evidence: ['Placed four controllers in Indiana manufacturers'], decision: 'yes', createdAt: iso(-8), decidedAt: iso(-7) },
  { id: 'pp3', requesterId: 'p13', recipientId: 'p21', category: 'Fundraising ask', reason: 'Raising a seed round for a consumer brand.', whyRelevant: 'You invest early.', valueToRecipient: 'Early look at the round.', whyNow: 'Closing in six weeks.', evidence: [], decision: 'never-category', createdAt: iso(-16), decidedAt: iso(-16) },
  { id: 'pp4', requesterId: 'p20', recipientId: 'p14', category: 'Board inquiry', reason: 'Reconstituting our board and want a technical member who has shipped into plants.', whyRelevant: 'Your published deployment work is exactly the gap.', valueToRecipient: 'A real vote on the product roadmap and governance experience.', whyNow: 'The board is being set before the fiscal year.', warmPath: 'Shared circle: Industrial AI Builders', evidence: ['Board charter draft'], decision: 'not-now', revisitTrigger: 'After the Halden line stabilises in the spring', createdAt: iso(-11), decidedAt: iso(-10) },
]

export const seedBoundaries: ProfessionalBoundaryRule[] = [
  { id: 'bd1', memberId: 'me', label: 'No unsolicited demos', category: 'Software vendor', action: 'require-permission', explanation: 'Vendor conversations need a permission request with evidence first.', active: true, custom: false },
  { id: 'bd2', memberId: 'me', label: 'No agencies or recruiters', category: 'Executive search', action: 'block', explanation: 'Agency outreach is blocked. Referrals from members are welcome.', active: true, custom: false },
  { id: 'bd3', memberId: 'me', label: 'Warm introductions only for capital', category: 'Fundraising ask', action: 'reroute', rerouteTo: 'A mutual connection who can vouch for the fit', explanation: 'Capital conversations are routed through someone who knows both sides.', active: true, custom: false },
  { id: 'bd4', memberId: 'me', label: 'No outreach from unknown paths', category: 'Unknown path', action: 'require-permission', explanation: 'Members with no shared context need to explain relevance before messaging.', active: false, custom: false },
  { id: 'bd5', memberId: 'me', label: 'Board and advisory inquiries welcome', category: 'Board inquiry', action: 'reroute', rerouteTo: 'Your advisory availability window', explanation: 'Board inquiries go straight to the availability window rather than the inbox.', active: true, custom: true },
  { id: 'bd6', memberId: 'p17', label: 'Only warm introductions until November', category: 'Any outreach', action: 'require-permission', explanation: 'Heads down on a rollout; warm paths only.', active: true, custom: false },
  { id: 'bd7', memberId: 'p21', label: 'No consumer fundraising asks', category: 'Fundraising ask', action: 'block', explanation: 'Outside the thesis. Blocked rather than ignored.', active: true, custom: true },
]

/* ------------------------------------------- import and vault */

export const seedImports: ImportBatch[] = [
  { id: 'ib1', source: 'CSV', state: 'available', connected: true, fileName: 'operator-contacts-sample.csv', rowCount: 42, note: 'Demo file. Nothing is created until you approve each row.', createdAt: iso(-1) },
  { id: 'ib2', source: 'Calendar', state: 'not-connected', connected: false, rowCount: 0, note: 'No calendar provider is connected in this preview.', createdAt: iso(-1) },
  { id: 'ib3', source: 'CRM', state: 'not-connected', connected: false, rowCount: 0, note: 'No CRM is connected. The adapter is ready when you connect one.', createdAt: iso(-1) },
  { id: 'ib4', source: 'LinkedIn export', state: 'available', connected: true, fileName: 'connections-export-sample.csv', rowCount: 118, note: 'Demo export. Review before anything enters your graph.', createdAt: iso(-1) },
  { id: 'ib5', source: 'Meeting history', state: 'committed', connected: true, rowCount: 9, reviewedAt: iso(-30), committedAt: iso(-30), note: 'Nine meetings reviewed and accepted last month.', createdAt: iso(-31) },
  { id: 'ib6', source: 'Email', state: 'not-connected', connected: false, rowCount: 0, note: 'Email is not connected. Aetheris never reads mail without an explicit connection.', createdAt: iso(-1) },
]

/* -------------------------------------- professional inbox decisions */

export const seedInboxDecisions: ProfessionalInboxDecision[] = [
  { id: 'pd1', bucket: 'DECIDE', kind: 'pitch permission', headline: 'Rohan Vey is asking permission to pitch reconciliation tooling', detail: 'Category: software vendor. He has named the value and the timing.', memberId: 'p5', targetPage: 'pitch', consequence: 'A yes opens a commercial conversation. A never closes the category permanently.', due: iso(3), state: 'open', createdAt: iso(-2) },
  { id: 'pd2', bucket: 'DECIDE', kind: 'deal decision', headline: 'Publication rights question is blocking the Northwind scope', detail: 'Legal sign-off on shared publication rights is unanswered.', targetPage: 'dealrooms', targetId: 'dr1', consequence: 'The scope cannot go out until this is answered.', due: iso(4), state: 'open', createdAt: iso(-3) },
  { id: 'pd3', bucket: 'DECIDE', kind: 'intro approval', headline: 'Bergeron transition needs a concierge decision before any identity is revealed', detail: 'A human reviewer has the sector and size band, not the company name.', targetPage: 'concierge', targetId: 'hc1', consequence: 'Revealing identity early would be irreversible.', due: iso(7), state: 'open', createdAt: iso(-4) },
  { id: 'pd4', bucket: 'RESPOND', kind: 'expert request', headline: 'Astrid Dahl needs two hours on retrofit pricing', detail: 'Her pricing decision goes to the executive team in two weeks.', memberId: 'p23', targetPage: 'opportunities', targetId: 'op8', consequence: 'A short answer now is worth more than a long one later.', due: iso(5), state: 'open', createdAt: iso(-2) },
  { id: 'pd5', bucket: 'RESPOND', kind: 'message', headline: 'Mara Solis asked a direct question about the platform reporting cadence', detail: 'She is deciding whether to put her name forward for the operating role.', memberId: 'p7', targetPage: 'messages', consequence: 'She will not chase you twice.', due: iso(2), state: 'open', createdAt: iso(-1) },
  { id: 'pd6', bucket: 'MOVE', kind: 'opportunity', headline: 'Send Mara Solis to Mina Park for the field-services platform', detail: 'You have both sides of this and neither has moved.', memberId: 'p2', targetPage: 'opportunities', targetId: 'op1', consequence: 'This is the highest-value move available to you this week.', due: iso(6), state: 'open', createdAt: iso(-3) },
  { id: 'pd7', bucket: 'MOVE', kind: 'relationship', headline: 'Nolan Pierce offered two peer introductions eighty-four days ago', detail: 'The offer was never taken up. It is still warm but cooling.', memberId: 'p3', targetPage: 'discover', consequence: 'Unused offers quietly expire.', state: 'open', createdAt: iso(-8) },
  { id: 'pd8', bucket: 'WAIT', kind: 'commitment', headline: 'Waiting on Northwind IT for the data access path', detail: 'Confirmed as the next step six days ago.', targetPage: 'dealrooms', targetId: 'dr1', consequence: 'Nothing for you to do until they answer.', due: iso(9), state: 'waiting', createdAt: iso(-6) },
  { id: 'pd9', bucket: 'WAIT', kind: 'intro approval', headline: 'Kenji Vale has not yet decided on the board inquiry', detail: 'He asked to revisit after the Halden line stabilises.', memberId: 'p14', targetPage: 'boardmarket', consequence: 'Revisit in the spring, not before.', state: 'waiting', createdAt: iso(-10) },
  { id: 'pd10', bucket: 'FYI', kind: 'fyi', headline: 'A cold-chain carrier exited three Midwest lanes', detail: 'Relevant to two people in your network, not to you directly.', targetPage: 'rooms', consequence: 'No action needed. Useful if someone asks.', state: 'open', createdAt: iso(-5) },
  { id: 'pd11', bucket: 'FYI', kind: 'fyi', headline: 'Kenji Vale published a failure analysis of eleven stalled AI deployments', detail: 'From someone you trust, in a sector you sell into.', memberId: 'p14', targetPage: 'knowledgeassets', consequence: 'Worth ten minutes when you have them.', state: 'open', createdAt: iso(-11) },
]

/* ------------------------------------------------------ transactions */

export const seedTransactions: TransactionRecord[] = [
  { id: 'tx1', dealRoomId: 'dr1', opportunityId: 'op3', kind: 'Scope', title: 'Twelve-week clinical pilot scope', parties: ['me', 'p9', 'p17'], summary: 'Twelve weeks, one clinical sponsor, aggregate scheduling data, shared publication rights.', signatureState: 'awaiting-signature', signatureNote: 'No signature provider is connected. Status is tracked manually.', createdAt: iso(-6) },
  { id: 'tx2', dealRoomId: 'dr1', kind: 'NDA', title: 'Mutual NDA, pilot data', parties: ['me', 'p9'], summary: 'Covers scheduling data and unpublished model detail.', signatureState: 'signed', signatureNote: 'Recorded manually by both parties on the pilot call.', createdAt: iso(-11) },
  { id: 'tx3', kind: 'Introduction record', title: 'Introduction: ForgeLine to Northline operating team', parties: ['me', 'p3', 'p2'], summary: 'Double opt-in introduction with a two-page context memo. Both parties accepted.', signatureState: 'not-sent', signatureNote: 'Record only. No agreement attached.', createdAt: iso(-84) },
  { id: 'tx4', kind: 'Referral agreement', title: 'Referral terms with Raghavan Advisory', parties: ['me', 'p11'], summary: '10% of first-year fees on referred engagements, twelve-month term.', amount: '10% of first-year fees', signatureState: 'signed', signatureNote: 'Signed copy held by both firms.', createdAt: iso(-70) },
]

/* ------------------------------------------------------ marketplace */

export const seedMarketplace: MarketplaceListing[] = [
  { id: 'ml1', memberId: 'p3', kind: 'Operator', headline: 'Quoting and estimating rebuilds for fabricators', offer: 'Diagnostic plus a ninety-day rebuild plan with your team, not a report.', industries: ['Manufacturing'], geography: 'Midwest', proofNodeIds: ['pw1', 'pw2'], referralIds: ['rf1'], outcomesCreated: 4, availabilityId: 'pa3', rationale: 'Direct relationship, evidence-backed outcome in your exact problem, and a strong referral from someone you trust.', visibility: 'network', createdAt: iso(-40) },
  { id: 'ml2', memberId: 'p14', kind: 'Advisor', headline: 'Technical diligence on industrial AI projects', offer: 'Written verdict on whether a vision project will survive production.', industries: ['AI', 'Manufacturing'], geography: 'Global', proofNodeIds: ['pw6', 'pw7'], referralIds: ['rf3'], outcomesCreated: 3, availabilityId: 'pa7', rationale: 'Two granted patents, a published failure analysis, and a referral from a plant leader who worked with him.', visibility: 'network', createdAt: iso(-33) },
  { id: 'ml3', memberId: 'p17', kind: 'Specialist', headline: 'Clinical capacity and throughput modelling', offer: 'Capacity model and scheduling rules with a measured lift target.', industries: ['Healthcare'], geography: 'US', proofNodeIds: ['pw3', 'pw12'], referralIds: ['rf5'], outcomesCreated: 2, availabilityId: 'pa8', rationale: 'Evidence-backed nine-site study and a peer referral. Currently heads down, so warm paths only.', visibility: 'network', createdAt: iso(-22) },
  { id: 'ml4', memberId: 'p19', kind: 'Provider', headline: 'Federal contracting entry advisory', offer: 'Qualification cost model and a go or no-go recommendation in three weeks.', industries: ['Defense', 'Professional services'], geography: 'US', proofNodeIds: [], referralIds: ['rf7'], outcomesCreated: 1, rationale: 'Two mutual connections, and she has taken two companies through qualification.', visibility: 'network', createdAt: iso(-18) },
  { id: 'ml5', memberId: 'p11', kind: 'Service', headline: 'Relationship operations for advisory firms', offer: 'Installs the follow-up discipline partners never keep on their own.', industries: ['Professional services'], geography: 'Global', proofNodeIds: [], referralIds: ['rf6'], outcomesCreated: 2, rationale: 'Ran a paid pilot with you; the outcome is recorded in your own ledger.', visibility: 'network', createdAt: iso(-25) },
  { id: 'ml6', memberId: 'p10', kind: 'Operator', headline: 'Lane redesign after a carrier exit', offer: 'Rebuilds coverage on affected lanes inside six weeks.', industries: ['Logistics'], geography: 'Midwest', proofNodeIds: [], referralIds: [], outcomesCreated: 2, rationale: 'Live experience with the exact carrier exit affecting your network right now.', visibility: 'network', createdAt: iso(-5) },
]

/* -------------------------------------------------- knowledge assets */

export const seedKnowledgeAssets: KnowledgeAsset[] = [
  { id: 'ka1', authorId: 'p17', kind: 'Research', title: 'Nine-site clinical throughput study', summary: 'What produced an 11% lift in completed visits across nine ambulatory sites.', body: 'Two changes carried most of the result: template rebuilds by appointment type, and moving pre-visit work off the clinical team. Fourteen months of scheduling data, including the two sites where it did not work.', contributorIds: ['p9'], provenance: 'Evidence-backed', evidence: 'Fourteen months of scheduling data, internally audited.', revisions: [{ id: 'kr1', note: 'Added the two sites where the model underperformed.', when: iso(-20) }], industries: ['Healthcare'], audience: 'Ambulatory operations leaders', visibility: 'public', systemIds: ['sys-clinical-throughput'], outcomeIds: ['out5'], companyIds: ['co-northwind'], proofNodeIds: ['pw3'], createdAt: iso(-60), updatedAt: iso(-20) },
  { id: 'ka2', authorId: 'p14', kind: 'Lesson from execution', title: 'Why factory AI pilots stall after they succeed', summary: 'Eleven deployments reviewed. The technology was almost never the blocker.', body: 'Nine of eleven stalled on maintenance ownership. Name the maintenance owner before go-live or the model dies quietly within a year.', contributorIds: ['p23'], provenance: 'Firsthand', evidence: 'Direct involvement in all eleven evaluations.', revisions: [], industries: ['AI', 'Manufacturing'], audience: 'Plant leadership and technical buyers', visibility: 'public', systemIds: [], outcomeIds: [], companyIds: [], proofNodeIds: ['pw6', 'pw7'], createdAt: iso(-45), updatedAt: iso(-45) },
  { id: 'ka3', authorId: 'p3', kind: 'Playbook', title: 'Quote turnaround: eleven days to three', summary: 'The sequence we used, including the two things we tried first that failed.', body: 'Quote desk before software. Publish ageing weekly. Kill the estimator queue. We added two people; a smaller shop probably cannot skip that.', contributorIds: [], provenance: 'Firsthand', evidence: 'Fourteen months of quote ageing data.', revisions: [{ id: 'kr2', note: 'Added the failed attempts.', when: iso(-30) }], industries: ['Manufacturing'], audience: 'Owners and plant managers', visibility: 'network', systemIds: [], outcomeIds: ['out1'], companyIds: ['co-forgeline'], proofNodeIds: ['pw1'], createdAt: iso(-70), updatedAt: iso(-30) },
  { id: 'ka4', authorId: 'me', kind: 'Framework', title: 'Which relationships to keep warm in a busy quarter', summary: 'A triage method for operators with more relationships than time.', body: 'Three questions per relationship: is something moving, do I owe them, and would silence cost anything. Everything else rests without guilt.', contributorIds: ['p11'], provenance: 'Derived', evidence: 'Pattern across fourteen introductions and two paid pilots.', revisions: [], industries: ['Professional services', 'Industrial services'], audience: 'Founders and operators', visibility: 'network', systemIds: ['sys-golden-report'], outcomeIds: ['out3'], companyIds: [], proofNodeIds: ['pw10'], createdAt: iso(-35), updatedAt: iso(-35) },
  { id: 'ka5', authorId: 'p18', kind: 'Briefing', title: 'Interconnection queue realities, 2026', summary: 'What the queue reform actually changed for developers.', body: 'Cluster studies moved the bottleneck rather than removing it. Site control now matters more than filing date in two of three regions.', contributorIds: ['p16'], provenance: 'Firsthand', evidence: 'Three utility processes worked directly.', revisions: [], industries: ['Energy'], audience: 'Developers and financing partners', visibility: 'network', systemIds: [], outcomeIds: [], companyIds: [], proofNodeIds: ['pw11'], createdAt: iso(-25), updatedAt: iso(-25) },
  { id: 'ka6', authorId: 'p2', kind: 'Analysis', title: 'Operator placement is the binding constraint', summary: 'Why our platforms now wait longer for a commercial leader than for financing.', body: 'Across three platforms the operator search took 4.2 months against 2.1 for financing. Warm operator referrals closed in six weeks.', contributorIds: [], provenance: 'Evidence-backed', evidence: 'Internal deal timeline records across three platforms.', revisions: [], industries: ['Private equity', 'Field services'], audience: 'Operating partners and operators', visibility: 'network', systemIds: [], outcomeIds: [], companyIds: ['co-northline'], proofNodeIds: ['pw10'], createdAt: iso(-15), updatedAt: iso(-15) },
]

/* ------------------------------------------------------- concierge */

export const seedConcierge: HumanConciergeReview[] = [
  { id: 'hc1', subject: 'Bergeron transition: whether to reveal identity to a buyer', kind: 'Acquisition', aboutMemberIds: ['p12', 'p8'], reviewerId: 'p19', reviewerRole: 'Trusted advisor to the owner', decisionRequested: 'Is this buyer the right first conversation, and should identity be revealed now or after a structure is modelled?', visibleToReviewer: ['Sector and size band', 'Structure preference', 'Buyer thesis and financing status'], withheldFromReviewer: ['Company identity', 'Family governance memo', 'Owner private notes'], preparedWording: 'A third-generation commercial contractor in the Northeast is exploring a partial recapitalisation with family continuity. No banker, no process. They would speak with one buyer who has done owner rollover well.', reviewerNote: '', state: 'Human Review Requested', createdAt: iso(-4), updatedAt: iso(-4) },
  { id: 'hc2', subject: 'Introduce Mara Solis for the field-services operating role', kind: 'Introduction', aboutMemberIds: ['p7', 'p2'], reviewerId: 'p3', reviewerRole: 'Knows both parties professionally', decisionRequested: 'Is the timing right, and is the wording fair to both sides?', visibleToReviewer: ['Both public passports', 'The role and cadence', 'The proposed wording'], withheldFromReviewer: ['Mara Solis private notes', 'Compensation discussion'], preparedWording: 'Mara runs 400 technicians across four states and rebuilt dispatch without new headcount. Mina needs a commercial leader for a platform that closed eleven days ago. Both are comfortable with a two-day-a-month start.', reviewerNote: 'Wording is fair. I would send it this week, before the integration plan is written.', state: 'Approved to Introduce', createdAt: iso(-6), updatedAt: iso(-2) },
  { id: 'hc3', subject: 'Capital introduction: Northwind to a healthcare lead', kind: 'Capital', aboutMemberIds: ['p9', 'p21'], reviewerId: 'p17', reviewerRole: 'Clinical operator who has reviewed the evidence', decisionRequested: 'Does the clinical evidence hold up well enough to put in front of a lead investor?', visibleToReviewer: ['The study', 'Round state as disclosed', 'Thesis fit note'], withheldFromReviewer: ['Soft-circle detail', 'Other investor names'], preparedWording: 'Northwind has a nine-site study with an 11% lift and a second system in pilot. Elise leads clinical software rounds where the buyer already has the budget line.', reviewerNote: 'The evidence holds. Say plainly that the second system has not started yet.', state: 'Needs More Context', createdAt: iso(-9), updatedAt: iso(-5) },
]

export const seedStandard: AetherisStandardAcceptance[] = [
  {
    id: 'as1', memberId: 'me', version: '2026.1',
    principles: [
      'Real identity. You are who you say you are, and it is checkable.',
      'Real work. Claims carry evidence, or they are marked as self-stated.',
      'Real context. What you share about a relationship is scoped, not broadcast.',
      'Respect attention. Reaching someone is a request, not a right.',
      'Give before asking. The first move creates value for the other person.',
      'No mass outreach. One message to fifty people is not networking.',
      'No fake expertise. Say what you have not done.',
      'No spam. Commercial intent is declared, not disguised.',
      'No hollow networking. Every introduction has a reason both sides can read.',
    ],
    accepted: true, acceptedAt: iso(-120),
    note: 'Accepted at onboarding. Referenced whenever a boundary or permission decision is made.',
  },
]
