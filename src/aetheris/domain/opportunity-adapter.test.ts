import { describe, expect, it } from 'vitest';
import { assessAuthorizedOpportunity } from './opportunity-adapter';
describe('permissioned opportunity evidence adapter', () => {
  it('does not score without matching consent', () => {
    const result = assessAuthorizedOpportunity({ matchingConsentGranted: false, profileFit: 90, statedNeedStrength: 90, verifiedTiming: 90 });
    expect(result.score).toBeNull(); expect(result.factors).toEqual([]);
  });
  it('preserves unknown evidence and explains the known weighted scores', () => {
    const result = assessAuthorizedOpportunity({ matchingConsentGranted: true, profileFit: 80, statedNeedStrength: 60, verifiedTiming: 40 });
    expect(result.score).toBe(61);
    expect(result.factors.find(item => item.key === 'engagement')?.score).toBeNull();
    expect(result.reasons).toContain('Timing: 40/100');
  });
  it('rejects invalid ratings instead of clamping them into trusted evidence', () => {
    const result = assessAuthorizedOpportunity({ matchingConsentGranted: true, profileFit: 101, statedNeedStrength: -1, verifiedTiming: NaN });
    expect(result.score).toBeNull();
  });
});
