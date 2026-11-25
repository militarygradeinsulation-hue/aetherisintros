/** Per-answer runtime resource limits shared by both language providers.
 * Counts attempts, not billable tokens or credits. No persisted private payloads.
 */
export type ButlerUsage = { providerRequests: number; toolReads: number; blockedToolReads: number; providerLimit: number; toolLimit: number };
export function boundedSetting(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = raw === undefined || raw.trim()==='' ? NaN : Number(raw);
  return Number.isInteger(value) ? Math.max(min,Math.min(max,value)) : fallback;
}
export class ButlerBudgetExceeded extends Error {
  constructor(){super('Butler processing limit reached for this request.');this.name='ButlerBudgetExceeded';}
}
export function createButlerBudget(providerLimit: number, toolLimit: number) {
  const usage: ButlerUsage = { providerRequests:0,toolReads:0,blockedToolReads:0,providerLimit,toolLimit };
  return {
    beforeProviderRequest() {
      if (usage.providerRequests >= providerLimit) throw new ButlerBudgetExceeded();
      usage.providerRequests++;
    },
    reserveTool() {
      if (usage.toolReads >= toolLimit) {usage.blockedToolReads++;return false;}
      usage.toolReads++;return true;
    },
    usage: () => ({...usage}),
  };
}
