import { describe, expect, it } from "vitest";
import { z } from "zod";
import { exchangeRow, exchangeKinds, exchangeReadableKinds } from "../exchange-contract";
import type { OpportunityKind } from "../domain/pro-models";

const kinds: OpportunityKind[] = [
  "Partnership",
  "Advisory role",
  "Board seat",
  "Acquisition",
  "Succession",
  "Hiring",
  "Investment",
  "Distribution",
  "Pilot",
  "Consulting",
  "Supplier relationship",
  "Licensing",
  "Speaking",
  "Joint venture",
  "Strategic introduction",
  "Expert request",
  "Capital deployment",
];
const row = {
  id: "existing-opportunity",
  ownerId: "00000000-0000-4000-8000-00000000000a",
  visibility: "network",
  createdAt: "2026-10-18T00:00:00Z",
  title: "Existing opportunity",
  objective: "Work together",
  whatIsNeeded: "Expertise",
  whatIsOffered: "Project access",
  mutualValue: "Shared pilot",
  expiresOn: "2026-11-01",
  status: "open",
  saved: false,
  interest: [],
};

describe("shared exchange compatibility", () => {
  it("reads a mixed list of all existing domain opportunity kinds", () => {
    const parsed = z.array(exchangeRow).parse(kinds.map((kind) => ({ ...row, id: kind, kind })));
    expect(parsed.map((p) => p.kind)).toEqual(kinds);
    expect(new Set(exchangeReadableKinds)).toEqual(new Set(kinds));
  });
  it("does not broaden the initial publisher form when reading legacy kinds", () => {
    expect(exchangeKinds).not.toContain("Distribution");
    expect(exchangeKinds).not.toContain("Succession");
    expect(exchangeKinds).not.toContain("Speaking");
    for (const kind of exchangeKinds) expect(exchangeReadableKinds).toContain(kind);
  });
  it("rejects malformed responses and unknown kinds without inventing records", () => {
    expect(exchangeRow.safeParse({ ...row, kind: "invented" }).success).toBe(false);
    expect(
      exchangeRow.safeParse({ ...row, kind: "Partnership", interest: "private data" }).success,
    ).toBe(false);
  });
});
