/**
 * Relationship Operating System — domain models.
 *
 * Storage agnostic, same discipline as ./models.ts: normalized ids, explicit
 * source/confidence/privacy metadata on every inference, no UI concerns.
 * SQL for these tables lives in ./schema.sql (relationship OS section).
 */
import type { PrivacyScope } from '../types'
import type { ID, SourceType, ValueState, Visibility, WeatherState } from './models'

export type Band = 'High' | 'Medium' | 'Low'
export type Confidence = number

/* ------------------------------------------------------------- evidence */

export type EvidenceCategory = 'Known' | 'Observed' | 'Derived' | 'Uncertain'

export interface EvidenceItem {
  id: ID
  category: EvidenceCategory
  sourceType: SourceType
  sourceLabel: string
  statement: string
  date: string
  confidence: Confidence
  scope: PrivacyScope
  shareable: boolean
  personId?: ID
  companyId?: ID
  systemId?: ID
  circleId?: ID
  opportunityId?: ID
}

/* --------------------------------------------------- opportunity rooms */

export type RoomStage =
  | 'Signal' | 'Qualified' | 'Relationship Building' | 'Intro Pending' | 'Conversation'
  | 'Meeting' | 'System Shared' | 'Pilot/Trial' | 'Decision' | 'Won' | 'Lost/Not Now'

export const roomStages: RoomStage[] = [
  'Signal', 'Qualified', 'Relationship Building', 'Intro Pending', 'Conversation',
  'Meeting', 'System Shared', 'Pilot/Trial', 'Decision', 'Won', 'Lost/Not Now',
]

export interface OpportunityRoom {
  id: ID
  name: string
  thesis: string
  ownerId: ID
  peopleIds: ID[]
  companyId?: ID
  systemIds: ID[]
  circleIds: ID[]
  intentIds: ID[]
  introIds: ID[]
  messageThreadIds: ID[]
  openLoopIds: ID[]
  meetingIds: ID[]
  evidenceIds: ID[]
  stage: RoomStage
  valueState: ValueState
  knownValue: string
  modeledValue: string
  confidence: Confidence
  nextAction: string
  blockers: string[]
  weather?: WeatherState
  timeline: Array<{ id: ID; when: string; text: string; stage?: RoomStage }>
  archived: boolean
  createdAt: string
  updatedAt: string
}

/* -------------------------------------------------- relationship twin */

export interface TwinInference {
  id: ID
  label: string
  value: string
  sourceType: SourceType
  sourceLabel: string
  confidence: Confidence
  scope: PrivacyScope
}

export interface RelationshipTwin {
  id: ID
  memberId: ID
  ownerId: ID
  communicationStyle: string
  responsiveness: string
  trustHistory: string
  weather: WeatherState
  preferredIntroStyle: string
  currentIntents: string[]
  energyTopics: string[]
  frictionPatterns: string[]
  commitments: string[]
  meetingStyle: string
  timingWindows: string[]
  openLoopIds: ID[]
  sharedSystemIds: ID[]
  sharedCircleIds: ID[]
  outcomeHistory: string[]
  lastMeaningfulInteraction: string
  whatWorks: string[]
  whatToAvoid: string[]
  bestNextMove: string
  whatChanged: string[]
  inferences: TwinInference[]
  scope: PrivacyScope
  updatedAt: string
}

/* ------------------------------------------------ network simulation */

export interface SimulationInput {
  thingToMove: string
  systemId?: ID
  audience: string
  targetCount: number
  horizon: string
  geography: string
  industries: string[]
  allowedCircleIds: ID[]
  excludedPersonIds: ID[]
}

export interface SimulationPath {
  id: ID
  label: string
  connectorId?: ID
  connectorName: string
  reach: Band
  friction: Band
  trustCost: Band
  note: string
}

export interface NetworkSimulation {
  id: ID
  ownerId: ID
  question: string
  input: SimulationInput
  likelyPaths: SimulationPath[]
  strongestConnectorIds: ID[]
  targetCircleIds: ID[]
  estimatedFriction: Band
  bottlenecks: string[]
  trustWarnings: string[]
  sequence: string[]
  requiredProof: string[]
  systemsNeeded: string[]
  relationshipGaps: string[]
  confidence: Band
  uncertainty: string[]
  evidenceIds: ID[]
  savedAsStrategyId?: ID
  createdAt: string
}

/* ------------------------------------------- opportunity collisions */

export interface OpportunityCollision {
  id: ID
  ownerId: ID
  headline: string
  signals: Array<{ id: ID; text: string; sourceLabel: string; when: string; personId?: ID }>
  peopleIds: ID[]
  companyIds: ID[]
  systemIds: ID[]
  circleIds: ID[]
  timingEvent: string
  mutualValue: string
  trustPath: string[]
  confidence: Confidence
  safeSummary: string
  recommendedAction: string
  sector: string
  evidenceIds: ID[]
  status: 'new' | 'reviewed' | 'dismissed' | 'snoozed' | 'converted'
  roomId?: ID
  createdAt: string
}

/* ---------------------------------------------- latent network path */

export type LatentContext =
  | 'work history' | 'company' | 'board' | 'investment' | 'event' | 'geography'
  | 'prior partnership' | 'veteran network' | 'school' | 'industry' | 'circle'

export type PathKind = 'direct' | 'warm' | 'contextual'

export interface LatentNetworkPath {
  id: ID
  ownerId: ID
  targetPersonId?: ID
  targetCompanyId?: ID
  kind: PathKind
  degree: number
  hops: Array<{ personId?: ID; label: string; context: LatentContext; note: string }>
  contextSource: LatentContext
  strength: Band
  consentRequired: boolean
  statement: string
  evidenceIds: ID[]
  scope: PrivacyScope
}

/* -------------------------------------------------------- trust budget */

export interface TrustBudgetState {
  id: ID
  ownerId: ID
  connectorId: ID
  connectorName: string
  requestsThisMonth: number
  accepted: number
  declined: number
  reciprocityEvents: number
  lastAskDaysAgo: number
  outcomeQuality: Band
  responseFatigue: Band
  alternativeConnectorIds: ID[]
  health: 'healthy' | 'watch' | 'strained'
  guidance: string
  updatedAt: string
}

/* ------------------------------------------- introduction quality control */

export type IntroVerdict = 'Ready' | 'Needs Context' | 'Poor Timing' | 'Do Not Send Yet'

export interface IntroQualityReview {
  id: ID
  ownerId: ID
  memberId: ID
  verdict: IntroVerdict
  score: number
  checks: Array<{ key: string; label: string; pass: boolean; reason: string; fix?: string }>
  missingContext: string[]
  trustBudgetNote: string
  evidenceIds: ID[]
  reviewedAt: string
}

/* ----------------------------------------------------- relationship inbox */

export type InboxKind =
  | 'commitment' | 'cooling' | 'new context' | 'you can help' | 'intro approval'
  | 'system placement' | 'collision' | 'meeting follow-up' | 'trigger memory' | 'blocker'

export type InboxLane = 'Today' | 'This Week' | 'Mine' | 'Waiting on Them' | 'Opportunities' | 'Give Before Ask'

export interface RelationshipInboxItem
{
  id: ID
  ownerId: ID
  kind: InboxKind
  title: string
  whyThisMatters: string
  whyNow: string
  nextMove: string
  lanes: InboxLane[]
  personId?: ID
  companyId?: ID
  systemId?: ID
  roomId?: ID
  collisionId?: ID
  threadId?: ID
  loopId?: ID
  priority: number
  evidenceIds: ID[]
  status: 'open' | 'done' | 'snoozed'
  createdAt: string
}

/* -------------------------------------------------- voice-to-network memory */

export type CaptureProposalKind =
  | 'person update' | 'company update' | 'memory' | 'trigger memory'
  | 'open loop' | 'connection chain' | 'opportunity room'

export interface CaptureProposal {
  id: ID
  kind: CaptureProposalKind
  summary: string
  detail: string
  personId?: ID
  companyId?: ID
  scope: PrivacyScope
  confidence: Confidence
  approved: boolean
  rejected: boolean
}

export interface VoiceMemoryCapture {
  id: ID
  ownerId: ID
  transcript: string
  method: 'voice' | 'text'
  proposals: CaptureProposal[]
  status: 'review' | 'saved' | 'discarded'
  createdAt: string
}

/* ----------------------------------------------------------- autopilot */

export type AutopilotKind =
  | 'reconnect draft' | 'intro request' | 'follow-up' | 'system placement'
  | 'offer help' | 'context capsule' | 'meeting invitation' | 'evidence request'

export interface AutopilotAction {
  id: ID
  ownerId: ID
  kind: AutopilotKind
  title: string
  personId?: ID
  systemId?: ID
  roomId?: ID
  threadId?: ID
  draft: string
  whyPrepared: string
  expectedBenefit: string
  trustBudgetImpact: string
  scope: PrivacyScope
  requiresApproval: boolean
  minimumAutonomy: 0 | 1 | 2 | 3 | 4
  evidenceIds: ID[]
  status: 'prepared' | 'approved' | 'skipped' | 'snoozed'
  createdAt: string
}

/* ---------------------------------------------------- network strategy */

export interface StrategyStep {
  id: ID
  text: string
  personId?: ID
  companyId?: ID
  done: boolean
}

export interface NetworkStrategy {
  id: ID
  ownerId: ID
  goal: string
  relationshipType: string
  industry: string
  geography: string
  targetCount: number
  horizon: string
  systemIds: ID[]
  preferredCircleIds: ID[]
  constraints: string[]
  progressPersonIds: ID[]
  gaps: string[]
  strongestPaths: Array<{ personId?: ID; label: string; strength: Band; note: string }>
  nextMoves: StrategyStep[]
  fromSimulationId?: ID
  visibility: Visibility
  createdAt: string
  updatedAt: string
}
