/**
 * Aetheris Intros — moat layer domain models.
 *
 * Storage-agnostic, exactly like ./models.ts and ./os-models.ts. The preview
 * runs on the local adapter (localStorage + seeded demo content); a Postgres /
 * Supabase adapter maps the same shapes onto the tables declared in
 * ./schema.sql without any UI change.
 */
import type { PrivacyScope } from '../types'
import type { ID, SourceType, Visibility } from './models'

export type VerificationState = 'verified' | 'self-reported' | 'pending' | 'unverified'
export type AudienceScope = 'public' | 'network' | 'connections' | 'circle' | 'organization' | 'private-routed'

/* --------------------------------------------- 1. professional passport */

export interface PassportClaim {
  id: ID
  label: string
  value: string
  state: VerificationState
  verifiedBy?: string
  verifiedAt?: string
  evidenceIds: ID[]
  scope: PrivacyScope
}

export interface ProfessionalPassport {
  id: ID
  memberId: ID
  company: PassportClaim
  role: PassportClaim
  expertise: PassportClaim[]
  priorCompanies: string[]
  industries: string[]
  references: Array<{ id: ID; name: string; relationship: string; note: string; state: VerificationState }>
  systemsContributed: ID[]
  outcomesContributed: ID[]
  introductionsCompleted: number
  introductionsHonoured: number
  circleIds: ID[]
  credibilityNote: string
  scope: PrivacyScope
  createdAt: string
  updatedAt: string
}

/* ------------------------------ 2. constitution + anti-spam engine */

export type ConstitutionPrinciple =
  | 'Relevance' | 'Consent' | 'Specificity' | 'Reciprocity' | 'No mass-selling' | 'No purchased attention'

export type OutreachFlagKind =
  | 'vague-pitch' | 'bulk-outreach' | 'unsolicited-selling' | 'irrelevant-ask'
  | 'excessive-frequency' | 'no-mutual-value' | 'repeated-decline' | 'missing-context'

export interface NetworkConstitutionRule {
  id: ID
  principle: ConstitutionPrinciple
  title: string
  rule: string
  why: string
  detects: OutreachFlagKind[]
  enforcement: 'review' | 'block' | 'coach'
  active: boolean
}

export type OutreachVerdict = 'Ready' | 'Needs Context' | 'Reads As Promotional' | 'Hold'

export interface OutreachFlag {
  kind: OutreachFlagKind
  principle: ConstitutionPrinciple
  plainLanguage: string
  fix: string
}

export interface OutreachQualityReview {
  id: ID
  channel: 'message' | 'intro' | 'ask' | 'network-question'
  authorId: ID
  recipientId?: ID
  text: string
  verdict: OutreachVerdict
  quality: number
  flags: OutreachFlag[]
  strengths: string[]
  suggestedRewrite: string
  allowSend: boolean
  createdAt: string
}

/** Private enforcement counter. Never rendered as a public reputation score. */
export interface OutreachStrikeLedger {
  id: ID
  memberId: ID
  strikes: number
  lastFlag?: OutreachFlagKind
  lastFlaggedAt?: string
  privateNote: string
}

/* ------------------------------------------------ 3. ask my network */

export interface QuestionRecipient {
  memberId: ID
  reason: string
  confidence: number
  responded: boolean
  response?: string
  respondedAt?: string
}

export interface NetworkQuestion {
  id: ID
  authorId: ID
  question: string
  context: string
  audience: AudienceScope
  circleId?: ID
  organizationId?: ID
  routed: QuestionRecipient[]
  routingLogic: string[]
  relatedSystemIds: ID[]
  relatedPersonIds: ID[]
  spawnedIntroIds: ID[]
  status: 'routing' | 'open' | 'answered' | 'closed'
  outcome: string
  createdAt: string
}

/* ---------------------------------- 4. serendipity / unexpectedly relevant */

export type SerendipityBasis =
  | 'adjacent problem' | 'complementary capability' | 'shared timing'
  | 'non-obvious circle' | 'compatible systems' | 'geography' | 'prior work'

export interface SerendipityMatch {
  id: ID
  ownerId: ID
  memberId: ID
  basis: SerendipityBasis[]
  whyUnexpected: string
  whyItCouldMatter: string
  whyNow: string
  mutualValue: string
  uncertainty: string
  evidenceIds: ID[]
  confidence: number
  status: 'new' | 'seen' | 'acted' | 'dismissed' | 'not-relevant'
  createdAt: string
}

/* ------------------------- 5. organization relationship passport */

export interface OrgPassportEvent {
  id: ID
  when: string
  kind: 'introduction' | 'meeting' | 'system shared' | 'outcome' | 'message' | 'departure' | 'event'
  text: string
  peopleIds: ID[]
  evidenceIds: ID[]
  scope: PrivacyScope
}

export interface OrganizationRelationshipPassport {
  id: ID
  companyId: ID
  companyName: string
  relationshipOwners: Array<{ memberId: ID; name: string; role: string }>
  peopleInvolved: ID[]
  formerEmployees: Array<{ memberId: ID; name: string; nowAt: string }>
  activeCircleIds: ID[]
  systemsShared: ID[]
  outcomeIds: ID[]
  openLoops: string[]
  dormantOpportunities: string[]
  chronology: OrgPassportEvent[]
  summary: string
  scope: PrivacyScope
  updatedAt: string
}

/* --------------------------------------------------- 6. live event mode */

export interface EventSession {
  id: ID
  title: string
  when: string
  room: string
  peopleIds: ID[]
}

export interface LiveEvent {
  id: ID
  name: string
  kind: 'conference' | 'dinner' | 'investor meeting' | 'trade show' | 'mastermind' | 'private gathering'
  venue: string
  city: string
  startsAt: string
  endsAt: string
  goals: string[]
  attendeeIds: ID[]
  companyIds: ID[]
  circleIds: ID[]
  intentIds: ID[]
  systemIds: ID[]
  sessions: EventSession[]
  followUpWindowDays: number
  attendanceVisibility: 'private' | 'circle' | 'attendees' | 'network'
  myPlan: Array<{ id: ID; memberId: ID; why: string; opener: string; introducerId?: ID; done: boolean }>
  status: 'upcoming' | 'live' | 'follow-up' | 'closed'
}

/* ---------------------------------------------- 7. relationship gap map */

export interface RelationshipGap
{
  id: ID
  ownerId: ID
  objective: string
  dimension: 'role' | 'industry' | 'geography' | 'company size' | 'expertise' | 'circle' | 'trust depth'
  missing: string
  strength: string
  whyItMatters: string
  bridgeMemberId?: ID
  bridgeReason: string
  circleIds: ID[]
  systemIds: ID[]
  nextMove: string
  severity: number
  strategyId?: ID
}

/* ------------------------------------------ 8. portable relationship identity */

export interface PortableIdentity
{
  id: ID
  memberId: ID
  slug: string
  headline: string
  shareIdentity: boolean
  shareIntents: boolean
  shareCanHelp: boolean
  shareSystems: boolean
  shareCircles: boolean
  sharePassport: boolean
  shareAvailability: boolean
  introStyle: string
  requestsEnabled: boolean
  visibility: Visibility
  requests: Array<{ id: ID; name: string; email: string; context: string; kind: 'connect' | 'intro'; when: string; status: 'new' | 'accepted' | 'declined' }>
  updatedAt: string
}

/* -------------------------------------------- 9. relationship consent ledger */

export interface ConsentLedgerEntry {
  id: ID
  ownerId: ID
  item: string
  detail: string
  scope: PrivacyScope
  sharedWith: Array<{ id: ID; label: string; reason: string; when: string; kind: 'member' | 'circle' | 'organization' | 'capsule' | 'link' | 'representative' }>
  sourceType: SourceType
  revocable: boolean
  revoked: boolean
  updatedAt: string
}

/* --------------------------------------- 10. reciprocity without scores */

export interface ReciprocitySignal {
  id: ID
  ownerId: ID
  counterpartyId: ID
  counterpartyName: string
  circleId?: ID
  helpOffered: number
  helpAccepted: number
  introsMade: number
  introsReceived: number
  contextUsefulness: number
  unansweredAsks: number
  outcomesTogether: number
  recommendation: string
  direction: 'you owe value' | 'balanced' | 'they owe nothing'
  updatedAt: string
}

/* --------------------------------------- 11. relationship decay prevention */

export type DecayCause =
  | 'unfinished commitment' | 'no next reason' | 'one-sided asks' | 'timing mismatch'
  | 'missing context' | 'unanswered message' | 'stale opportunity' | 'no natural cadence'

export interface RelationshipDecayRisk {
  id: ID
  ownerId: ID
  memberId: ID
  risk: number
  horizon: string
  causes: Array<{ cause: DecayCause; explanation: string }>
  minimumAction: string
  actionKind: 'do nothing yet' | 'send context' | 'close a loop' | 'answer them' | 'set a cadence' | 'give value'
  evidenceIds: ID[]
  updatedAt: string
}

/* ------------------------------------------ 12. digital representative */

export interface DigitalRepresentativePolicy {
  id: ID
  memberId: ID
  enabled: boolean
  allowedTopics: string[]
  blockedTopics: string[]
  approvedScopes: PrivacyScope[]
  allowedActions: Array<'answer from approved context' | 'collect opportunity' | 'collect question' | 'suggest availability'>
  authorityLimits: string[]
  handoffNote: string
  transcript: Array<{ id: ID; when: string; from: string; question: string; answer: string; permitted: boolean; handedOff: boolean }>
  updatedAt: string
}

/* ------------------------- 13. introduction availability windows */

export interface IntroductionAvailability {
  id: ID
  memberId: ID
  category: string
  qualification: string[]
  requiredContext: string[]
  preferredStrength: 'any' | 'warm' | 'strong'
  maxIntroductions: number
  used: number
  opensAt: string
  closesAt: string
  scope: PrivacyScope
  note: string
}

/* --------------------------------------- 14. network graph time machine */

export interface NetworkSnapshot {
  id: ID
  ownerId: ID
  takenAt: string
  label: string
  connectionIds: ID[]
  activeCircleIds: ID[]
  systemsSpread: ID[]
  dormantIds: ID[]
  introductionsMade: number
  opportunitiesOpen: string[]
  note: string
}

export interface SnapshotDiff {
  from: string
  to: string
  newRelationships: ID[]
  dormant: ID[]
  circlesGainedRelevance: ID[]
  systemsSpread: ID[]
  opportunitiesAppeared: string[]
  opportunitiesClosed: string[]
  downstream: string[]
}

/* ------------------------- 15. opportunity origin / attribution */

export type AttributionNodeKind =
  | 'post' | 'intent' | 'circle' | 'person' | 'intro' | 'message' | 'meeting' | 'system' | 'pilot' | 'event' | 'question' | 'outcome'

export interface OutcomeAttributionEdge {
  id: ID
  outcomeId: ID
  step: number
  fromKind: AttributionNodeKind
  fromId: ID
  fromLabel: string
  toKind: AttributionNodeKind
  toId: ID
  toLabel: string
  contribution: 'direct' | 'influenced' | 'contextual'
  evidenceIds: ID[]
  when: string
  note: string
}

/* ------------------------ 16. professional knowledge exchange */

export type KnowledgePostKind = 'Field Note' | 'Ask' | 'Offer' | 'System Insight' | 'Event Debrief' | 'Decision Lesson'

export interface KnowledgePost {
  id: ID
  authorId: ID
  kind: KnowledgePostKind
  title: string
  body: string
  industries: string[]
  circleIds: ID[]
  systemIds: ID[]
  whyInYourFeed: string
  relevance: number
  usefulPrivately: boolean
  saved: boolean
  discussion: Array<{ id: ID; authorId: ID; text: string; when: string }>
  followUps: Array<{ id: ID; authorId: ID; question: string; when: string; answer?: string }>
  reviewId?: ID
  createdAt: string
}

/* ------------------------------------------ 17. private advisory boards */

export interface AdvisoryContribution {
  id: ID
  memberId: ID
  stance: 'agrees' | 'disagrees' | 'unsure'
  advice: string
  reasoning: string
  when: string
}

export interface AdvisoryBoard {
  id: ID
  ownerId: ID
  name: string
  decision: string
  context: string
  memberIds: ID[]
  invited: Array<{ memberId: ID; expertise: string; status: 'invited' | 'accepted' | 'declined' }>
  missingExpertise: Array<{ label: string; why: string; suggestedMemberId?: ID }>
  contributions: AdvisoryContribution[]
  meetingIds: ID[]
  openLoops: string[]
  decisionMade: boolean
  decisionRecord: string
  decidedAt?: string
  circleId?: ID
  evidenceIds: ID[]
  visibility: 'private' | 'board' | 'circle'
  createdAt: string
}

/* -------------------- 18. intros everywhere / relationship context layer */

export type ContextSurface = 'browser extension' | 'email sidebar' | 'calendar panel' | 'CRM panel' | 'mobile share sheet'

export interface RelationshipContextAdapter {
  id: ID
  surface: ContextSurface
  description: string
  readiness: 'contract ready' | 'in preview' | 'not connected'
  connected: boolean
  scopesRequested: PrivacyScope[]
  note: string
}

export interface RelationshipContextQuery {
  id: ID
  surface: ContextSurface
  subject: string
  memberId?: ID
  companyId?: ID
  askedAt: string
  answer: {
    identity: string
    weather: string
    openLoops: string[]
    currentIntent: string
    roomIds: ID[]
    bestNextMove: string
    evidenceIds: ID[]
    withheld: string[]
  }
}
