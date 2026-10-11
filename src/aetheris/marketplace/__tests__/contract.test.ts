import { describe, expect, it } from "vitest";

import {
  canSelectResponse,
  canTransitionRequest,
  canTransitionResponse,
  evaluateSubmission,
  isResponseCurrent,
  responseOccupiesSlot,
  validateRequestDraft,
  validateResponseSubmission,
  type MarketplaceRequestDraft,
  type MarketplaceResponse,
} from "../contract";

const now = Date.parse("2026-10-10T00:00:00.000Z");

const request: MarketplaceRequestDraft = {
  title: "Independent security assessment",
  scope: "Assess the member portal and deliver a prioritized written remediation plan.",
  desiredOutcome: "A reviewed report with evidence-backed remediation priorities.",
  category: "Security",
  location: { region: "North America", remoteEligible: true },
  capabilities: ["Application security"],
  requirements: [
    { id: "must-license", label: "Holds an active security license", kind: "hard" },
    { id: "prefer-health", label: "Experience in healthcare", kind: "preference" },
  ],
  buyerQuestions: [
    { id: "question-approach", question: "How would you scope the first week?", required: true },
  ],
  budget: { minimum: 1000, maximum: 5000, currency: "USD" },
  deliveryBy: "2026-12-15",
  closesAt: "2026-11-01T17:00:00-04:00",
  closingTimezone: "America/New_York",
  responseCap: 12,
  audience: "invited_providers",
};

function response(overrides: Partial<MarketplaceResponse> = {}): MarketplaceResponse {
  return {
    id: "response-a",
    idempotencyKey: "submit-a",
    requestId: "request-a",
    providerPartyId: "provider-a",
    state: "shortlisted",
    requestVersion: 2,
    acknowledgedVersion: 2,
    approach:
      "Review the application boundary, test the authorized flows, and report reproducible findings.",
    evidenceRefs: ["evidence:assessment-1"],
    availability: "Available in November.",
    pricingBasis: "Fixed fee for the described scope.",
    assumptions: "Test environment and access will be supplied.",
    exclusions: "Production testing is excluded.",
    answers: [
      { questionId: "question-approach", answer: "Start with a short access and scope workshop." },
    ],
    requirementClaims: [
      { requirementId: "must-license", claim: "confirmed", evidenceRefs: ["evidence:license-1"] },
      { requirementId: "prefer-health", claim: "unknown", evidenceRefs: [] },
    ],
    ...overrides,
  };
}

function submission(overrides: Partial<MarketplaceResponse> = {}): MarketplaceResponse {
  return response({ state: "submitted", ...overrides });
}

describe("reverse marketplace contract", () => {
  it("accepts an explicitly bounded request and keeps close time separate from delivery date", () => {
    expect(validateRequestDraft(request, now)).toEqual([]);
    expect(request.closesAt).not.toBe(request.deliveryBy);
  });

  it("rejects unknown public fields rather than passing private context through", () => {
    const issues = validateRequestDraft(
      { ...request, privateNotes: "private buyer contact data" },
      now,
    );
    expect(issues).toContainEqual({
      field: "privateNotes",
      message: "This field is not part of the public request.",
    });
  });

  it("rejects invalid budget ranges, dates, close time, and time zone", () => {
    const issues = validateRequestDraft(
      {
        ...request,
        budget: { minimum: 5000, maximum: 1000, currency: "USD" },
        deliveryBy: "2026-02-30",
        closesAt: "2026-10-10T00:00:00Z",
        closingTimezone: "Not/A_Timezone",
      },
      now,
    );
    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["budget", "deliveryBy", "closesAt", "closingTimezone"]),
    );
  });

  it("requires valid explicit hard/preference categories and rejects repeated requirement IDs", () => {
    const issues = validateRequestDraft(
      {
        ...request,
        requirements: [
          { id: "same", label: "Required experience", kind: "hard" },
          { id: "same", label: "Preferred experience", kind: "preference" },
          { id: "inferred", label: "Inferred expertise", kind: "score" },
        ],
      },
      now,
    );
    expect(issues.filter((issue) => issue.field.startsWith("requirements."))).toHaveLength(2);
  });

  it("requires complete structured responses and evidence for confirmed qualification claims", () => {
    const issues = validateResponseSubmission(
      response({
        requirementClaims: [
          { requirementId: "must-license", claim: "confirmed", evidenceRefs: [] },
          { requirementId: "prefer-health", claim: "unknown", evidenceRefs: [] },
        ],
        answers: [],
      }),
      ["question-approach"],
      ["must-license", "prefer-health"],
    );
    expect(issues.map((issue) => issue.field)).toContain("requirementClaims.0");
    expect(issues.map((issue) => issue.field)).toContain("answers.question-approach");
  });

  it("keeps changed-version responses stale until the provider acknowledges the current version", () => {
    const stale = response({ requestVersion: 1, acknowledgedVersion: 1 });
    expect(isResponseCurrent(stale, 2)).toBe(false);
    expect(isResponseCurrent(response(), 2)).toBe(true);
    expect(canSelectResponse([stale], stale.id, 2)).toBe(false);
  });

  it("enforces request and response transitions, including explicit reopening of a decline", () => {
    expect(canTransitionRequest("draft", "open")).toBe(true);
    expect(canTransitionRequest("awarded", "open")).toBe(false);
    expect(canTransitionResponse("submitted", "shortlisted")).toBe(true);
    expect(canTransitionResponse("declined", "submitted")).toBe(false);
    expect(canTransitionResponse("declined", "submitted", { buyerReopened: true })).toBe(true);
  });

  it("does not reserve capacity for drafts and retains declined capacity until withdrawal", () => {
    expect(responseOccupiesSlot("draft")).toBe(false);
    expect(responseOccupiesSlot("declined")).toBe(true);
    expect(responseOccupiesSlot("withdrawn")).toBe(false);
  });

  it("treats retries idempotently, enforces one active provider response, and respects capacity", () => {
    const submitted = submission();
    const retry = evaluateSubmission([submitted], submitted, 1, 2);
    expect(retry).toMatchObject({ accepted: true, duplicate: true, existing: submitted });

    expect(
      evaluateSubmission(
        [submitted],
        submission({ id: "response-b", idempotencyKey: "retry-b" }),
        5,
        2,
      ),
    ).toMatchObject({ accepted: false, reason: "provider_has_active_response" });

    const declined = response({ state: "declined", providerPartyId: "provider-b" });
    expect(
      evaluateSubmission(
        [declined],
        submission({ providerPartyId: "provider-c", idempotencyKey: "submit-c" }),
        1,
        2,
      ),
    ).toMatchObject({ accepted: false, reason: "capacity_full" });
    expect(
      evaluateSubmission(
        [declined],
        submission({ providerPartyId: "provider-c", idempotencyKey: "submit-c" }),
        2,
        2,
      ),
    ).toMatchObject({ accepted: true, duplicate: false });
    expect(
      evaluateSubmission(
        [{ ...declined, state: "withdrawn" }],
        submission({
          providerPartyId: "provider-c",
          idempotencyKey: "submit-c",
        }),
        1,
        2,
      ),
    ).toMatchObject({ accepted: true, duplicate: false });
    expect(
      evaluateSubmission([], submission({ requestVersion: 1, acknowledgedVersion: 1 }), 2, 2),
    ).toMatchObject({ accepted: false, reason: "stale_version" });
  });

  it("allows at most one current shortlisted response to be selected", () => {
    const first = response({ id: "one", state: "shortlisted" });
    const second = response({ id: "two", providerPartyId: "provider-b", state: "shortlisted" });
    expect(canSelectResponse([first, second], first.id, 2)).toBe(true);
    expect(canSelectResponse([{ ...first, state: "selected" }, second], second.id, 2)).toBe(false);
  });
});
