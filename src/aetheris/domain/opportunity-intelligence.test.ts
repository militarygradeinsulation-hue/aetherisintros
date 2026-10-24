import { describe, expect, it } from 'vitest';
import { assessOpportunity } from './opportunity-intelligence';

describe('assessOpportunity', () => {
  const signals = { profileFit: 90, demonstratedNeed: 85, timing: 80, evidenceQuality: 90, engagement: 70, consentToMatch: true };
  it('scores high readiness and explains the result', () => {
    const result = assessOpportunity(signals);
    expect(result.band).toBe('high');
    expect(result.score).toBe(85);
    expect(result.reasons).toHaveLength(3);
  });
  it('never scores a member without consent', () => {
    expect(assessOpportunity({ ...signals, consentToMatch: false })).toMatchObject({ score: null, band: 'unavailable' });
  });
  it('does not confuse missing evidence with zero readiness', () => {
    expect(assessOpportunity({ profileFit: 100, consentToMatch: true }).score).toBeNull();
  });
  it('rejects invalid or fabricated numeric values', () => {
    expect(assessOpportunity({ ...signals, timing: Number.NaN, profileFit: 120, engagement: -1 }).score).toBeNull();
  });
  it('provides a development action for moderate opportunities', () => {
    const result = assessOpportunity({ ...signals, demonstratedNeed: 40, timing: 30 });
    expect(result.band).toBe('developing');
  });
});
