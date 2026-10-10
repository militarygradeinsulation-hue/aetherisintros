/**
 * Deal workspace data access. Reads go straight to the tables (row-level security limits them to
 * the roster); every write is an RPC that takes the actor from the session, so nothing here can
 * name another user. Failures throw an Error carrying the database's message.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  WorkspaceParty,
  WorkspaceRole,
  WorkspaceSource,
  WorkspaceStatus,
  ValidInput,
} from "./lifecycle";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export interface WorkspaceRow {
  id: string;
  createdBy: string;
  sourceType: WorkspaceSource;
  sourceId: string;
  title: string;
  scope: string;
  nextAction: string;
  budgetCents: number | null;
  currency: string | null;
  dueOn: string | null;
  status: WorkspaceStatus;
  scopeVersion: number;
  rowVersion: number;
  acceptedBy: string | null;
  resumeStatus: WorkspaceStatus | null;
  acceptedDeliveryVersion: number | null;
  partyProposalBy: string | null;
  partyProposalBuyer: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface MemberRow {
  userId: string;
  name: string;
  role: WorkspaceRole;
  status: "invited" | "active" | "declined" | "removed";
  party: WorkspaceParty | null;
  partyAccepted: boolean;
}
export interface ApprovalRow {
  version: number;
  userId: string;
  party: WorkspaceParty;
}
export interface DeliveryRow {
  version: number;
  termsVersion: number;
  note: string;
  status: "submitted" | "accepted" | "rejected" | "superseded";
  submittedBy: string | null;
  decidedBy: string | null;
}
export interface StepRow {
  id: string;
  text: string;
  done: boolean;
  createdBy: string;
  doneBy: string | null;
  createdAt: string;
}
export interface EventRow {
  id: string;
  actorId: string | null;
  kind: string;
  detail: string;
  createdAt: string;
  prevStatus: string | null;
  newStatus: string | null;
  scopeVersion: number | null;
  deliveryVersion: number | null;
}
export interface ProposalRow {
  version: number;
  scope: string;
  budgetCents: number | null;
  currency: string | null;
  dueOn: string | null;
  status: "submitted" | "approved" | "declined" | "superseded";
  submittedBy: string | null;
  decidedBy: string | null;
}
/** Everything a pending invitee may see: inviter, room title and the explicit invitation message. */
export interface InvitationRow {
  workspaceId: string;
  title: string;
  invitedBy: string;
  invitedByName: string;
  inviteMessage: string;
  invitedAt: string;
}
export interface WorkspaceDetail {
  workspace: WorkspaceRow;
  members: MemberRow[];
  steps: StepRow[];
  proposals: ProposalRow[];
  approvals: ApprovalRow[];
  deliveries: DeliveryRow[];
  events: EventRow[];
  crmOpportunityId: string | null;
}

/** Thrown when another participant changed the workspace first; the caller keeps its input and reloads. */
export class WorkspaceConflictError extends Error {}

const toRow = (r: any): WorkspaceRow => ({
  id: r.id,
  createdBy: r.created_by,
  sourceType: r.source_type,
  sourceId: r.source_id,
  title: r.title,
  scope: r.scope ?? "",
  nextAction: r.next_action ?? "",
  budgetCents: r.budget_cents == null ? null : Number(r.budget_cents),
  currency: r.currency ?? null,
  dueOn: r.due_on ?? null,
  status: r.status,
  scopeVersion: r.scope_version,
  rowVersion: r.row_version,
  acceptedBy: r.accepted_by ?? null,
  resumeStatus: r.resume_status ?? null,
  acceptedDeliveryVersion: r.accepted_delivery_version ?? null,
  partyProposalBy: r.party_proposal_by ?? null,
  partyProposalBuyer: r.party_proposal_buyer ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const r = await db.rpc(name, args);
  if (r.error) {
    const text = r.error.message || "That did not save. Try again.";
    if (r.error.code === "40001" || /changed since you loaded/i.test(text))
      throw new WorkspaceConflictError(text);
    throw new Error(text);
  }
  return r.data as T;
}

export async function listWorkspaces(): Promise<
  Array<WorkspaceRow & { myStatus: MemberRow["status"] | null }>
> {
  const { data: u } = await db.auth.getUser();
  const uid: string | undefined = u?.user?.id;
  const w = await db
    .from("deal_workspaces")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (w.error) throw new Error(w.error.message);
  const ids = (w.data ?? []).map((x: any) => x.id);
  const mine =
    ids.length && uid
      ? await db
          .from("deal_workspace_members")
          .select("workspace_id, status")
          .eq("user_id", uid)
          .in("workspace_id", ids)
      : { data: [] };
  const by = new Map<string, MemberRow["status"]>(
    (mine.data ?? []).map((m: any) => [m.workspace_id, m.status]),
  );
  return (w.data ?? []).map((x: any) => ({ ...toRow(x), myStatus: by.get(x.id) ?? null }));
}

export async function loadWorkspace(id: string): Promise<WorkspaceDetail | null> {
  const w = await db.from("deal_workspaces").select("*").eq("id", id).maybeSingle();
  if (w.error) throw new Error(w.error.message);
  if (!w.data) return null;
  const { data: u } = await db.auth.getUser();
  const uid: string | undefined = u?.user?.id;
  const [m, s, p, e, l, ap, dv] = await Promise.all([
    db
      .from("deal_workspace_members")
      .select("user_id, role, status, party, party_accepted_at")
      .eq("workspace_id", id),
    db.from("deal_workspace_steps").select("*").eq("workspace_id", id).order("created_at"),
    db
      .from("deal_workspace_proposals")
      .select("*")
      .eq("workspace_id", id)
      .order("version", { ascending: false }),
    db
      .from("deal_workspace_events")
      .select("*")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    uid
      ? db
          .from("deal_workspace_crm_links")
          .select("crm_opportunity_id")
          .eq("workspace_id", id)
          .eq("user_id", uid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("deal_workspace_approvals").select("version, user_id, party").eq("workspace_id", id),
    db
      .from("deal_workspace_deliveries")
      .select("*")
      .eq("workspace_id", id)
      .order("version", { ascending: false }),
  ]);
  const failed = [m, s, p, e, l, ap, dv].find((x) => x.error);
  if (failed) throw new Error(failed.error.message);
  const userIds: string[] = (m.data ?? []).map((x: any) => x.user_id);
  const names = userIds.length
    ? await db.from("profiles").select("id, name").in("id", userIds)
    : { data: [] };
  const nameBy = new Map<string, string>(
    (names.data ?? []).map((p: any) => [p.id, (p.name as string)?.trim() || "A member"]),
  );
  return {
    workspace: toRow(w.data),
    members: (m.data ?? []).map((x: any): MemberRow => ({
      userId: x.user_id,
      name: nameBy.get(x.user_id) ?? "A member",
      role: x.role,
      status: x.status,
      party: x.party ?? null,
      partyAccepted: !!x.party_accepted_at,
    })),
    steps: (s.data ?? []).map((x: any): StepRow => ({
      id: x.id,
      text: x.text,
      done: x.done,
      createdBy: x.created_by,
      doneBy: x.done_by,
      createdAt: x.created_at,
    })),
    proposals: (p.data ?? []).map((x: any): ProposalRow => ({
      version: x.version,
      scope: x.scope,
      budgetCents: x.budget_cents == null ? null : Number(x.budget_cents),
      currency: x.currency ?? null,
      dueOn: x.due_on ?? null,
      status: x.status,
      submittedBy: x.submitted_by,
      decidedBy: x.decided_by,
    })),
    approvals: (ap.data ?? []).map((x: any): ApprovalRow => ({
      version: x.version,
      userId: x.user_id,
      party: x.party,
    })),
    deliveries: (dv.data ?? []).map((x: any): DeliveryRow => ({
      version: x.version,
      termsVersion: x.terms_version,
      note: x.note ?? "",
      status: x.status,
      submittedBy: x.submitted_by,
      decidedBy: x.decided_by,
    })),
    events: (e.data ?? []).map((x: any): EventRow => ({
      id: x.id,
      actorId: x.actor_id,
      kind: x.kind,
      detail: x.detail,
      createdAt: x.created_at,
      prevStatus: x.prev_status ?? null,
      newStatus: x.new_status ?? null,
      scopeVersion: x.scope_version ?? null,
      deliveryVersion: x.delivery_version ?? null,
    })),
    crmOpportunityId: l.data?.crm_opportunity_id ?? null,
  };
}

/** Finds the workspace already opened from a source, if the caller is on its roster. */
export async function findWorkspaceForSource(
  type: WorkspaceSource,
  sourceId: string,
): Promise<{ id: string; title: string } | null> {
  const r = await db
    .from("deal_workspaces")
    .select("id, title")
    .eq("source_type", type)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return r.data ?? null;
}

export const createWorkspace = (
  type: WorkspaceSource,
  sourceId: string,
  v: ValidInput,
  inviteMessage = "",
) =>
  rpc<{ id: string; created: boolean }>("create_deal_workspace", {
    p_source_type: type,
    p_source_id: sourceId,
    p_title: v.title,
    p_scope: v.scope,
    p_next_action: v.nextAction,
    p_budget_cents: v.budgetCents,
    p_currency: v.currency,
    p_due_on: v.dueOn,
    p_invite_message: inviteMessage.trim(),
  });
export const respondToInvite = (id: string, accept: boolean) =>
  rpc("respond_workspace_invite", { p_ws: id, p_accept: accept });
export const inviteMember = (id: string, userId: string, message = "") =>
  rpc("invite_workspace_member", { p_ws: id, p_user: userId, p_message: message.trim() });
export const removeMember = (id: string, userId: string) =>
  rpc("remove_workspace_member", { p_ws: id, p_user: userId });
/** Invitations awaiting the caller's answer: inviter, title and message only, never terms. */
export async function listInvitations(): Promise<InvitationRow[]> {
  const r = await db.rpc("my_workspace_invitations");
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []).map((x: any): InvitationRow => ({
    workspaceId: x.workspace_id,
    title: x.title,
    invitedBy: x.invited_by,
    invitedByName: x.invited_by_name,
    inviteMessage: x.invite_message ?? "",
    invitedAt: x.invited_at,
  }));
}

// Mutations take the row version the caller loaded; a stale one is rejected (WorkspaceConflictError).
export const updateDetails = (
  id: string,
  ver: number,
  v: Pick<ValidInput, "title" | "scope" | "budgetCents" | "currency" | "dueOn">,
) =>
  rpc("update_workspace_details", {
    p_ws: id,
    p_expected: ver,
    p_title: v.title,
    p_scope: v.scope,
    p_budget_cents: v.budgetCents,
    p_currency: v.currency,
    p_due_on: v.dueOn,
  });
export const setNextAction = (id: string, ver: number, text: string) =>
  rpc("set_workspace_next_action", { p_ws: id, p_expected: ver, p_text: text });
export const addStep = (id: string, text: string) =>
  rpc("add_workspace_step", { p_ws: id, p_text: text });
export const setStepDone = (stepId: string, done: boolean) =>
  rpc("set_workspace_step_done", { p_step: stepId, p_done: done });
export const moveStage = (id: string, ver: number, to: WorkspaceStatus) =>
  rpc("transition_workspace_status", { p_ws: id, p_expected: ver, p_to: to });
export const submitProposal = (
  id: string,
  ver: number,
  v: Pick<ValidInput, "scope" | "budgetCents" | "currency" | "dueOn">,
) =>
  rpc<number>("submit_workspace_proposal", {
    p_ws: id,
    p_expected: ver,
    p_scope: v.scope,
    p_budget_cents: v.budgetCents,
    p_currency: v.currency,
    p_due_on: v.dueOn,
  });
export const approveProposal = (id: string, ver: number, version: number) =>
  rpc<string>("approve_workspace_proposal", { p_ws: id, p_expected: ver, p_version: version });
export const declineProposal = (id: string, ver: number, version: number) =>
  rpc("decline_workspace_proposal", { p_ws: id, p_expected: ver, p_version: version });
export const proposeParties = (id: string, ver: number, buyerId: string) =>
  rpc("propose_workspace_parties", { p_ws: id, p_expected: ver, p_buyer: buyerId });
export const acceptParties = (id: string, ver: number) =>
  rpc("accept_workspace_parties", { p_ws: id, p_expected: ver });
export const declineParties = (id: string, ver: number) =>
  rpc("decline_workspace_parties", { p_ws: id, p_expected: ver });
export const submitDelivery = (id: string, ver: number, note: string) =>
  rpc<number>("submit_workspace_delivery", { p_ws: id, p_expected: ver, p_note: note.trim() });
/** Buyer only; names the delivery version and the agreed terms version being accepted. */
export const acceptDelivery = (
  id: string,
  ver: number,
  deliveryVersion: number,
  termsVersion: number,
) =>
  rpc("accept_workspace_delivery", {
    p_ws: id,
    p_expected: ver,
    p_delivery_version: deliveryVersion,
    p_terms_version: termsVersion,
  });
export const rejectDelivery = (id: string, ver: number, deliveryVersion: number) =>
  rpc("reject_workspace_delivery", {
    p_ws: id,
    p_expected: ver,
    p_delivery_version: deliveryVersion,
  });
export const linkOpportunity = (id: string, opportunityId: string) =>
  rpc("link_workspace_opportunity", { p_ws: id, p_opportunity: opportunityId });
