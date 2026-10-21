export type EvidenceStatus = "observed" | "inferred" | "unverified";
export type FindingSeverity = "low" | "medium" | "high";
export interface SpecterEvidence { id: string; url: string; excerpt: string; observedAt: string; selector?: string; }
export interface SpecterFinding { id: string; title: string; category: string; status: EvidenceStatus; severity: FindingSeverity; confidence: number; evidenceIds: string[]; recommendation: string; }
export interface SpecterScan { id: string; targetUrl: string; status: "pending" | "complete" | "failed"; evidence: SpecterEvidence[]; findings: SpecterFinding[]; }
export interface ImpactInputs { monthlyVisitors: number; conversionLiftPoints: number; leadToSaleRate: number; contributionMarginPerSale: number; }
export function modelAnnualOpportunity(input: ImpactInputs): number {
  const values = Object.values(input);
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error("Invalid impact inputs");
  if (input.conversionLiftPoints > 100 || input.leadToSaleRate > 100) throw new Error("Rates must be 0–100");
  return input.monthlyVisitors * 12 * (input.conversionLiftPoints / 100) * (input.leadToSaleRate / 100) * input.contributionMarginPerSale;
}
