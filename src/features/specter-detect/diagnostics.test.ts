import { describe, expect, it } from "vitest";
import { detectPublicPage } from "./diagnostics";
import { modelAnnualOpportunity } from "./types";
describe("Specter Detect", () => {
  it("does not invent a finding when CTA and heading are present", () => {
    const result = detectPublicPage({ url: "https://example.com/", title: "Example", headings: ["Example"], links: [{ text: "Contact us", href: "/contact" }], capturedAt: "2026-10-21T00:00:00Z" });
    expect(result.findings).toHaveLength(0);
  });
  it("attaches evidence to findings", () => {
    const result = detectPublicPage({ url: "https://example.com/", title: "Example", headings: [], links: [], capturedAt: "2026-10-21T00:00:00Z" });
    expect(result.findings).toHaveLength(2);
    expect(result.findings.every(f => f.evidenceIds.every(id => result.evidence.some(e => e.id === id)))).toBe(true);
  });
  it("calculates an illustrative opportunity and rejects invalid rates", () => {
    expect(modelAnnualOpportunity({ monthlyVisitors: 10000, conversionLiftPoints: 0.5, leadToSaleRate: 10, contributionMarginPerSale: 1500 })).toBe(90000);
    expect(() => modelAnnualOpportunity({ monthlyVisitors: 100, conversionLiftPoints: 120, leadToSaleRate: 10, contributionMarginPerSale: 10 })).toThrow();
  });
});
