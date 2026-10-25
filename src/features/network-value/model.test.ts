import { describe, it, expect } from "vitest";
import { feeBreakdown, networkValueCommand, verdict, type BenchmarkResult } from "./model";
describe("network value contracts", () => {
  it("caps the first invoice fee before splitting the platform share", () => {
    expect(feeBreakdown(10000000, 500, 250000)).toEqual({
      fee: 250000,
      platform: 25000,
      connector: 225000,
    });
    expect(feeBreakdown(100000, 500, 250000)).toEqual({
      fee: 5000,
      platform: 500,
      connector: 4500,
    });
  });
  it("rejects fractional cents, nonfinite values and invalid percentages", () => {
    for (const v of [NaN, Infinity, -1, 1.1]) expect(() => feeBreakdown(v, 500, 250000)).toThrow();
    expect(() => feeBreakdown(1000, 10001, 250000)).toThrow();
    expect(
      networkValueCommand.safeParse({
        action: "benchmark_share",
        metric: "close_percent",
        value: 5,
        consent: false,
      }).success,
    ).toBe(false);
  });
  it("interprets lower response times and higher close rates correctly", () => {
    const base: BenchmarkResult = {
      metric: "response_minutes",
      period: "2026-01-01",
      value: 100,
      median: 30,
      p25: 10,
      p75: 60,
      companies_at_least: 10,
    };
    expect(verdict(base)).toBe("Bottom quartile");
    expect(verdict({ ...base, metric: "close_percent" })).toBe("Top quartile");
    expect(verdict({ ...base, value: 30, p25: 30, p75: 30 })).toBe("At the peer median");
  });
});
