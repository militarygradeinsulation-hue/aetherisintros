import { assessOpportunity, type OpportunityReadiness, type OpportunitySignals } from './opportunity-intelligence';

/**
 * Integration boundary for canonical CRM/intro records.
 * Callers must obtain authorization and explicit matching consent before passing
 * evidence. Unknown fields remain unknown; no guessed values or scraped traits.
 */
export type AuthorizedOpportunityEvidence = {
  matchingConsentGranted: boolean;
  profileFit?: number | null;
  statedNeedStrength?: number | null;
  verifiedTiming?: number | null;
  evidenceConfidence?: number | null;
  recordedEngagement?: number | null;
};

export function assessAuthorizedOpportunity(evidence: AuthorizedOpportunityEvidence): OpportunityReadiness {
  const signals: OpportunitySignals = {
    consentToMatch: evidence.matchingConsentGranted === true,
    ...(evidence.profileFit !== undefined ? { profileFit: evidence.profileFit } : {}),
    ...(evidence.statedNeedStrength !== undefined ? { demonstratedNeed: evidence.statedNeedStrength } : {}),
    ...(evidence.verifiedTiming !== undefined ? { timing: evidence.verifiedTiming } : {}),
    ...(evidence.evidenceConfidence !== undefined ? { evidenceQuality: evidence.evidenceConfidence } : {}),
    ...(evidence.recordedEngagement !== undefined ? { engagement: evidence.recordedEngagement } : {}),
  };
  return assessOpportunity(signals);
}
