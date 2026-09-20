/**
 * Ask Intros — production domain models.
 *
 * These models are storage-agnostic. The local adapter keeps them in
 * localStorage for the preview; the remote adapter maps the same shapes onto
 * Postgres tables (see ./schema.sql) when a database is wired.
 */
import type { PrivacyScope } from '../types'

export type ID = string
export type SourceType = 'explicit' | 'derived' | 'inferred' | 'unknown'
export type Visibility = 'private' | 'connections' | 'network' | 'public'
export type ValueState = 'known' | 'modeled' | 'unquantified'

export interface Provenance {
  sourceType: SourceType
  confidence: number
  evidenceIds: ID[]
  scope: PrivacyScope
}

/* ------------------------------------------------------------------ systems */

export type SystemCategory =
  | 'Product' | 'Methodology' | 'Software' | 'Process' | 'Service'
  | 'Framework' | 'Research' | 'Investment thesis' | 'Distribution channel' | 'Capability'

export type SystemStatus = 'draft' | 'active' | 'placing' | 'paused' | 'archived'

export interface SystemRecord {
  id: ID
  name: string
  ownerId: ID
  thesis: string
  category: SystemCategory
  description: string
  bestFitCompanies: string[]
  bestFitRoles: string[]
  industries: string[]
  geography: string
  proof: string[]
  placementGoal: string
  targetPlacements: number
  activePlacements: number
  adoptionCount: number
  referralCount: number
  valueProposition: string
  evidence: string[]
  expectedFriction: string
  whoBenefits: string
  status: SystemStatus
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

/* ---------------------------------------------------------------- placement */

export type PlacementStage =
  | 'Identified' | 'Qualified' | 'Warm Path Found' | 'Intro Requested' | 'Shared'
  | 'Demo/Discussion' | 'Pilot' | 'Adopted' | 'Referred' | 'Closed/Not Now'

export const placementStages: PlacementStage[] = [
  'Identified', 'Qualified', 'Warm Path Found', 'Intro Requested', 'Shared',
  'Demo/Discussion', 'Pilot', 'Adopted', 'Referred', 'Closed/Not Now',
]

export interface Placement {
  id: ID
  systemId: ID
  targetType: 'person' | 'circle' | 'company'
  targetId: ID
  targetLabel: string
  stage: PlacementStage
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
  provenance: Provenance
  history: Array<{ stage: PlacementStage; when: string; note: string }>
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ circles */

export interface Circle {
  id: ID
  name: string
  purpose: string
  description: string
  memberIds: ID[]
  rolesRepresented: string[]
  sharedIntents: string[]
  activeSystemIds: ID[]
  openIntroCount: number
  opportunities: string[]
  eventIds: ID[]
  relevanceScore: number
  ownerId: ID
  moderatorIds: ID[]
  visibility: Visibility
  purposeStatus: 'active' | 'complete' | 'expiring' | 'archived'
  health: string
  discussion: Array<{ id: ID; authorId: ID; text: string; when: string }>
  createdAt: string
  expiresAt?: string
}

/* -------------------------------------------------------------- intent card */

export type IntentType =
  | 'I NEED' | 'I CAN HELP' | "I'M BUILDING" | "I'M INVESTING IN" | "I'M HIRING"
  | "I'M BUYING" | "I'M SELLING" | "I'M EXPLORING" | 'I CAN INTRODUCE'

export const intentTypes: IntentType[] = [
  'I NEED', 'I CAN HELP', "I'M BUILDING", "I'M INVESTING IN", "I'M HIRING",
  "I'M BUYING", "I'M SELLING", "I'M EXPLORING", 'I CAN INTRODUCE',
]

export interface IntentCard {
  id: ID
  memberId: ID
  type: IntentType
  title: string
  statement: string
  audience: string
  roleFilter: string[]
  companyFilter: string[]
  industryFilter: string[]
  geographyFilter: string
  urgency: 'low' | 'medium' | 'high'
  startsAt: string
  expiresAt: string
  visibility: Visibility
  valueOffered: string
  evidence: string[]
  relatedSystemId?: ID
  relatedOpportunity?: string
  status: 'active' | 'expired' | 'fulfilled' | 'withdrawn'
}

/* -------------------------------------------------------- digital handshake */

export interface DigitalHandshake {
  id: ID
  aId: ID
  bId: ID
  justified: 'Yes' | 'Maybe' | 'Not Yet'
  mutualValue: string
  sharedContext: string[]
  timing: string
  potentialConflict: string
  safeToShare: string[]
  privateContextUsed: number
  whatAGets: string
  whatBGets: string
  whyNow: string
  confidence: number
  aApproved: boolean
  bApproved: boolean
  createdAt: string
}

/* ---------------------------------------------------------- context capsule */

export interface CapsuleItem { id: ID; label: string; value: string; shared: boolean; scope: PrivacyScope }

export interface ContextCapsule {
  id: ID
  introId: ID
  memberId: ID
  whyMeeting: string
  commonGround: string[]
  mutualValue: string
  startHere: string
  helpA: string[]
  helpB: string[]
  currentIntents: string[]
  connectedBy: string
  items: CapsuleItem[]
  protected: string[]
  createdAt: string
}

/* ------------------------------------------------------ relationship weather */

export type WeatherState =
  | 'Building' | 'Warm' | 'Active' | 'Waiting' | 'Cooling' | 'Dormant' | 'Reawakening' | 'At Risk'

export interface RelationshipWeather {
  id: ID
  memberId: ID
  state: WeatherState
  why: string
  formation: number
  momentum: number
  depth: number
  recencyDays: number
  reciprocity: number
  trust: number
  openLoops: number
  contextAccumulated: number
  updatedAt: string
}

/* ---------------------------------------------------------------- open loop */

export interface OpenLoop {
  id: ID
  title: string
  owner: 'me' | 'them' | 'shared'
  memberId: ID
  source: string
  dueAt?: string
  trigger?: string
  status: 'open' | 'snoozed' | 'complete'
  priority: 'low' | 'medium' | 'high'
  evidence: string
  scope: PrivacyScope
  opportunityId?: ID
  createdAt: string
}

/* ------------------------------------------------------------ trigger memory */

export interface TriggerMemory {
  id: ID
  memberId: ID
  sourceMemory: string
  triggerCondition: string
  matchedEvent: string
  confidence: number
  recommendedAction: string
  scope: PrivacyScope
  status: 'new' | 'acted' | 'dismissed'
  when: string
}

/* -------------------------------------------------------- connector record */

export interface ConnectorReputation {
  id: ID
  memberId: ID
  introsAccepted: number
  conversationsStarted: number
  partnershipsFormed: number
  outcomesCreated: number
  contextUsefulness: number
  typicalResponse: string
  introStyle: string
  bestFor: string[]
}

/* --------------------------------------------------------- connection chain */

export interface ChainStep {
  personId: ID
  name: string
  strength: number
  trust: number
  relevance: number
  consent: 'not asked' | 'asked' | 'agreed' | 'declined'
  note: string
}

export interface ConnectionChain {
  id: ID
  targetId: ID
  steps: ChainStep[]
  state: 'mapped' | 'in motion' | 'blocked' | 'complete'
  recommendation: string
  bestNextHop: string
}

/* ------------------------------------------------------------------ company */

export interface CompanyProfile {
  id: ID
  name: string
  industry: string
  location: string
  size: string
  peopleIds: ID[]
  strongestEntry: string
  contextualPaths: string[]
  previousConversations: string[]
  dormantOpportunities: string[]
  relevantSystemIds: ID[]
  openIntentIds: ID[]
  relatedCircleIds: ID[]
  timeline: Array<{ when: string; text: string }>
}

/* -------------------------------------------------- organization relationship */

export interface OrganizationRelationship {
  id: ID
  companyName: string
  ownerId: ID
  ownerName: string
  relationshipType: 'knows' | 'sold to' | 'worked there' | 'owes follow-up' | 'can open door'
  strength: number
  scope: PrivacyScope
  note: string
}

/* -------------------------------------------------------------- availability */

export interface AvailabilityWindow {
  id: ID
  memberId: ID
  label: string
  day: string
  start: string
  end: string
  timezone: string
  purpose: 'intro' | 'demo' | 'working session'
  bookedBy?: ID
  capsuleId?: ID
  meetingPurpose?: string
}

/* --------------------------------------------------------- meeting continuity */

export interface MeetingContinuity {
  id: ID
  memberId: ID
  when: string
  purpose: string
  goals: string[]
  openLoopIds: ID[]
  sharedContext: string[]
  questions: string[]
  desiredOutcome: string
  closed: boolean
  after?: {
    whatChanged: string
    decisions: string[]
    commitments: string[]
    objections: string[]
    peopleMentioned: string[]
    nextTrigger: string
    followUp: string
    weather: WeatherState
  }
}

/* ------------------------------------------------------------------ outcomes */

export type OutcomeType =
  | 'meeting' | 'opportunity' | 'pilot' | 'sale' | 'partnership'
  | 'investment' | 'hire' | 'referral' | 'system adoption'

export interface Outcome {
  id: ID
  type: OutcomeType
  headline: string
  memberId?: ID
  systemId?: ID
  circleId?: ID
  companyName?: string
  directValue: { state: ValueState; note: string }
  influencedValue: { state: ValueState; note: string }
  evidence: string
  confidence: number
  createdAt: string
}

/* -------------------------------------------------------------- move switcher */

export type MoveKind = 'Need' | 'Relationship' | 'System' | 'Opportunity'
