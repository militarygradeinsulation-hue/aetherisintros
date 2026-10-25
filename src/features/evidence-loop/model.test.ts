import { describe, it, expect } from "vitest";
import { activeTick, weeklySummary, type TimeRecord } from "./model";
import { newcomerEligible, newcomerLane, outcomeWeight, outcomeScore } from "./matching";
import { scoreMatch } from "@/aetheris/matching";
import { members } from "@/aetheris/social";
const now = Date.parse("2026-10-25T12:00:00Z");
const record: TimeRecord = {
  id: "a",
  task: "contact",
  started_at: "2026-10-25T11:00:00Z",
  finished_at: "2026-10-25T11:05:00Z",
  active_seconds: 300,
  baseline_seconds: 120,
  baseline_kind: "observed",
  baseline_samples: 3,
};
describe("Honest time accounting", () => {
  it("keeps negative comparisons, excludes unfinished and out-of-window tasks, separates estimates", () => {
    const s = weeklySummary(
      [
        record,
        { ...record, id: "b", baseline_kind: "estimate" },
        { ...record, id: "c", baseline_seconds: null },
        { ...record, id: "d", finished_at: null },
        { ...record, id: "e", finished_at: "2026-10-01T00:00:00Z" },
      ],
      now,
    );
    expect(s.count).toBe(3);
    expect(s.activeSeconds).toBe(900);
    expect(s.observedDelta).toBe(-180);
    expect(s.estimatedDelta).toBe(-180);
    expect(s.unpaired).toBe(1);
    expect(weeklySummary([], now).observedDelta).toBeNull();
  });
  it("excludes background, idle and suspended browser intervals", () => {
    expect(activeTick(1000, 0, 0, true, true)).toBe(1000);
    expect(activeTick(1000, 0, 0, false, true)).toBe(0);
    expect(activeTick(1000, 0, 0, true, false)).toBe(0);
    expect(activeTick(70000, 0, 0, true, true)).toBe(0);
    expect(activeTick(50000, 0, 50000, true, true)).toBe(2000);
  });
});
describe("Evidence ranking and newcomer exposure", () => {
  const evidence = {
    confirmedPartners: 3,
    successfulPartners: 3,
    newcomerUntil: new Date(now + 86400000).toISOString(),
    approvedVouches: 0,
  };
  it("requires independent sample size, smooths and caps weights", () => {
    expect(outcomeWeight({ ...evidence, confirmedPartners: 2, successfulPartners: 2 })).toBe(0);
    expect(outcomeWeight({ ...evidence, successfulPartners: 9 })).toBe(0);
    expect(outcomeWeight(evidence)).toBeCloseTo(0.045);
    expect(outcomeWeight({ ...evidence, confirmedPartners: 1000 })).toBeLessThanOrEqual(0.12);
    expect(outcomeScore(evidence)).toBeLessThan(100);
    const match = scoreMatch(
      { industries: ["Professional services"], expertise: [] } as never,
      { ...members[0]!, matchEvidence: evidence },
      { members: [], connections: [] },
    );
    expect(match.components.reduce((n, c) => n + c.weight, 0)).toBeCloseTo(1);
    expect(match.components.find((c) => c.label === "Strategic relevance")!.weight).toBeLessThan(
      0.24,
    );
  });
  it("cannot make irrelevant, expired, future-forged or unavailable newcomers eligible", () => {
    expect(newcomerEligible(evidence, 30, 45, now)).toBe(true);
    expect(newcomerEligible(evidence, 0, 90, now)).toBe(false);
    expect(newcomerEligible(evidence, 90, 0, now)).toBe(false);
    expect(
      newcomerEligible(
        { ...evidence, newcomerUntil: new Date(now - 1).toISOString() },
        90,
        90,
        now,
      ),
    ).toBe(false);
    expect(
      newcomerEligible(
        { ...evidence, newcomerUntil: new Date(now + 31 * 86400000).toISOString() },
        90,
        90,
        now,
      ),
    ).toBe(false);
  });
  it("does not interpret unavailable as an invitation", () => {
    const match=scoreMatch({industries:['Professional services'],expertise:[]} as never,{...members[0]!,availability:'Not currently available',matchEvidence:evidence},{members:[],connections:[]})
    expect(match.components.find(c=>c.label==='Availability')?.score).toBe(0)
    expect(match.newcomerEligible).toBe(false)
  })
  it("reserves slots with deterministic rotation without duplication or score fabrication", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: String(i).padStart(2, "0"),
      score: 100 - i,
      newcomer: i > 7,
    }));
    const rank = (day: number) =>
      newcomerLane(
        rows,
        (r) => r.id,
        (r) => r.newcomer,
        day,
      );
    expect(rank(0)[2]?.newcomer).toBe(true);
    expect(rank(0)[7]?.newcomer).toBe(true);
    expect(new Set(rank(0).map((r) => r.id)).size).toBe(rows.length);
    expect(rank(0)[2]?.id).not.toBe(rank(1)[2]?.id);
    expect(rank(0).every((r) => rows.includes(r))).toBe(true);
    expect(
      newcomerLane(
        rows,
        (r) => r.id,
        () => false,
      ),
    ).toBe(rows);
  });
});
