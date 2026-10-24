/**
 * Opportunity Intelligence v1 — deterministic, explainable and consent-aware.
 * No network calls, AI inference, or database migrations.
 * Scores describe opportunity readiness, not personal worth or reputation.
 */
export type OpportunitySignals = {
  profileFit?: number | null;
  demonstratedNeed?: number | null;
  timing?: number | null;
  evidenceQuality?: number | null;
  engagement?: number | null;
  consentToMatch: boolean;
};
export type OpportunityReadiness = {
  score: number | null;
  band: 'high' | 'developing' | 'early' | 'unavailable';
  factors: { key: string; score: number | null; weight: number; contribution: number }[];
  reasons: string[];
  nextAction: string;
};
const weights = {
  profileFit: 0.25,
  demonstratedNeed: 0.30,
  timing: 0.20,
  evidenceQuality: 0.15,
  engagement: 0.10,
} as const;
const labels: Record<keyof typeof weights, string> = {
  profileFit: 'Profile fit', demonstratedNeed: 'Demonstrated need',
  timing: 'Timing', evidenceQuality: 'Evidence quality', engagement: 'Engagement',
};
function valid(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? value : null;
}
export function assessOpportunity(input: OpportunitySignals): OpportunityReadiness {
  if (!input.consentToMatch) return {
    score: null, band: 'unavailable', factors: [], reasons: ['Matching consent is not granted.'],
    nextAction: 'Request consent before evaluating this opportunity.',
  };
  const factors = (Object.keys(weights) as (keyof typeof weights)[]).map(key => {
    const score = valid(input[key]);
    return { key, score, weight: weights[key], contribution: score === null ? 0 : score * weights[key] };
  });
  const observedWeight = factors.reduce((sum, f) => sum + (f.score === null ? 0 : f.weight), 0);
  // Do not interpret a single observed signal as a reliable readiness score.
  if (observedWeight < 0.65 || factors.filter(f => f.score !== null).length < 3) return {
    score: null, band: 'unavailable', factors,
    reasons: ['Insufficient verified signals for a reliable readiness score.'],
    nextAction: 'Collect more permissioned evidence about fit, need, and timing.',
  };
  const score = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0) / observedWeight);
  const band = score >= 75 ? 'high' : score >= 50 ? 'developing' : 'early';
  const reasons = factors.filter(f => f.score !== null)
    .sort((a, b) => b.contribution / b.weight - a.contribution / a.weight)
    .slice(0, 3).map(f => `${labels[f.key as keyof typeof weights]}: ${f.score}/100`);
  const nextAction = band === 'high'
    ? 'Review evidence and propose a consent-based introduction.'
    : band === 'developing'
      ? 'Clarify the business need and expected timing.'
      : 'Offer relevant context without initiating unsolicited outreach.';
  return { score, band, factors, reasons, nextAction };
}
