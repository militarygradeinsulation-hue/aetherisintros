import { describe, expect, it } from "vitest";
import {
  WORKSPACE_STATUSES,
  canApprove,
  canDeclineProposal,
  canEditDraft,
  canSubmitProposal,
  canTransition,
  formatBudget,
  isFinished,
  may,
  parseBudget,
  roleMay,
  stageActions,
  validateWorkspaceInput,
  type Standing,
  type WorkspaceInput,
  type WorkspaceStatus,
} from "../workspaces/lifecycle";

const base: WorkspaceInput = {
  title: "Logistics audit",
  scope: "",
  nextAction: "",
  budget: "",
  currency: "usd",
  dueOn: "",
};

describe("workspace lifecycle", () => {
  it("lists the eight stages in order", () => {
    expect([...WORKSPACE_STATUSES]).toEqual([
      "qualified",
      "proposal",
      "agreed",
      "in_progress",
      "delivered",
      "accepted",
      "closed",
      "cancelled",
    ]);
  });
  it("only allows the documented moves", () => {
    expect(canTransition("qualified", "proposal")).toBe(true);
    expect(canTransition("qualified", "delivered")).toBe(false);
    expect(canTransition("proposal", "qualified")).toBe(true);
    expect(canTransition("agreed", "proposal")).toBe(true); // re-approval after agreement
    expect(canTransition("delivered", "proposal")).toBe(true);
    expect(canTransition("agreed", "delivered")).toBe(false);
    expect(canTransition("delivered", "in_progress")).toBe(true);
    expect(canTransition("accepted", "cancelled")).toBe(false);
    expect(canTransition("accepted", "closed")).toBe(true);
  });
  it("treats closed and cancelled as terminal", () => {
    for (const to of WORKSPACE_STATUSES) {
      expect(canTransition("closed", to)).toBe(false);
      expect(canTransition("cancelled", to)).toBe(false);
    }
    expect(isFinished("closed")).toBe(true);
    expect(isFinished("in_progress")).toBe(false);
  });
  it("never lets a stage move to itself", () => {
    for (const s of WORKSPACE_STATUSES) expect(canTransition(s, s)).toBe(false);
  });
  const std = (
    role: Standing["role"],
    party: Standing["party"],
    partiesEstablished = true,
  ): Standing => ({ role, party, partiesEstablished });
  const ownerProvider = std("owner", "provider");
  const buyer = std("counterparty", "buyer");
  const ownerBuyer = std("owner", "buyer");
  it("keeps proposal, agreed, delivered and accepted out of plain moves", () => {
    for (const st of WORKSPACE_STATUSES)
      for (const who of [ownerProvider, buyer, ownerBuyer, std("counterparty", "provider")])
        for (const a of stageActions(st, who))
          if (a.kind === "move")
            expect(["proposal", "agreed", "delivered", "accepted", "in_progress"]).not.toContain(
              a.to,
            );
  });
  it("gives the provider start and delivery, and the buyer acceptance, whoever owns the room", () => {
    expect(stageActions("agreed", ownerProvider)).toContainEqual({ kind: "start_work" });
    expect(stageActions("agreed", buyer)).not.toContainEqual({ kind: "start_work" });
    expect(stageActions("in_progress", ownerProvider)).toContainEqual({ kind: "submit_delivery" });
    expect(stageActions("in_progress", buyer)).not.toContainEqual({ kind: "submit_delivery" });
    expect(stageActions("delivered", buyer)).toEqual([
      { kind: "accept_delivery" },
      { kind: "reject_delivery" },
    ]);
    expect(stageActions("delivered", ownerProvider)).not.toContainEqual({
      kind: "accept_delivery",
    });
    // a provider who is not the owner may deliver; an owner who is the buyer may accept
    expect(stageActions("in_progress", std("counterparty", "provider"))).toContainEqual({
      kind: "submit_delivery",
    });
    expect(stageActions("delivered", ownerBuyer)).toContainEqual({ kind: "accept_delivery" });
  });
  it("lets only the owner cancel or close", () => {
    expect(stageActions("accepted", ownerProvider)).toEqual([{ kind: "move", to: "closed" }]);
    expect(stageActions("accepted", buyer)).toEqual([]);
    expect(stageActions("agreed", buyer)).not.toContainEqual({ kind: "move", to: "cancelled" });
    expect(stageActions("agreed", ownerProvider)).toContainEqual({ kind: "move", to: "cancelled" });
  });
  it("blocks every consequential action until both roles are accepted", () => {
    const none = std("owner", null, false);
    expect(stageActions("agreed", { ...ownerProvider, partiesEstablished: false })).toEqual([
      { kind: "move", to: "cancelled" },
    ]);
    expect(canSubmitProposal("qualified", none)).toBe(false);
    expect(canApprove(none, true, false)).toBe(false);
    expect(may("owner", "provider", "approve_proposal", false)).toBe(false);
    expect(may("counterparty", null, "step", false)).toBe(true);
  });
  it("offers nothing while a change awaits re-approval", () => {
    expect(stageActions("proposal", ownerProvider, true)).toEqual([]);
    expect(stageActions("delivered", buyer, true)).toEqual([]);
  });
  it("encodes the role and party matrix", () => {
    expect(roleMay("owner", "approve_proposal")).toBe(false);
    expect(roleMay("owner", "accept_delivery")).toBe(false);
    expect(roleMay("counterparty", "manage_roster")).toBe(false);
    expect(roleMay("counterparty", "step") && roleMay("owner", "step")).toBe(true);
    expect(roleMay(null, "step")).toBe(false);
    expect(may("owner", "provider", "accept_delivery", true)).toBe(false);
    expect(may("owner", "buyer", "start_work", true)).toBe(false);
    expect(may("counterparty", "buyer", "approve_proposal", true)).toBe(true);
    expect(may("counterparty", "provider", "approve_proposal", true)).toBe(true);
    expect(may(null, "buyer", "approve_proposal", true)).toBe(false);
  });
  it("gates proposals, approvals and draft edits", () => {
    expect(canSubmitProposal("qualified", ownerProvider)).toBe(true);
    expect(canSubmitProposal("in_progress", buyer)).toBe(true);
    expect(canSubmitProposal("accepted", ownerProvider)).toBe(false);
    expect(canEditDraft("qualified", "owner")).toBe(true);
    expect(canEditDraft("agreed", "owner")).toBe(false);
    expect(canEditDraft("qualified", "counterparty")).toBe(false);
    expect(canApprove(buyer, true, false)).toBe(true);
    expect(canApprove(ownerProvider, true, false)).toBe(true); // for their own side only
    expect(canApprove(buyer, true, true)).toBe(false); // replay
    expect(canApprove(buyer, false, false)).toBe(false);
    expect(canDeclineProposal(buyer, true)).toBe(true);
  });
  it("offers nothing once finished", () => {
    for (const s of ["closed", "cancelled"] as WorkspaceStatus[])
      expect(stageActions(s, ownerProvider)).toEqual([]);
  });
});

describe("workspace input", () => {
  it("parses budgets into cents", () => {
    expect(parseBudget("")).toBeNull();
    expect(parseBudget("12,500.50")).toBe(1250050);
    expect(parseBudget("0")).toBe(0);
    expect(parseBudget("-5")).toBeUndefined();
    expect(parseBudget("1e9")).toBeUndefined();
    expect(parseBudget("12.345")).toBeUndefined();
    expect(parseBudget("9999999999999")).toBeUndefined();
  });
  it("accepts a minimal workspace", () => {
    const r = validateWorkspaceInput(base);
    expect(r).toEqual({
      ok: true,
      value: {
        title: "Logistics audit",
        scope: "",
        nextAction: "",
        budgetCents: null,
        currency: null,
        dueOn: null,
      },
    });
  });
  it("requires a real title", () => {
    const r = validateWorkspaceInput({ ...base, title: " ab " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeTruthy();
  });
  it("requires a currency with a budget, and drops it without one", () => {
    const bad = validateWorkspaceInput({ ...base, budget: "5000", currency: "" });
    expect(bad.ok).toBe(false);
    const ok = validateWorkspaceInput({ ...base, budget: "5000", currency: "EUR" });
    expect(ok.ok && ok.value).toMatchObject({ budgetCents: 500000, currency: "eur" });
    const none = validateWorkspaceInput({ ...base, currency: "eur" });
    expect(none.ok && none.value.currency).toBeNull();
  });
  it("rejects impossible dates", () => {
    expect(validateWorkspaceInput({ ...base, dueOn: "2026-02-30" }).ok).toBe(false);
    expect(validateWorkspaceInput({ ...base, dueOn: "tomorrow" }).ok).toBe(false);
    const r = validateWorkspaceInput({ ...base, dueOn: "2026-12-01" });
    expect(r.ok && r.value.dueOn).toBe("2026-12-01");
  });
  it("limits long text", () => {
    expect(validateWorkspaceInput({ ...base, scope: "x".repeat(4001) }).ok).toBe(false);
    expect(validateWorkspaceInput({ ...base, nextAction: "x".repeat(501) }).ok).toBe(false);
  });
  it("formats budgets", () => {
    expect(formatBudget(null, null)).toBe("No budget set");
    expect(formatBudget(1250050, "usd")).toContain("12,500.50");
  });
});
