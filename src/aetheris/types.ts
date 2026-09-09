export type RadarState = 'hot_now' | 'emerging' | 'strategic' | 'dormant' | 'at_risk' | 'unknown_path'
export type PrivacyScope = 'private' | 'team' | 'organization' | 'shareable' | 'public'
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4

export interface ScoreBreakdown {
  strategicFit: number
  mutualValue: number
  timing: number
  trust: number
  relationshipStrength: number
  decisionInfluence: number
  opportunityValue: number
  friction: number
}

export interface Person {
  id: string
  name: string
  initials: string
  title: string
  company: string
  location: string
  email?: string
  linkedin?: string
  tags: string[]
  needs: string[]
  offers: string[]
  lastInteractionDays: number
  relationshipStatus: 'unknown' | 'new' | 'active' | 'strong' | 'dormant' | 'at-risk'
  score: ScoreBreakdown
  scoreTotal: number
  radar: RadarState
  whyThem: string
  whyYou: string
  whyNow: string
  bestPath: string[]
  nextAction: string
  dontDo: string
  confidence: number
  opportunityLow?: number
  opportunityHigh?: number
}

export interface Objective {
  id: string
  title: string
  outcome: string
  target: string
  whyNow: string
  valueOffer: string
  success: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface ForensicLeak {
  id: string
  type: string
  personId: string
  businessReason: string
  evidence: string
  urgency: 'low' | 'medium' | 'high'
  recommendedAction: string
  confidence: number
  estimatedValue?: string
}

export interface Meeting {
  id: string
  personId: string
  date: string
  reason: string
  caresAbout: string[]
  recentSignals: string[]
  openLoops: string[]
  opportunity: string
  opening: string
  questions: string[]
  avoid: string
  desiredOutcome: string
}

export interface DigitalYouProfile {
  directness: number
  formality: number
  humor: number
  brevity: number
  warmth: number
  sellingAggressiveness: number
  followUpFrequency: number
  prohibitedPhrases: string[]
}
