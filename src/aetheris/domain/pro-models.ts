/**
 * Aetheris Intros — professional layer domain models.
 *
 * Storage-agnostic, exactly like ./models.ts, ./os-models.ts and
 * ./moat-models.ts. The preview runs on the local adapter (localStorage +
 * seeded demo content); a Postgres / Supabase adapter maps the same shapes
 * onto the tables declared in ./schema.sql without any surface change.
 *
 * Every derived record keeps sourceType, confidence, evidenceIds and a
 * privacy scope so nothing inferred is ever presented as recorded fact.
 */
import type { PrivacyScope } from '../types'
import type { ID, SourceType, ValueState, Visibility } from './models'
import type { VerificationState } from './moat-models'

export type Provenanced = {
  sourceType: SourceType
  confidence: number
  evidenceIds: ID[]
  scope: PrivacyScope
}

/* ------------------------------------------------- 1. identity passport */

export type CredentialKind =
  | 'Credential' | 'Certification' | 'License' | 'Board role' | 'Advisory role'
  | 'Investment' | 'Publication' | 'Patent' | 'Research' | 'Speaking'
  | 'Public service' | 'Prior role' | 'Work sample'

export interface PassportCredential {
  id: ID
  memberId: ID
  kind: CredentialKind
  title: string
  organization: string
  detail: string
  from: string
  to?: string
  state: VerificationState
  verifiedBy?: string
  evidenceIds: ID[]
  scope: PrivacyScope
}

export type ContactPreference =
  | 'Warm introductions only' | 'Direct message welcome' | 'Advisory and board inquiries'
  | 'Selective expert calls' | 'No sales outreach' | 'Partnership conversations'
  | 'Capital conversations' | 'Confidential owner conversations'

export interface ProfessionalPassportProfile {
  id: ID
  memberId: ID
  identityState: VerificationState
  identityNote: string
  headline: string
  credibilitySummary: string
  functionalExpertise: string[]
  industries: string[]
  contactPreferences: ContactPreference[]
  fieldScopes: Record<string, PrivacyScope>
  outcomesCreated: number
  introductionsCompleted: number
  referencesVerified: number
  updatedAt: string
}

/* --------------------------------------------- 2. proof-of-work graph */

export type ProofNodeKind =
  | 'Person' | 'Project' | 'Company' | 'System' | 'Outcome' | 'Team'
  | 'Introduction' | 'Investment' | 'Board' | 'Publication' | 'Reference'

export interface ProofOfWorkNode {
  id: ID
  kind: ProofNodeKind
  label: string
  memberIds: ID[]
  companyId?: ID
  systemId?: ID
  outcomeId?: ID
  role: string
  contribution: string
  from: string
  to?: string
  collaboratorIds: ID[]
  evidence: string
  state: VerificationState
  provenance: Provenanced
}

export type ProofEdgeKind =
  | 'contributed-to' | 'delivered' | 'introduced' | 'advised' | 'invested-in'
  | 'authored' | 'referenced' | 'produced-outcome' | 'served-on'

export interface ProofOfWorkEdge {
  id: ID
  fromId: ID
  toId: ID
  kind: ProofEdgeKind
  note: string
  provenance: Provenanced
}

/* ------------------------------------ 3. contextual reputation */

export interface ContextualReputation {
  id: ID
  memberId: ID
  context: string
  bestFor: string
  trustedIn: string[]
  provenWith: string[]
  outcomesCreated: number
  introQuality: number
  referralStrength: number
  evidenceIds: ID[]
  proofNodeIds: ID[]
  scope: PrivacyScope
  sourceType: SourceType
  confidence: number
}

/* ------------------------------------ 4. opportunity exchange */

export type OpportunityKind =
  | 'Partnership' | 'Advisory role' | 'Board seat' | 'Acquisition' | 'Succession'
  | 'Hiring' | 'Investment' | 'Distribution' | 'Pilot' | 'Consulting'
  | 'Supplier relationship' | 'Licensing' | 'Speaking' | 'Joint venture'
  | 'Strategic introduction' | 'Expert request' | 'Capital deployment'

export type OpportunityStatus = 'open' | 'in-conversation' | 'room-open' | 'deal-room' | 'expired' | 'closed'

export interface ProfessionalOpportunity {
  id: ID
  ownerId: ID
  title: string
  kind: OpportunityKind
  objective: string
  whoItIsFor: string
  qualification: string[]
  whatIsNeeded: string
  whatIsOffered: string
  mutualValue: string
  whyNow: string
  expiresOn: string
  visibility: Visibility
  confidential: boolean
  companyId?: ID
  personIds: ID[]
  systemIds: ID[]
  circleIds: ID[]
  strategyId?: ID
  outcomeId?: ID
  evidence: string[]
  interest: Array<{ memberId: ID; note: string; when: string; state: 'interested' | 'question' | 'warm-path' }>
  questions: Array<{ id: ID; memberId: ID; question: string; answer?: string; when: string }>
  saved: boolean
  roomId?: ID
  dealRoomId?: ID
  status: OpportunityStatus
  createdAt: string
}

/* ------------------------------------------------------ 5. deal rooms */

export type DealStage =
  | 'Evaluating' | 'Discussing' | 'Diligence' | 'Structuring' | 'Reviewing'
  | 'Approved' | 'Signed' | 'Paused' | 'Closed'

export interface DealMilestone {
  id: ID
  label: string
  owner: string
  due: string
  done: boolean
}

export interface DealRoom {
  id: ID
  name: string
  opportunityId?: ID
  stage: DealStage
  partyIds: ID[]
  companyIds: ID[]
  originatingPath: string
  systemIds: ID[]
  threadIds: ID[]
  meetingIds: ID[]
  files: Array<{ id: ID; label: string; kind: 'reference' | 'placeholder'; note: string }>
  evidenceIds: ID[]
  diligence: Array<{ id: ID; question: string; owner: string; answer?: string; state: 'open' | 'answered' }>
  openLoops: Array<{ id: ID; label: string; done: boolean }>
  decisions: Array<{ id: ID; record: string; when: string; by: string }>
  permissions: Array<{ memberId: ID; canSee: string; cannotSee: string }>
  milestones: DealMilestone[]
  transactionIds: ID[]
  nextAction: string
  valueState: ValueState
  modeledValue?: string
  outcome: string
  privateNote: string
  createdAt: string
}

/* --------------------------------------------- 6. expertise exchange */

export type ExpertiseTerms = 'Free' | 'Paid' | 'Selective' | 'Invite only'

export interface ExpertiseOffer {
  id: ID
  memberId: ID
  topic: string
  offer: string
  audience: string
  format: '30 minute call' | 'Async review' | 'Working session' | 'Written response' | 'Site visit'
  availability: string
  durationMinutes: number
  constraints: string
  terms: ExpertiseTerms
  proofNodeIds: ID[]
  industries: string[]
  geography: string
  visibility: Visibility
  expiresOn: string
  requests: Array<{ id: ID; memberId: ID; context: string; state: 'requested' | 'scheduled' | 'answered' | 'declined'; when: string }>
  saved: boolean
  createdAt: string
}

/* --------------------------------------- 7. professional referrals */

export type ReferralCategory =
  | 'Trust with a client' | 'Would hire' | 'Would introduce' | 'Would call for this problem'

export interface ProfessionalReferral {
  id: ID
  refereeId: ID
  referrerId: ID
  category: ReferralCategory
  context: string
  strength: 'Strong' | 'Confident' | 'Qualified'
  evidence: string
  relationshipBasis: string
  when: string
  reconfirmBy: string
  scope: PrivacyScope
  shareable: boolean
}

/* ------------------------------------- 8. verified introducer status */

export interface IntroducerRecord {
  id: ID
  memberId: ID
  introsMade: number
  accepted: number
  conversationsStarted: number
  contextUsefulness: number
  continuedRelationships: number
  opportunitiesCreated: number
  outcomesCreated: number
  declinePattern: string
  typicalResponseHours: number
  introStyle: string
  bestFor: string[]
  note: string
  scope: PrivacyScope
}

/* ------------------------------- 9. talent without job boards */

export type CapabilityKind =
  | 'Problem to solve' | 'Capability gap' | 'Leadership gap' | 'Project need'
  | 'Advisory need' | 'Fractional leadership' | 'Specialist need'

export type CapabilityPath = 'Executive' | 'Operator' | 'Advisor' | 'Consultant' | 'Specialist' | 'Fractional' | 'Project team'

export interface CapabilityProblem
{
  id: ID
  ownerId: ID
  companyId?: ID
  confidentialCompany: boolean
  title: string
  kind: CapabilityKind
  problem: string
  whyItMatters: string
  whatGoodLooksLike: string
  constraints: string
  paths: CapabilityPath[]
  industries: string[]
  geography: string
  visibility: Visibility
  systemIds: ID[]
  status: 'open' | 'exploring' | 'team-built' | 'closed'
  createdAt: string
}

/* --------------------------------------- 10. project team builder */

export interface SuggestedTeam {
  id: ID
  problemId?: ID
  objective: string
  roles: Array<{ memberId: ID; role: string; why: string; path: string; proofNodeIds: ID[] }>
  systemIds: ID[]
  circleIds: ID[]
  strongestPath: string
  saved: boolean
  invited: ID[]
  createdAt: string
}

/* ----------------------------------- 11. capital relationship layer */

export interface CapitalProfile {
  id: ID
  memberId: ID
  side: 'investor' | 'company'
  thesis: string
  stages: string[]
  sectors: string[]
  geography: string
  checkRange?: string
  leadPreference?: 'Lead' | 'Follow' | 'Either'
  tractionExpectation?: string
  raisePurpose?: string
  traction?: string
  useOfFunds?: string
  roundState?: string
  desiredInvestorProfile?: string
  timing: string
  openness: 'Open now' | 'Selective' | 'Closed for now'
  introPreference: string
  exclusions: string[]
  warmPaths: ID[]
  scope: PrivacyScope
  updatedAt: string
}

/* ------------------------------ 12. acquisition / succession layer */

export interface AcquisitionIntent {
  id: ID
  memberId: ID
  role: 'Owner' | 'Buyer' | 'Operator' | 'Successor' | 'Advisor' | 'Financing partner'
  interestLevel: 'Exploring' | 'Serious' | 'Under agreement'
  confidential: boolean
  identityRevealed: boolean
  timeline: string
  sector: string
  geography: string
  sizeBand: string
  companyCharacteristics: string
  structurePreference: string
  operatorNeed: string
  financingNeed: string
  advisorIds: ID[]
  trustedPathIds: ID[]
  evidence: string[]
  approvals: Array<{ memberId: ID; approved: boolean; when: string }>
  conciergeReviewId?: ID
  scope: PrivacyScope
  createdAt: string
}

/* ---------------------------------- 13. board & advisory marketplace */

export interface BoardAdvisoryIntent {
  id: ID
  side: 'company' | 'member'
  memberId: ID
  companyId?: ID
  expertiseNeeded: string[]
  expertiseOffered: string[]
  companyStage: string
  companySize: string
  cadence: string
  compensation: string
  sector: string
  geography: string
  commitment: string
  conflicts: string[]
  proofNodeIds: ID[]
  referralIds: ID[]
  openness: 'Open' | 'Selective' | 'Closed'
  visibility: Visibility
  createdAt: string
}

/* ------------------------------ 14. industry intelligence rooms */

export type SignalProvenance = 'Firsthand' | 'Evidence-backed' | 'Derived' | 'Opinion' | 'Unknown'

export interface IndustryIntelligenceItem {
  id: ID
  roomId: ID
  kind: 'Field observation' | 'Open question' | 'Opportunity' | 'System' | 'Intent' | 'Person worth knowing' | 'Event' | 'Emerging decision' | 'Knowledge asset'
  headline: string
  body: string
  authorId: ID
  provenance: SignalProvenance
  evidence: string
  relatedIds: ID[]
  when: string
  scope: PrivacyScope
}

export interface IndustryRoom {
  id: ID
  name: string
  industry: string
  premise: string
  memberIds: ID[]
  joined: boolean
  charter: string
  createdAt: string
}

/* ------------------------------------------ 16. private peer councils */

export interface PeerCouncil {
  id: ID
  name: string
  purpose: string
  basis: 'Level' | 'Industry' | 'Geography' | 'Problem' | 'Objective'
  confidentiality: string
  charter: string
  memberIds: ID[]
  invited: Array<{ memberId: ID; expertise: string; status: 'invited' | 'accepted' | 'declined' }>
  missingExpertise: string[]
  cadence: string
  sharedQuestions: Array<{ id: ID; memberId: ID; question: string; when: string; responses: Array<{ memberId: ID; text: string }> }>
  decisions: Array<{ id: ID; record: string; when: string }>
  openLoops: Array<{ id: ID; label: string; done: boolean }>
  advisorRequests: Array<{ id: ID; need: string; state: 'open' | 'filled' }>
  contributions: Array<{ id: ID; memberId: ID; text: string; when: string }>
  outcomes: string[]
  joined: boolean
  createdAt: string
}

/* ----------------------------- 17 + 18. event presence and travel */

export interface EventPresence {
  id: ID
  eventName: string
  city: string
  dates: string
  optedIn: boolean
  visibility: 'private' | 'attendees' | 'network'
  roster: Array<{ memberId: ID; why: string; mutualContext: string; introducerId?: ID }>
  intents: string[]
  meetings: Array<{ id: ID; memberId: ID; when: string; state: 'suggested' | 'requested' | 'confirmed' | 'met' }>
  handoffCode: string
  captures: Array<{ id: ID; memberId: ID; note: string; approved: boolean }>
  followUps: Array<{ id: ID; memberId: ID; label: string; done: boolean }>
  outcomes: string[]
  createdAt: string
}

export interface TravelPlan {
  id: ID
  city: string
  from: string
  to: string
  purpose: string
  visible: boolean
  peopleWorthMeeting: Array<{ memberId: ID; why: string; path: string }>
  warmRelationshipIds: ID[]
  companyIds: ID[]
  circleActivity: string[]
  events: string[]
  expertiseIds: ID[]
  systemIds: ID[]
  plan: Array<{ id: ID; memberId: ID; slot: string; why: string; state: 'suggested' | 'requested' | 'confirmed' }>
  createdAt: string
}

/* ------------------------------ 19. professional availability status */

export interface ProfessionalAvailability {
  id: ID
  memberId: ID
  status: string
  detail: string
  from: string
  to?: string
  visibility: Visibility
  audienceConstraint: string
  influencesMatching: boolean
  active: boolean
}

/* ------------------------ 20 + 21. permission to pitch and boundaries */

export type PitchDecision = 'pending' | 'yes' | 'not-now' | 'refer' | 'never-category'

export interface PitchPermissionRequest {
  id: ID
  requesterId: ID
  recipientId: ID
  category: string
  reason: string
  whyRelevant: string
  valueToRecipient: string
  whyNow: string
  warmPath?: string
  evidence: string[]
  decision: PitchDecision
  revisitTrigger?: string
  referredTo?: string
  reviewId?: ID
  createdAt: string
  decidedAt?: string
}

export interface ProfessionalBoundaryRule
{
  id: ID
  memberId: ID
  label: string
  category: string
  action: 'block' | 'require-permission' | 'reroute'
  rerouteTo?: string
  explanation: string
  active: boolean
  custom: boolean
}

/* ------------------------------- 22. universal professional search */

export type SearchObjectKind =
  | 'Person' | 'Company' | 'System' | 'Circle' | 'Intent' | 'Opportunity'
  | 'Proof of work' | 'Expertise' | 'Event' | 'Outcome' | 'Board seat'
  | 'Capital' | 'Talent problem' | 'Knowledge' | 'Room'

export interface UniversalSearchResult {
  id: ID
  kind: SearchObjectKind
  label: string
  sub: string
  why: string
  score: number
  memberId?: ID
  targetPage?: string
  targetId?: ID
  blockedBy?: string
  scope: PrivacyScope
}

/* --------------------------------------- 23. import without lock-in */

export type ImportSource = 'Contacts' | 'Calendar' | 'Email' | 'CRM' | 'CSV' | 'LinkedIn export' | 'Notes' | 'Meeting history'

export interface ImportProposal {
  id: ID
  batchId: ID
  kind: 'person' | 'relationship' | 'memory' | 'open loop' | 'meeting' | 'company'
  label: string
  detail: string
  action: 'create' | 'update' | 'skip'
  defaultScope: PrivacyScope
  provenance: string
  accepted?: boolean
}

export interface ImportBatch {
  id: ID
  source: ImportSource
  state: 'available' | 'not-connected' | 'reviewing' | 'committed' | 'removed'
  connected: boolean
  fileName?: string
  rowCount: number
  reviewedAt?: string
  committedAt?: string
  note: string
  createdAt: string
}

/* ------------------------------- 24. personal relationship vault */

export interface RelationshipVaultExport {
  id: ID
  requestedAt: string
  scope: 'everything' | 'relationships' | 'memory' | 'opportunities' | 'proof'
  format: 'json' | 'csv'
  includes: string[]
  rowCount: number
  fileName: string
  state: 'previewed' | 'downloaded'
}

/* ---------------------------- 25. professional inbox replacement */

export type InboxBucket = 'DECIDE' | 'RESPOND' | 'MOVE' | 'WAIT' | 'FYI'

export interface ProfessionalInboxDecision {
  id: ID
  bucket: InboxBucket
  kind: 'message' | 'relationship' | 'intro approval' | 'opportunity' | 'commitment' | 'deal decision' | 'expert request' | 'pitch permission' | 'fyi'
  headline: string
  detail: string
  memberId?: ID
  targetPage?: string
  targetId?: ID
  consequence: string
  due?: string
  state: 'open' | 'handled' | 'waiting' | 'dismissed'
  createdAt: string
}

/* ------------------------ 26. professional transaction layer */

export type TransactionKind =
  | 'Proposal' | 'Scope' | 'Referral agreement' | 'Introduction record'
  | 'Milestone' | 'NDA' | 'Advisory agreement'

export interface TransactionRecord {
  id: ID
  dealRoomId?: ID
  opportunityId?: ID
  kind: TransactionKind
  title: string
  parties: ID[]
  summary: string
  amount?: string
  paymentLink?: string
  signatureState: 'not-sent' | 'awaiting-signature' | 'signed' | 'declined'
  signatureNote: string
  createdAt: string
}

/* -------------------------- 27. relationship-based marketplace */

export interface MarketplaceListing {
  id: ID
  memberId: ID
  kind: 'Provider' | 'Advisor' | 'Operator' | 'Specialist' | 'System' | 'Service'
  headline: string
  offer: string
  industries: string[]
  geography: string
  proofNodeIds: ID[]
  referralIds: ID[]
  outcomesCreated: number
  availabilityId?: ID
  rationale: string
  visibility: Visibility
  createdAt: string
}

/* ------------------------ 28. professional knowledge ownership */

export interface KnowledgeAsset {
  id: ID
  authorId: ID
  kind: 'Framework' | 'Playbook' | 'Research' | 'Field note' | 'System' | 'Analysis' | 'Briefing' | 'Lesson from execution'
  title: string
  summary: string
  body: string
  contributorIds: ID[]
  provenance: SignalProvenance
  evidence: string
  revisions: Array<{ id: ID; note: string; when: string }>
  industries: string[]
  audience: string
  visibility: Visibility
  systemIds: ID[]
  outcomeIds: ID[]
  companyIds: ID[]
  proofNodeIds: ID[]
  createdAt: string
  updatedAt: string
}

/* ---------------------- 29. human introduction concierge */

export type ConciergeState =
  | 'Suggested' | 'Human Review Requested' | 'Reviewing' | 'Needs More Context'
  | 'Approved to Introduce' | 'Declined' | 'Completed'

export interface HumanConciergeReview {
  id: ID
  subject: string
  kind: 'Introduction' | 'Acquisition' | 'Capital' | 'Board role' | 'Deal room'
  aboutMemberIds: ID[]
  reviewerId: ID
  reviewerRole: string
  decisionRequested: string
  visibleToReviewer: string[]
  withheldFromReviewer: string[]
  preparedWording: string
  reviewerNote: string
  state: ConciergeState
  createdAt: string
  updatedAt: string
}

/* ------------------------ 30. the Aetheris professional standard */

export interface AetherisStandardAcceptance {
  id: ID
  memberId: ID
  version: string
  principles: string[]
  accepted: boolean
  acceptedAt?: string
  note: string
}

/* --------------------------------------- briefing composition */

export type BriefingSectionKind =
  | 'Attention' | 'Relationships' | 'Opportunities' | 'Collisions' | 'Company movement'
  | 'People worth meeting' | 'People you can help' | 'Systems' | 'Open loops'
  | 'Meetings' | 'Travel and events' | 'Knowledge' | 'Strategy'

export interface BriefingItem {
  kind: BriefingSectionKind
  headline: string
  detail: string
  why: string
  memberId?: ID
  targetPage?: string
  targetId?: ID
  priority: number
}
