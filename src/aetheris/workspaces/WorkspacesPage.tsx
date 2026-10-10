/**
 * Business workspaces: list and detail. Everything shown is read back from the database after
 * each action, so the screen only ever reflects persisted records. Terms change only through a
 * versioned proposal that BOTH the buyer and the provider approve, delivery is submitted by the
 * provider and accepted by the buyer; nothing here records a signed contract or a payment. The
 * database enforces every rule; this screen only offers what the signed-in person may do.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Briefcase } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Btn, Eyebrow, Head } from "../ui";
import { useOps } from "../crm/store";
import {
  STATUS_LABEL,
  CURRENCIES,
  canApprove,
  canDeclineProposal,
  canEditDraft,
  canSubmitProposal,
  formatBudget,
  isFinished,
  may,
  roleMay,
  stageActions,
  stageNote,
  validateWorkspaceInput,
  type Standing,
  type WorkspaceInput,
} from "./lifecycle";
import {
  WorkspaceConflictError,
  acceptDelivery,
  acceptParties,
  addStep,
  approveProposal,
  declineParties,
  declineProposal,
  inviteMember,
  linkOpportunity,
  listInvitations,
  listWorkspaces,
  loadWorkspace,
  moveStage,
  proposeParties,
  rejectDelivery,
  removeMember,
  respondToInvite,
  setNextAction,
  setStepDone,
  submitDelivery,
  submitProposal,
  updateDetails,
  type InvitationRow,
  type WorkspaceDetail,
  type WorkspaceRow,
} from "./repo";
import { OPEN_WORKSPACE_KEY } from "./StartWorkspace";

type ListRow = WorkspaceRow & { myStatus: string | null };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

export function WorkspacesPage() {
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [busyInvite, setBusyInvite] = useState("");
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(OPEN_WORKSPACE_KEY);
    } catch {
      return null;
    }
  });

  const refresh = useCallback(async () => {
    try {
      setRows(await listWorkspaces());
      setError("");
    } catch (e) {
      setError(msg(e));
      setRows((r) => r ?? []);
    }
    try {
      setInvites(await listInvitations());
    } catch {
      setInvites([]);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const open = (id: string | null) => {
    setActiveId(id);
    try {
      if (id) sessionStorage.setItem(OPEN_WORKSPACE_KEY, id);
      else sessionStorage.removeItem(OPEN_WORKSPACE_KEY);
    } catch {
      /* private mode */
    }
  };
  const answer = async (id: string, accept: boolean) => {
    if (busyInvite) return;
    setBusyInvite(id);
    setInviteError("");
    try {
      await respondToInvite(id, accept);
      await refresh();
      if (accept) open(id);
    } catch (e) {
      setInviteError(msg(e));
    } finally {
      setBusyInvite("");
    }
  };
  const pending = invites.find((i) => i.workspaceId === activeId);

  return (
    <>
      <Head
        label="WORKSPACES"
        title="Where a conversation becomes business."
        copy="A private workspace for the people actually doing the work: scope, next steps and a clear stage. Open one from a conversation or an accepted introduction."
        proof="private to the people on it · terms approved by both parties · delivery accepted by the buyer"
      />
      {rows === null && (
        <p className="empty-state" role="status">
          Loading workspaces…
        </p>
      )}
      {error && (
        <p role="alert" className="executive-form-note">
          Could not load workspaces: {error}{" "}
          <button type="button" className="text-link" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}
      {invites.length > 0 && (
        <section className="executive-section" aria-label="Workspace invitations">
          <Eyebrow signal>INVITATIONS</Eyebrow>
          <p className="og-note">
            An invitation shows only who invited you, the room title and their message. Scope,
            budget and dates stay hidden until you accept, and accepting is not agreeing to any
            terms or role.
          </p>
          {inviteError && (
            <p role="alert" className="executive-form-note">
              {inviteError}
            </p>
          )}
          <ul>
            {invites.map((i) => (
              <li key={i.workspaceId}>
                {i.invitedByName} invited you to “{i.title}”
                {i.inviteMessage && <blockquote className="og-note">{i.inviteMessage}</blockquote>}
                <span className="og-inline">
                  <Btn disabled={!!busyInvite} onClick={() => void answer(i.workspaceId, true)}>
                    <Check size={14} /> Accept invitation
                  </Btn>
                  <Btn
                    kind="quiet"
                    disabled={!!busyInvite}
                    onClick={() => void answer(i.workspaceId, false)}
                  >
                    Decline
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {rows && !rows.length && !invites.length && !error && (
        <p className="empty-state">
          No workspaces yet. Open one from a conversation in Messages, or from an accepted
          introduction.
        </p>
      )}
      {rows && rows.length > 0 && (
        <div className="filter-chips" role="list" aria-label="Your workspaces">
          {rows.map((r) => (
            <button
              type="button"
              role="listitem"
              key={r.id}
              className={`chip ${activeId === r.id ? "on" : ""}`}
              onClick={() => open(r.id)}
            >
              {r.title} · {STATUS_LABEL[r.status]}
            </button>
          ))}
        </div>
      )}
      {activeId && !pending && (
        <WorkspaceDetailView key={activeId} id={activeId} onChanged={refresh} />
      )}
    </>
  );
}

function WorkspaceDetailView({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { opportunities } = useOps();
  const [detail, setDetail] = useState<WorkspaceDetail | null | undefined>(undefined);
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [nextAction, setNext] = useState("");
  const [nextDirty, setNextDirtyState] = useState(false);
  const dirty = useRef(false);
  const setNextDirty = (v: boolean) => {
    dirty.current = v;
    setNextDirtyState(v);
  };
  const [step, setStep] = useState("");
  const [mode, setMode] = useState<"view" | "draft" | "proposal">("view");
  const [terms, setTerms] = useState<WorkspaceInput>({
    title: "",
    scope: "",
    nextAction: "",
    budget: "",
    currency: "usd",
    dueOn: "",
  });
  const [termErrors, setTermErrors] = useState<Partial<Record<keyof WorkspaceInput, string>>>({});
  const [pickedOpp, setPickedOpp] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [buyerPick, setBuyerPick] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await loadWorkspace(id);
      setDetail(d);
      setError("");
      if (d) setNext((prev) => (dirty.current ? prev : d.workspace.nextAction));
    } catch (e) {
      setError(msg(e));
      setDetail((p) => p ?? null);
    }
  }, [id]);
  useEffect(() => {
    void supabase.auth.getUser().then((r) => setUid(r.data.user?.id ?? null));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  /** Runs one write; a second click while it is in flight is ignored. Returns true only when it persisted. */
  const act = async (fn: () => Promise<unknown>): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      await fn();
      await load();
      onChanged();
      return true;
    } catch (e) {
      setActionError(
        e instanceof WorkspaceConflictError ? `${e.message} What you typed is kept.` : msg(e),
      );
      if (e instanceof WorkspaceConflictError) await load();
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (detail === undefined)
    return (
      <p className="empty-state" role="status">
        Loading workspace…
      </p>
    );
  if (detail === null)
    return (
      <p role="alert" className="executive-form-note">
        {error
          ? `Could not load this workspace: ${error}`
          : "This workspace is not available to you."}{" "}
        <button type="button" className="text-link" onClick={() => void load()}>
          Retry
        </button>
      </p>
    );

  const {
    workspace: w,
    members,
    steps,
    proposals,
    approvals,
    deliveries,
    events,
    crmOpportunityId,
  } = detail;
  const ver = w.rowVersion;
  const me = members.find((m) => m.userId === uid);
  const role = me?.status === "active" ? me.role : null;
  const finished = isFinished(w.status);
  const openProposal = proposals.find((p) => p.status === "submitted");
  const party = me?.status === "active" && me.partyAccepted ? me.party : null;
  const active = members.filter((m) => m.status === "active");
  const established =
    active.length === 2 &&
    active.every((m) => m.party && m.partyAccepted) &&
    new Set(active.map((m) => m.party)).size === 2;
  const who: Standing = { role, party, partiesEstablished: established };
  const reapproval = !!w.resumeStatus;
  const openDelivery = deliveries.find((d) => d.status === "submitted");
  const actions = finished ? [] : stageActions(w.status, who, reapproval);
  const approvedBy = openProposal
    ? approvals.filter((a) => a.version === openProposal.version)
    : [];
  const iApproved =
    !!openProposal && approvals.some((a) => a.version === openProposal.version && a.userId === uid);
  const pendingBuyer = w.partyProposalBy
    ? members.find((m) => m.userId === w.partyProposalBuyer)
    : undefined;
  const canAssign =
    !!role &&
    !finished &&
    !established &&
    !openProposal &&
    (w.status === "qualified" || w.status === "proposal") &&
    !reapproval &&
    active.length === 2;
  const others = members.filter((m) => m.userId !== uid);
  const nameOf = (u: string | null) => members.find((m) => m.userId === u)?.name ?? "A member";

  const startEdit = (m: "draft" | "proposal") => {
    setTerms({
      title: w.title,
      scope: w.scope,
      nextAction: "",
      budget: w.budgetCents == null ? "" : (w.budgetCents / 100).toFixed(2),
      currency: w.currency ?? "usd",
      dueOn: w.dueOn ?? "",
    });
    setTermErrors({});
    setMode(m);
  };
  const saveTerms = async () => {
    const v = validateWorkspaceInput(terms);
    if (!v.ok) {
      setTermErrors(v.errors);
      return;
    }
    if (mode === "proposal" && !v.value.scope) {
      setTermErrors({ scope: "Describe the scope being proposed." });
      return;
    }
    setTermErrors({});
    const ok = await act(() =>
      mode === "proposal" ? submitProposal(id, ver, v.value) : updateDetails(id, ver, v.value),
    );
    if (ok) setMode("view");
  };
  const saveNext = async () => {
    if (await act(() => setNextAction(id, ver, nextAction.trim()))) setNextDirty(false);
  };
  const addNewStep = async () => {
    const t = step.trim();
    if (t && (await act(() => addStep(id, t)))) setStep("");
  };
  const T =
    (k: keyof WorkspaceInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setTerms((t) => ({ ...t, [k]: e.target.value }));
  const linkedOpp = opportunities.find((o) => o.id === crmOpportunityId);

  return (
    <section className="executive-section" aria-label={`Workspace ${w.title}`}>
      <Eyebrow signal>
        <Briefcase size={12} /> {STATUS_LABEL[w.status].toUpperCase()} · TERMS V{w.scopeVersion}
      </Eyebrow>
      <h2>{w.title}</h2>
      <p className="og-note">
        Shared room: visible only to its active participants. Your personal CRM opportunity is
        separate and private to you.
      </p>
      {stageNote(w.status) && <p className="og-note">{stageNote(w.status)}</p>}
      {error && (
        <p role="alert" className="executive-form-note">
          Could not refresh: {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="executive-form-note">
          {actionError}
        </p>
      )}

      <h3>Participants</h3>
      <ul>
        {members
          .filter((m) => m.status !== "removed")
          .map((m) => (
            <li key={m.userId}>
              {m.name}
              {m.userId === uid ? " (you)" : ""} · {m.role}
              {m.partyAccepted && m.party ? ` · ${m.party}` : ""}
              {m.status === "invited"
                ? " · invited, not yet accepted"
                : m.status === "declined"
                  ? " · declined"
                  : ""}
            </li>
          ))}
      </ul>
      {roleMay(role, "manage_roster") &&
        !finished &&
        others
          .filter((m) => m.status === "declined" || m.status === "removed")
          .map((m) => (
            <Btn
              key={m.userId}
              kind="secondary"
              disabled={busy}
              onClick={() => void act(() => inviteMember(id, m.userId))}
            >
              Invite {m.name} again
            </Btn>
          ))}
      {roleMay(role, "manage_roster") &&
        !finished &&
        others
          .filter((m) => m.status === "invited" || m.status === "active")
          .map((m) => (
            <Btn
              key={m.userId}
              kind="quiet"
              disabled={busy}
              onClick={() => void act(() => removeMember(id, m.userId))}
            >
              Remove {m.name}
            </Btn>
          ))}
      {roleMay(role, "leave") && !finished && (
        <Btn kind="quiet" disabled={busy} onClick={() => void act(() => removeMember(id, uid!))}>
          Leave workspace
        </Btn>
      )}

      <h3>Buyer and provider</h3>
      {established ? (
        <p className="og-note">
          Roles are set and accepted by both people. They are separate from who opened the room, and
          they are locked once terms are agreed.
        </p>
      ) : (
        <p className="og-note">
          Approvals and delivery are blocked until both people accept who is the buyer and who is
          the provider. Opening or being invited to the room assigns neither.
        </p>
      )}
      {w.partyProposalBy && !established && (
        <p role="status">
          {nameOf(w.partyProposalBy)} proposed {pendingBuyer?.name ?? "a participant"} as the buyer
          and the other person as the provider.
          {w.partyProposalBy !== uid && canAssign && (
            <span className="og-inline">
              <Btn disabled={busy} onClick={() => void act(() => acceptParties(id, ver))}>
                Accept these roles
              </Btn>
              <Btn
                kind="quiet"
                disabled={busy}
                onClick={() => void act(() => declineParties(id, ver))}
              >
                Decline
              </Btn>
            </span>
          )}
          {w.partyProposalBy === uid && <span> Waiting for the other person to accept.</span>}
        </p>
      )}
      {canAssign && !w.partyProposalBy && (
        <form
          className="og-inline"
          onSubmit={(e) => {
            e.preventDefault();
            if (buyerPick) void act(() => proposeParties(id, ver, buyerPick));
          }}
        >
          <select
            aria-label="Who is the buyer"
            value={buyerPick}
            onChange={(e) => setBuyerPick(e.target.value)}
          >
            <option value="">Who is the buyer?</option>
            {active.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
                {m.userId === uid ? " (you)" : ""}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy || !buyerPick}>
            Propose roles
          </button>
        </form>
      )}

      <h3>Terms in force</h3>
      {mode === "view" ? (
        <dl>
          <div>
            <dt>SCOPE</dt>
            <dd>{w.scope || "Not written yet"}</dd>
          </div>
          <div>
            <dt>BUDGET</dt>
            <dd>{formatBudget(w.budgetCents, w.currency)}</dd>
          </div>
          <div>
            <dt>DUE</dt>
            <dd>{w.dueOn ?? "No due date"}</dd>
          </div>
        </dl>
      ) : (
        <form
          className="og-form"
          aria-label={mode === "proposal" ? "Submit proposal" : "Edit draft terms"}
          onSubmit={(e) => {
            e.preventDefault();
            void saveTerms();
          }}
        >
          {mode === "draft" && (
            <label>
              Title
              <input
                aria-label="Workspace title"
                value={terms.title}
                onChange={T("title")}
                maxLength={160}
              />
              {termErrors.title && <small role="alert">{termErrors.title}</small>}
            </label>
          )}
          <label>
            Scope
            <textarea aria-label="Scope" rows={3} value={terms.scope} onChange={T("scope")} />
            {termErrors.scope && <small role="alert">{termErrors.scope}</small>}
          </label>
          <label>
            Budget
            <input
              aria-label="Budget"
              inputMode="decimal"
              value={terms.budget}
              onChange={T("budget")}
            />
            {termErrors.budget && <small role="alert">{termErrors.budget}</small>}
          </label>
          <label>
            Currency
            <select aria-label="Currency" value={terms.currency} onChange={T("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
            {termErrors.currency && <small role="alert">{termErrors.currency}</small>}
          </label>
          <label>
            Due date
            <input aria-label="Due date" type="date" value={terms.dueOn} onChange={T("dueOn")} />
            {termErrors.dueOn && <small role="alert">{termErrors.dueOn}</small>}
          </label>
          <div className="og-inline">
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Saving…" : mode === "proposal" ? "Submit proposal" : "Save draft"}
            </button>
            <Btn kind="quiet" disabled={busy} onClick={() => setMode("view")}>
              Cancel
            </Btn>
          </div>
        </form>
      )}
      {mode === "view" && !finished && canEditDraft(w.status, role) && (
        <Btn kind="quiet" onClick={() => startEdit("draft")}>
          Edit draft terms
        </Btn>
      )}
      {mode === "view" && !finished && canSubmitProposal(w.status, who) && !openProposal && (
        <Btn kind="secondary" disabled={busy} onClick={() => startEdit("proposal")}>
          {w.status === "qualified" || w.status === "proposal"
            ? "Submit proposal"
            : "Propose a change"}
        </Btn>
      )}
      {mode === "view" &&
        !finished &&
        may(role, party, "submit_proposal", established) &&
        openProposal && (
          <Btn kind="secondary" disabled={busy} onClick={() => startEdit("proposal")}>
            Replace open proposal
          </Btn>
        )}
      {role === "owner" && !finished && w.status !== "qualified" && (
        <p className="og-note">
          After a proposal, scope, budget and dates change only through a new version that both the
          buyer and the provider approve. Work pauses at Proposal until they do.
        </p>
      )}

      {reapproval && (
        <p role="status" className="og-note">
          A change to the terms is awaiting approval from both parties. Progress is paused; the
          terms in force stay as they are. If the change is declined, the workspace returns to{" "}
          {STATUS_LABEL[w.resumeStatus!]}.
        </p>
      )}
      {openProposal && (
        <section aria-label={`Proposal version ${openProposal.version}`}>
          <h3>Open proposal · version {openProposal.version}</h3>
          <dl>
            <div>
              <dt>SCOPE</dt>
              <dd>{openProposal.scope}</dd>
            </div>
            <div>
              <dt>BUDGET</dt>
              <dd>{formatBudget(openProposal.budgetCents, openProposal.currency)}</dd>
            </div>
            <div>
              <dt>DUE</dt>
              <dd>{openProposal.dueOn ?? "No due date"}</dd>
            </div>
          </dl>
          <p className="og-note">
            Approved by:{" "}
            {approvedBy.length
              ? approvedBy.map((a) => `${nameOf(a.userId)} (${a.party})`).join(", ")
              : "nobody yet"}
            . Both parties must approve this same version.
          </p>
          {canApprove(who, true, iApproved) && !finished ? (
            <div className="og-inline">
              <Btn
                disabled={busy}
                onClick={() => void act(() => approveProposal(id, ver, openProposal.version))}
              >
                Approve proposal v{openProposal.version}
              </Btn>
              {canDeclineProposal(who, true) && (
                <Btn
                  kind="quiet"
                  disabled={busy}
                  onClick={() => void act(() => declineProposal(id, ver, openProposal.version))}
                >
                  Decline
                </Btn>
              )}
            </div>
          ) : (
            <p className="og-note">
              {iApproved
                ? "You approved this version. Waiting for the other party."
                : established
                  ? "Only the buyer and the provider approve, each for themselves."
                  : "Accept buyer and provider roles first."}
            </p>
          )}
        </section>
      )}

      <h3>Next action</h3>
      {roleMay(role, "next_action") && !finished ? (
        <form
          className="og-inline"
          onSubmit={(e) => {
            e.preventDefault();
            void saveNext();
          }}
        >
          <input
            aria-label="Next action"
            value={nextAction}
            maxLength={500}
            placeholder="What happens next, and who does it"
            onChange={(e) => {
              setNext(e.target.value);
              setNextDirty(true);
            }}
          />
          <button type="submit" disabled={busy || !nextDirty}>
            Save next action
          </button>
        </form>
      ) : (
        <p>{w.nextAction || "None set"}</p>
      )}

      <h3>Shared next steps</h3>
      {!steps.length && <p className="empty-state">No steps yet.</p>}
      <ul aria-label="Next steps">
        {steps.map((s) => (
          <li key={s.id}>
            <label>
              <input
                type="checkbox"
                checked={s.done}
                disabled={busy || !roleMay(role, "step") || finished}
                onChange={(e) => void act(() => setStepDone(s.id, e.target.checked))}
              />{" "}
              {s.text}
            </label>
            {s.done && s.doneBy && <small> · done by {nameOf(s.doneBy)}</small>}
          </li>
        ))}
      </ul>
      {roleMay(role, "step") && !finished && (
        <form
          className="og-inline"
          onSubmit={(e) => {
            e.preventDefault();
            void addNewStep();
          }}
        >
          <input
            aria-label="New step"
            value={step}
            maxLength={300}
            placeholder="Add a next step"
            onChange={(e) => setStep(e.target.value)}
          />
          <button type="submit" disabled={busy || !step.trim()}>
            Add step
          </button>
        </form>
      )}

      <h3>Stage</h3>
      {deliveries.length > 0 && (
        <ul aria-label="Deliveries">
          {deliveries.map((d) => (
            <li key={d.version}>
              Delivery {d.version} · against terms v{d.termsVersion} · {d.status}
              {d.note ? ` · ${d.note}` : ""}
            </li>
          ))}
        </ul>
      )}
      {w.status === "in_progress" &&
        may(role, party, "submit_delivery", established) &&
        !reapproval && (
          <label>
            Delivery note
            <input
              aria-label="Delivery note"
              value={deliveryNote}
              maxLength={1000}
              onChange={(e) => setDeliveryNote(e.target.value)}
            />
          </label>
        )}
      {!actions.length && (
        <p className="og-note">
          {finished
            ? "No further stage changes."
            : reapproval
              ? "Paused until both parties approve or decline the change."
              : !role
                ? "You are not an active participant."
                : !established && w.status !== "qualified"
                  ? "Accept buyer and provider roles to continue."
                  : "Nothing for you to do at this stage."}
        </p>
      )}
      <div className="og-inline">
        {actions.map((a) => {
          if (a.kind === "start_work")
            return (
              <Btn
                key="start"
                disabled={busy}
                onClick={() => void act(() => moveStage(id, ver, "in_progress"))}
              >
                Start work
              </Btn>
            );
          if (a.kind === "submit_delivery")
            return (
              <Btn
                key="deliver"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await submitDelivery(id, ver, deliveryNote);
                    setDeliveryNote("");
                  })
                }
              >
                Submit delivery
              </Btn>
            );
          if (a.kind === "accept_delivery")
            return openDelivery ? (
              <Btn
                key="accept"
                disabled={busy}
                onClick={() =>
                  void act(() => acceptDelivery(id, ver, openDelivery.version, w.scopeVersion))
                }
              >
                Accept delivery {openDelivery.version} (terms v{w.scopeVersion})
              </Btn>
            ) : null;
          if (a.kind === "reject_delivery")
            return openDelivery ? (
              <Btn
                key="reject"
                kind="quiet"
                disabled={busy}
                onClick={() => void act(() => rejectDelivery(id, ver, openDelivery.version))}
              >
                Send delivery back
              </Btn>
            ) : null;
          return (
            <Btn
              key={a.to}
              kind={a.to === "cancelled" ? "quiet" : "secondary"}
              disabled={busy}
              onClick={() => void act(() => moveStage(id, ver, a.to))}
            >
              {a.to === "cancelled" ? "Cancel workspace" : `Move to ${STATUS_LABEL[a.to]}`}
            </Btn>
          );
        })}
      </div>
      {w.status === "delivered" && established && party !== "buyer" && (
        <p className="og-note">
          Only the buyer can accept delivery. Nobody accepts their own work, and room ownership does
          not change that.
        </p>
      )}

      <section aria-label="Your private CRM opportunity">
        <h3>Your private CRM opportunity</h3>
        <p className="og-note">
          Only you can see this link. It is separate from the shared workspace and never shown to
          the other participant.
        </p>
        {linkedOpp || crmOpportunityId ? (
          <p>Linked: {linkedOpp?.name ?? "an opportunity in your CRM"}</p>
        ) : (
          <p className="empty-state">None linked.</p>
        )}
        {role && (
          <form
            className="og-inline"
            onSubmit={(e) => {
              e.preventDefault();
              if (pickedOpp) void act(() => linkOpportunity(id, pickedOpp));
            }}
          >
            <select
              aria-label="CRM opportunity"
              value={pickedOpp}
              onChange={(e) => setPickedOpp(e.target.value)}
            >
              <option value="">Choose one of your opportunities</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy || !pickedOpp}>
              Link
            </button>
          </form>
        )}
      </section>

      <details>
        <summary>Activity</summary>
        <ul>
          {events.map((ev) => (
            <li key={ev.id}>
              <small>{new Date(ev.createdAt).toLocaleString()}</small> · {nameOf(ev.actorId)} ·{" "}
              {ev.kind.replace(/_/g, " ")}
              {ev.detail ? `: ${ev.detail}` : ""}
              {ev.prevStatus !== ev.newStatus && ev.newStatus
                ? ` · ${ev.prevStatus ?? "—"} → ${ev.newStatus}`
                : ""}
              {ev.scopeVersion ? ` · terms v${ev.scopeVersion}` : ""}
              {ev.deliveryVersion ? ` · delivery v${ev.deliveryVersion}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
