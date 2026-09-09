import type { Person, RadarState, ScoreBreakdown } from '../types'

export function calculateConnectionScore(scores: ScoreBreakdown) {
  const frictionAdvantage = 100 - scores.friction
  return Math.round(
    scores.strategicFit * 0.25 +
    scores.mutualValue * 0.20 +
    scores.timing * 0.15 +
    scores.trust * 0.10 +
    scores.relationshipStrength * 0.10 +
    scores.decisionInfluence * 0.10 +
    scores.opportunityValue * 0.05 +
    frictionAdvantage * 0.05,
  )
}

export function classifyConnection(score: number) {
  if (score >= 90) return 'Exceptional'
  if (score >= 80) return 'High Priority'
  if (score >= 70) return 'Strong'
  if (score >= 60) return 'Worth Exploring'
  if (score >= 45) return 'Weak'
  return 'Do Not Prioritize'
}

export function determineRadarState(p: Pick<Person, 'scoreTotal' | 'lastInteractionDays' | 'score'>): RadarState {
  if (p.scoreTotal >= 80 && p.score.timing >= 75) return 'hot_now'
  if (p.scoreTotal >= 70 && p.score.timing >= 50) return 'emerging'
  if (p.scoreTotal >= 70) return 'strategic'
  if (p.score.relationshipStrength >= 70 && p.lastInteractionDays > 365) return 'at_risk'
  if (p.score.relationshipStrength >= 65 && p.lastInteractionDays > 180) return 'dormant'
  return 'unknown_path'
}

export const radarLabel: Record<RadarState, string> = {
  hot_now: 'Hot now',
  emerging: 'Emerging',
  strategic: 'Strategic',
  dormant: 'Dormant',
  at_risk: 'At risk',
  unknown_path: 'Unknown path',
}

export function scoreTone(score: number) {
  if (score >= 85) return 'score-hot'
  if (score >= 70) return 'score-warm'
  if (score >= 55) return 'score-mid'
  return 'score-low'
}

export function composeWarmIntro(person: Person) {
  return `${person.name.split(' ')[0]},\n\nYou came to mind because ${person.whyNow.charAt(0).toLowerCase()}${person.whyNow.slice(1)}\n\nI’m working on a relationship-intelligence approach through Aetheris that overlaps with ${person.whyThem.charAt(0).toLowerCase()}${person.whyThem.slice(1)} I don’t want to force a pitch where one doesn’t belong, but I think there’s enough real overlap to make a short conversation useful for both sides.\n\nIf that sounds worthwhile, I’m happy to compare notes.`
}
