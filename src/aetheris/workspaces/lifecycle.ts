/**
 * Deal workspace rules, mirrored from drizzle/migrations/0058_deal_workspaces.sql and 0059_deal_workspace_business_roles.sql. The database
 * is the authority; these helpers only decide what the UI offers and validate input before a
 * write is attempted, so a member gets a clear message instead of a rejected call.
 */

export const WORKSPACE_STATUSES = [
  "qualified",
  "proposal",
  "agreed",
  "in_progress",
  "delivered",
  "accepted",
  "closed",
  "cancelled",
] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];
export type WorkspaceRole = "owner" | "counterparty";
/** Business party. Independent of owner/counterparty: nobody's party is inferred from who opened the room. */
export type WorkspaceParty = "buyer" | "provider";
export type WorkspaceSource = "dm_thread" | "intro_request";
export type WorkspaceAction =
  | "edit_draft"
  | "manage_roster"
  | "move_stage"
  | "cancel"
  | "close"
  | "step"
  | "next_action"
  | "leave"
  | "propose_parties"
  | "accept_parties"
  | "submit_proposal"
  | "approve_proposal"
  | "decline_proposal"
  | "start_work"
  | "submit_delivery"
  | "accept_delivery"
  | "reject_delivery";

/** Room-admin matrix, mirrored from deal_workspace_role_may(). It confers no business approval. */
const ROLE_MAY: Record<WorkspaceRole, readonly WorkspaceAction[]> = {
  owner: [
    "edit_draft",
    "manage_roster",
    "move_stage",
    "cancel",
    "close",
    "step",
    "next_action",
    "propose_parties",
    "accept_parties",
  ],
  counterparty: ["step", "next_action", "leave", "propose_parties", "accept_parties"],
};
/** Party matrix, mirrored from deal_workspace_party_may(): approvals and delivery belong to the parties only. */
const PARTY_MAY: Record<WorkspaceParty, readonly WorkspaceAction[]> = {
  buyer: [
    "submit_proposal",
    "approve_proposal",
    "decline_proposal",
    "accept_delivery",
    "reject_delivery",
  ],
  provider: [
    "submit_proposal",
    "approve_proposal",
    "decline_proposal",
    "start_work",
    "submit_delivery",
  ],
};
/** Mirrored from deal_workspace_action_needs_parties(): blocked until both people accepted their business roles. */
const NEEDS_PARTIES: readonly WorkspaceAction[] = [
  "submit_proposal",
  "approve_proposal",
  "decline_proposal",
  "start_work",
  "submit_delivery",
  "accept_delivery",
  "reject_delivery",
];

export const roleMay = (role: WorkspaceRole | null, action: WorkspaceAction) =>
  !!role && ROLE_MAY[role].includes(action);
/** `partiesEstablished` = both active members hold distinct, accepted parties. */
export const may = (
  role: WorkspaceRole | null,
  party: WorkspaceParty | null,
  action: WorkspaceAction,
  partiesEstablished: boolean,
) =>
  !!role &&
  (!NEEDS_PARTIES.includes(action) || partiesEstablished) &&
  (roleMay(role, action) || (!!party && PARTY_MAY[party].includes(action)));

export const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  qualified: "Qualified",
  proposal: "Proposal",
  agreed: "Agreed",
  in_progress: "In progress",
  delivered: "Delivered",
  accepted: "Accepted",
  closed: "Closed",
  cancelled: "Cancelled",
};

const NEXT: Record<WorkspaceStatus, readonly WorkspaceStatus[]> = {
  qualified: ["proposal", "cancelled"],
  proposal: ["agreed", "in_progress", "delivered", "qualified", "cancelled"],
  agreed: ["in_progress", "proposal", "cancelled"],
  in_progress: ["delivered", "proposal", "cancelled"],
  delivered: ["accepted", "in_progress", "proposal", "cancelled"],
  accepted: ["closed"],
  closed: [],
  cancelled: [],
};

export const isWorkspaceStatus = (v: unknown): v is WorkspaceStatus =>
  typeof v === "string" && (WORKSPACE_STATUSES as readonly string[]).includes(v);
export const canTransition = (from: WorkspaceStatus, to: WorkspaceStatus) =>
  NEXT[from].includes(to);
export const isFinished = (s: WorkspaceStatus) => s === "closed" || s === "cancelled";

/** Stages reached only through proposals, both-party approval, delivery records or the buyer's acceptance. */
export const GUARDED_STAGES: readonly WorkspaceStatus[] = [
  "proposal",
  "agreed",
  "delivered",
  "accepted",
];

export type StageAction =
  | { kind: "move"; to: WorkspaceStatus }
  | { kind: "start_work" }
  | { kind: "submit_delivery" }
  | { kind: "accept_delivery" }
  | { kind: "reject_delivery" };

export interface Standing {
  role: WorkspaceRole | null;
  party: WorkspaceParty | null;
  partiesEstablished: boolean;
}

/**
 * Stage actions the signed-in participant may make. Provider starts work and submits delivery,
 * buyer accepts or rejects it, the owner only cancels or closes. Proposals and their approval are
 * separate (see canSubmitProposal / canApprove).
 */
export function stageActions(
  status: WorkspaceStatus,
  who: Standing,
  awaitingReapproval = false,
): StageAction[] {
  if (!who.role || awaitingReapproval) return [];
  const out: StageAction[] = [];
  const can = (a: WorkspaceAction) => may(who.role, who.party, a, who.partiesEstablished);
  if (status === "agreed" && can("start_work")) out.push({ kind: "start_work" });
  if (status === "in_progress" && can("submit_delivery")) out.push({ kind: "submit_delivery" });
  if (status === "delivered" && can("accept_delivery")) out.push({ kind: "accept_delivery" });
  if (status === "delivered" && can("reject_delivery")) out.push({ kind: "reject_delivery" });
  if (status === "accepted" && can("close")) out.push({ kind: "move", to: "closed" });
  if (!["accepted", "closed", "cancelled"].includes(status) && can("cancel"))
    out.push({ kind: "move", to: "cancelled" });
  return out;
}

/** Either established party proposes terms or a versioned change until delivery is accepted. */
export const canSubmitProposal = (status: WorkspaceStatus, who: Standing) =>
  may(who.role, who.party, "submit_proposal", who.partiesEstablished) &&
  !["accepted", "closed", "cancelled"].includes(status);
/** Terms are edited in place only while the workspace is still a draft, by the owner. */
export const canEditDraft = (status: WorkspaceStatus, role: WorkspaceRole | null) =>
  roleMay(role, "edit_draft") && status === "qualified";
/** Each party approves for itself, once per version. */
export const canApprove = (who: Standing, hasOpenProposal: boolean, alreadyApproved: boolean) =>
  hasOpenProposal &&
  !alreadyApproved &&
  may(who.role, who.party, "approve_proposal", who.partiesEstablished);
export const canDeclineProposal = (who: Standing, hasOpenProposal: boolean) =>
  hasOpenProposal && may(who.role, who.party, "decline_proposal", who.partiesEstablished);

export const CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "chf", "jpy"] as const;

export interface WorkspaceInput {
  title: string;
  scope: string;
  nextAction: string;
  budget: string;
  currency: string;
  dueOn: string;
}
export interface ValidInput {
  title: string;
  scope: string;
  nextAction: string;
  budgetCents: number | null;
  currency: string | null;
  dueOn: string | null;
}

/** Major units ("12,500.50") to cents. Null when blank, NaN-free: invalid input returns undefined. */
export function parseBudget(raw: string): number | null | undefined {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(t)) return undefined;
  const cents = Math.round(Number(t) * 100);
  return cents <= 100_000_000_000 ? cents : undefined;
}

export function validateWorkspaceInput(
  i: WorkspaceInput,
):
  | { ok: true; value: ValidInput }
  | { ok: false; errors: Partial<Record<keyof WorkspaceInput, string>> } {
  const errors: Partial<Record<keyof WorkspaceInput, string>> = {};
  const title = i.title.trim();
  if (title.length < 3 || title.length > 160)
    errors.title = "Give the workspace a title of 3 to 160 characters.";
  if (i.scope.trim().length > 4000) errors.scope = "Keep the scope under 4,000 characters.";
  if (i.nextAction.trim().length > 500)
    errors.nextAction = "Keep the next action under 500 characters.";
  const budget = parseBudget(i.budget);
  if (budget === undefined) errors.budget = "Enter an amount like 12500 or 12500.50.";
  const currency = i.currency.trim().toLowerCase();
  if (budget != null && !/^[a-z]{3}$/.test(currency))
    errors.currency = "Choose a currency for the budget.";
  const dueOn = i.dueOn.trim();
  if (
    dueOn &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) ||
      Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`)) ||
      new Date(`${dueOn}T00:00:00Z`).toISOString().slice(0, 10) !== dueOn)
  )
    errors.dueOn = "Use a real date.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      scope: i.scope.trim(),
      nextAction: i.nextAction.trim(),
      budgetCents: budget ?? null,
      currency: budget == null ? null : currency,
      dueOn: dueOn || null,
    },
  };
}

export function formatBudget(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (cents == null || !currency) return "No budget set";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** Honest wording for what a stage does and does not mean. Nothing here records money moving. */
export function stageNote(s: WorkspaceStatus): string {
  switch (s) {
    case "agreed":
      return "Both parties approved the same terms version here. This is not a signed contract.";
    case "accepted":
      return "The buyer recorded acceptance of a delivery here. No payment is recorded.";
    case "closed":
      return "Closed. Payment is not tracked in this workspace.";
    case "cancelled":
      return "Cancelled by the owner.";
    default:
      return "";
  }
}
