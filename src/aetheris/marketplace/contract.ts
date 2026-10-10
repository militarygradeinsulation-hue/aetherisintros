export type RequestAudience = "approved_members" | "invited_providers";
export type RequestState = "draft" | "open" | "paused" | "closed" | "awarded" | "cancelled";
export type ResponseState =
  "draft" | "submitted" | "shortlisted" | "selected" | "declined" | "withdrawn";

export interface RequestRequirement {
  id: string;
  label: string;
  kind: "hard" | "preference";
}

export interface BuyerQuestion {
  id: string;
  question: string;
  required: boolean;
}

export interface RequestBudget {
  minimum?: number;
  maximum?: number;
  currency: string;
}

export interface MarketplaceRequestDraft {
  title: string;
  scope: string;
  desiredOutcome: string;
  category: string;
  location: { region: string; remoteEligible: boolean };
  capabilities: string[];
  requirements: RequestRequirement[];
  buyerQuestions: BuyerQuestion[];
  budget: RequestBudget | null;
  deliveryBy: string | null;
  closesAt: string;
  closingTimezone: string;
  responseCap: number;
  audience: RequestAudience;
}

export interface RequirementClaim {
  requirementId: string;
  claim: "confirmed" | "unknown";
  evidenceRefs: string[];
}

export interface MarketplaceResponse {
  id: string;
  idempotencyKey: string;
  requestId: string;
  providerPartyId: string;
  state: ResponseState;
  requestVersion: number;
  acknowledgedVersion: number | null;
  approach: string;
  evidenceRefs: string[];
  availability: string;
  pricingBasis: string;
  assumptions: string;
  exclusions: string;
  answers: Array<{ questionId: string; answer: string }>;
  requirementClaims: RequirementClaim[];
}

export interface ValidationIssue {
  field: string;
  message: string;
}

const requestKeys = new Set([
  "title",
  "scope",
  "desiredOutcome",
  "category",
  "location",
  "capabilities",
  "requirements",
  "buyerQuestions",
  "budget",
  "deliveryBy",
  "closesAt",
  "closingTimezone",
  "responseCap",
  "audience",
]);

const boundedText = (value: unknown, minimum: number, maximum: number) =>
  typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function validateTextList(value: unknown, field: string, issues: ValidationIssue[]) {
  if (
    !Array.isArray(value) ||
    value.length > 20 ||
    value.some((item) => !boundedText(item, 1, 120))
  ) {
    issues.push({ field, message: "Use up to 20 non-empty entries of 120 characters or fewer." });
  }
}

/** Client-side shape checks only. The database clock must decide whether a request is open. */
export function validateRequestDraft(input: unknown, now = Date.now()): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return [{ field: "request", message: "Enter a request." }];

  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key))
      issues.push({ field: key, message: "This field is not part of the public request." });
  }

  if (!boundedText(input["title"], 5, 160))
    issues.push({ field: "title", message: "Use 5–160 characters." });
  if (!boundedText(input["scope"], 20, 5000))
    issues.push({ field: "scope", message: "Describe the scope in 20–5,000 characters." });
  if (!boundedText(input["desiredOutcome"], 10, 1200))
    issues.push({
      field: "desiredOutcome",
      message: "Describe the desired outcome in 10–1,200 characters.",
    });
  if (!boundedText(input["category"], 2, 80))
    issues.push({ field: "category", message: "Choose a category of 2–80 characters." });

  const location = input["location"];
  if (
    !isObject(location) ||
    Object.keys(location).some((key) => !["region", "remoteEligible"].includes(key)) ||
    !boundedText(location["region"], 2, 120) ||
    typeof location["remoteEligible"] !== "boolean"
  ) {
    issues.push({
      field: "location",
      message: "Provide a broad region and explicitly choose remote eligibility.",
    });
  }

  validateTextList(input["capabilities"], "capabilities", issues);

  if (!Array.isArray(input["requirements"]) || input["requirements"].length > 20) {
    issues.push({
      field: "requirements",
      message: "Use up to 20 hard requirements or preferences.",
    });
  } else {
    const ids = new Set<string>();
    input["requirements"].forEach((requirement, index) => {
      if (
        !isObject(requirement) ||
        Object.keys(requirement).some((key) => !["id", "label", "kind"].includes(key)) ||
        !boundedText(requirement["id"], 1, 80) ||
        !boundedText(requirement["label"], 2, 240) ||
        !["hard", "preference"].includes(String(requirement["kind"])) ||
        ids.has(String(requirement["id"]))
      ) {
        issues.push({
          field: `requirements.${index}`,
          message: "Each item needs a unique ID, label, and hard/preference type.",
        });
      } else {
        ids.add(String(requirement["id"]));
      }
    });
  }

  if (!Array.isArray(input["buyerQuestions"]) || input["buyerQuestions"].length > 12) {
    issues.push({ field: "buyerQuestions", message: "Use up to 12 buyer questions." });
  } else {
    const ids = new Set<string>();
    input["buyerQuestions"].forEach((question, index) => {
      if (
        !isObject(question) ||
        Object.keys(question).some((key) => !["id", "question", "required"].includes(key)) ||
        !boundedText(question["id"], 1, 80) ||
        !boundedText(question["question"], 5, 300) ||
        typeof question["required"] !== "boolean" ||
        ids.has(String(question["id"]))
      ) {
        issues.push({
          field: `buyerQuestions.${index}`,
          message: "Each question needs a unique ID, prompt, and required setting.",
        });
      } else {
        ids.add(String(question["id"]));
      }
    });
  }

  if (input["budget"] !== null) {
    const budget = input["budget"];
    if (
      !isObject(budget) ||
      Object.keys(budget).some((key) => !["minimum", "maximum", "currency"].includes(key)) ||
      (budget["minimum"] === undefined && budget["maximum"] === undefined) ||
      (budget["minimum"] !== undefined &&
        (typeof budget["minimum"] !== "number" ||
          !Number.isFinite(budget["minimum"]) ||
          budget["minimum"] <= 0)) ||
      (budget["maximum"] !== undefined &&
        (typeof budget["maximum"] !== "number" ||
          !Number.isFinite(budget["maximum"]) ||
          budget["maximum"] <= 0)) ||
      (budget["minimum"] !== undefined &&
        budget["maximum"] !== undefined &&
        Number(budget["minimum"]) > Number(budget["maximum"])) ||
      typeof budget["currency"] !== "string" ||
      !/^[A-Z]{3}$/.test(budget["currency"])
    ) {
      issues.push({
        field: "budget",
        message:
          "Provide a positive budget range and a three-letter currency code, or leave budget empty.",
      });
    }
  }

  if (
    input["deliveryBy"] !== null &&
    (typeof input["deliveryBy"] !== "string" || !validCalendarDate(input["deliveryBy"]))
  ) {
    issues.push({
      field: "deliveryBy",
      message: "Use a valid delivery date (YYYY-MM-DD) or leave it empty.",
    });
  }

  if (
    typeof input["closesAt"] !== "string" ||
    Number.isNaN(Date.parse(input["closesAt"])) ||
    !/(Z|[+-]\d{2}:\d{2})$/i.test(input["closesAt"]) ||
    Date.parse(input["closesAt"]) <= now
  ) {
    issues.push({
      field: "closesAt",
      message: "Choose a future application-closing timestamp with an explicit UTC offset.",
    });
  }
  if (!validTimezone(input["closingTimezone"])) {
    issues.push({ field: "closingTimezone", message: "Choose a valid IANA time zone." });
  }
  if (
    !Number.isInteger(input["responseCap"]) ||
    Number(input["responseCap"]) < 1 ||
    Number(input["responseCap"]) > 500
  ) {
    issues.push({ field: "responseCap", message: "Set a response cap from 1 to 500." });
  }
  if (input["audience"] !== "approved_members" && input["audience"] !== "invited_providers") {
    issues.push({ field: "audience", message: "Choose approved members or invited providers." });
  }

  return issues;
}

const requestTransitions: Record<RequestState, RequestState[]> = {
  draft: ["open", "cancelled"],
  open: ["paused", "closed", "awarded", "cancelled"],
  paused: ["open", "closed", "cancelled"],
  closed: ["awarded", "cancelled"],
  awarded: [],
  cancelled: [],
};

export function canTransitionRequest(from: RequestState, to: RequestState): boolean {
  return requestTransitions[from].includes(to);
}

const responseTransitions: Record<ResponseState, ResponseState[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["shortlisted", "declined", "withdrawn"],
  shortlisted: ["selected", "declined", "withdrawn"],
  selected: [],
  declined: [],
  withdrawn: [],
};

export function canTransitionResponse(
  from: ResponseState,
  to: ResponseState,
  options: { buyerReopened?: boolean } = {},
): boolean {
  return from === "declined" && to === "submitted"
    ? options.buyerReopened === true
    : responseTransitions[from].includes(to);
}

/** Drafts reserve no capacity; declined responses retain it until explicit buyer reopening. */
export function responseOccupiesSlot(state: ResponseState): boolean {
  return state !== "draft" && state !== "withdrawn";
}

export function isResponseCurrent(
  response: MarketplaceResponse,
  currentRequestVersion: number,
): boolean {
  return (
    response.requestVersion === currentRequestVersion &&
    response.acknowledgedVersion === currentRequestVersion
  );
}

export function validateResponseSubmission(
  response: MarketplaceResponse,
  requiredQuestionIds: string[],
  requirementIds: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!boundedText(response.approach, 20, 5000))
    issues.push({ field: "approach", message: "Describe the approach in 20–5,000 characters." });
  if (
    !Array.isArray(response.evidenceRefs) ||
    response.evidenceRefs.length > 20 ||
    response.evidenceRefs.some((ref) => !boundedText(ref, 1, 500))
  ) {
    issues.push({
      field: "evidenceRefs",
      message: "Use up to 20 non-empty evidence references of 500 characters or fewer.",
    });
  }
  if (!boundedText(response.availability, 2, 1200))
    issues.push({
      field: "availability",
      message: "Describe availability or state that it is unknown.",
    });
  if (!boundedText(response.pricingBasis, 2, 1200))
    issues.push({
      field: "pricingBasis",
      message: "Describe the pricing basis or state that it is unknown.",
    });
  if (!boundedText(response.assumptions, 2, 2000))
    issues.push({
      field: "assumptions",
      message: "Describe assumptions or state that there are none.",
    });
  if (!boundedText(response.exclusions, 2, 2000))
    issues.push({
      field: "exclusions",
      message: "Describe exclusions or state that there are none.",
    });

  if (!Array.isArray(response.answers)) {
    issues.push({ field: "answers", message: "Provide answers to the request questions." });
  } else {
    const answerIds = new Set<string>();
    response.answers.forEach((answer, index) => {
      if (
        !isObject(answer) ||
        !boundedText(answer.questionId, 1, 80) ||
        !boundedText(answer.answer, 1, 2000) ||
        answerIds.has(String(answer.questionId)) ||
        !requiredQuestionIds.includes(String(answer.questionId))
      ) {
        issues.push({
          field: `answers.${index}`,
          message: "Answers must use a request question ID once and contain text.",
        });
      } else {
        answerIds.add(String(answer.questionId));
      }
    });
    requiredQuestionIds.forEach((id) => {
      if (!answerIds.has(id))
        issues.push({
          field: `answers.${id}`,
          message: "Answer this buyer question before submitting.",
        });
    });
  }

  if (!Array.isArray(response.requirementClaims)) {
    issues.push({
      field: "requirementClaims",
      message: "State confirmed or unknown for each listed requirement.",
    });
  } else {
    const claimIds = new Set<string>();
    response.requirementClaims.forEach((claim, index) => {
      if (
        !isObject(claim) ||
        !boundedText(claim.requirementId, 1, 80) ||
        !requirementIds.includes(String(claim.requirementId)) ||
        (claim.claim !== "confirmed" && claim.claim !== "unknown") ||
        !Array.isArray(claim.evidenceRefs) ||
        claim.evidenceRefs.length > 20 ||
        claim.evidenceRefs.some((ref) => !boundedText(ref, 1, 500)) ||
        (claim.claim === "confirmed" && claim.evidenceRefs.length === 0) ||
        claimIds.has(String(claim.requirementId))
      ) {
        issues.push({
          field: `requirementClaims.${index}`,
          message:
            "Use each request requirement once; confirmed claims need evidence and unknown claims remain explicit.",
        });
      } else {
        claimIds.add(String(claim.requirementId));
      }
    });
    requirementIds.forEach((id) => {
      if (!claimIds.has(id))
        issues.push({
          field: `requirementClaims.${id}`,
          message: "State whether this requirement is confirmed or unknown.",
        });
    });
  }

  return issues;
}

export type SubmissionDecision =
  | { accepted: true; duplicate: true; existing: MarketplaceResponse }
  | { accepted: true; duplicate: false }
  | {
      accepted: false;
      reason:
        | "idempotency_conflict"
        | "provider_has_active_response"
        | "capacity_full"
        | "invalid_submission"
        | "stale_version";
    };

/** A deterministic preflight only; the production database must repeat it atomically under lock. */
export function evaluateSubmission(
  existing: MarketplaceResponse[],
  candidate: MarketplaceResponse,
  responseCap: number,
  currentRequestVersion: number,
): SubmissionDecision {
  if (candidate.state !== "submitted" || !candidate.idempotencyKey || responseCap < 1) {
    return { accepted: false, reason: "invalid_submission" };
  }

  const retry = existing.find((response) => response.idempotencyKey === candidate.idempotencyKey);
  if (retry) {
    const sameOperation =
      retry.requestId === candidate.requestId &&
      retry.providerPartyId === candidate.providerPartyId;
    return sameOperation
      ? { accepted: true, duplicate: true, existing: retry }
      : { accepted: false, reason: "idempotency_conflict" };
  }

  if (!isResponseCurrent(candidate, currentRequestVersion)) {
    return { accepted: false, reason: "stale_version" };
  }

  const sameRequest = existing.filter((response) => response.requestId === candidate.requestId);
  if (
    sameRequest.some(
      (response) =>
        response.providerPartyId === candidate.providerPartyId && response.state !== "withdrawn",
    )
  ) {
    return { accepted: false, reason: "provider_has_active_response" };
  }
  if (
    sameRequest.filter((response) => responseOccupiesSlot(response.state)).length >= responseCap
  ) {
    return { accepted: false, reason: "capacity_full" };
  }
  return { accepted: true, duplicate: false };
}

export function canSelectResponse(
  responses: MarketplaceResponse[],
  responseId: string,
  currentRequestVersion: number,
): boolean {
  const target = responses.find((response) => response.id === responseId);
  if (
    !target ||
    target.state !== "shortlisted" ||
    !isResponseCurrent(target, currentRequestVersion)
  )
    return false;
  return !responses.some(
    (response) => response.requestId === target.requestId && response.state === "selected",
  );
}
