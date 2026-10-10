import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Btn, Eyebrow } from "../ui";
import { currentAccountId } from "../crm/repo";
import { isShowcase } from "../showcase";
import { supabase } from "@/integrations/supabase/client";
import {
  notifyWorkspaceChange,
  registerSyncedStore,
  useWorkspaceSyncStatus,
  waitForWorkspaceStoreReady,
} from "../sync/workspace-sync";
import {
  createPlaygroundBlueprint,
  createProposalComparison,
  EMPTY_BUSINESS_EXECUTION_STATE,
  parseBusinessExecutionState,
  readBusinessExecutionCopy,
  validateBudgetAssumption,
  validateEvidenceLink,
  type BusinessExecutionState,
  type ProjectBlueprint,
  type ProposalComparison,
  type WorkPackage,
} from "./model";

const STORE_KEY = "aetheris.business-execution-v1-live";
const localKeyFor = (accountId: string) => `${STORE_KEY}.${accountId}`;
const lines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const blankPackage = (id: string): WorkPackage => ({
  id,
  title: "",
  description: "",
  deliverables: [],
  dependsOn: [],
  milestones: [],
  requiredDocuments: [],
});

function readLocal(accountId: string): BusinessExecutionState {
  try {
    const raw = localStorage.getItem(localKeyFor(accountId));
    if (raw) return parseBusinessExecutionState(JSON.parse(raw)) ?? EMPTY_BUSINESS_EXECUTION_STATE;
  } catch {
    /* use the empty state if the local copy is unavailable */
  }
  return EMPTY_BUSINESS_EXECUTION_STATE;
}

export function BlueprintWorkbench() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<BusinessExecutionState>(EMPTY_BUSINESS_EXECUTION_STATE);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [budgetDraft, setBudgetDraft] = useState<{
    blueprintId: string;
    amount: string;
    currency: string;
  } | null>(null);
  const [proposalDraft, setProposalDraft] = useState<{
    key: string;
    price: string;
    currency: string;
  } | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<{ key: string; value: string } | null>(null);
  const sync = useWorkspaceSyncStatus();

  useEffect(() => {
    let alive = true;
    let activated = false;
    let activeAccountId: string | null = null;
    let activationId = 0;
    const activateAccount = async (id: string | null) => {
      if (activated && id === activeAccountId) return;
      activated = true;
      activeAccountId = id;
      const activation = ++activationId;
      setReady(false);
      setAccountId(id);
      setError(null);
      setSaveMessage("");
      setActiveId(null);
      setActiveProposalId(null);
      setState(id ? readLocal(id) : EMPTY_BUSINESS_EXECUTION_STATE);
      if (!id) {
        setReady(true);
        return;
      }
      try {
        registerSyncedStore({
          key: STORE_KEY,
          localKey: localKeyFor(id),
          retryOnAccountChange: true,
          apply: (data) => {
            if (!alive || activeAccountId !== id) return;
            const next = readBusinessExecutionCopy(data);
            if (!next) {
              setError("The account copy could not be read because its structure is invalid.");
              return;
            }
            try {
              localStorage.setItem(localKeyFor(id), JSON.stringify(next));
              setState(next);
            } catch {
              setError("The account copy could not be saved on this device.");
            }
          },
        });
        await waitForWorkspaceStoreReady(STORE_KEY);
        if (alive && activationId === activation) setReady(true);
      } catch {
        if (alive && activationId === activation) {
          setError("Your account could not be checked. Sign in again before opening project data.");
          setReady(true);
        }
      }
    };
    if (isShowcase()) {
      setReady(true);
      return () => {
        alive = false;
      };
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void activateAccount(session?.user?.id ?? null);
    });
    void currentAccountId()
      .then((id) => activateAccount(id))
      .catch(() => {
        if (alive) {
          setError("Your account could not be checked. Sign in again before opening project data.");
          setReady(true);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const active = useMemo(
    () =>
      state.blueprints.find((blueprint) => blueprint.id === activeId) ??
      state.blueprints[0] ??
      null,
    [state.blueprints, activeId],
  );
  const proposal =
    active?.proposals.find((item) => item.id === activeProposalId) ?? active?.proposals[0] ?? null;
  const proposalKey = active && proposal ? `${active.id}:${proposal.id}` : "";
  const budgetAmount =
    budgetDraft && budgetDraft.blueprintId === active?.id
      ? budgetDraft.amount
      : active?.budgetAssumption.amount == null
        ? ""
        : String(active.budgetAssumption.amount);
  const budgetCurrency =
    budgetDraft && budgetDraft.blueprintId === active?.id
      ? budgetDraft.currency
      : (active?.budgetAssumption.currency ?? "");
  const proposalPrice =
    proposalDraft?.key === proposalKey
      ? proposalDraft.price
      : proposal?.price == null
        ? ""
        : String(proposal.price);
  const proposalCurrency =
    proposalDraft?.key === proposalKey ? proposalDraft.currency : (proposal?.currency ?? "");
  const evidenceValue =
    evidenceDraft?.key === proposalKey
      ? evidenceDraft.value
      : (proposal?.evidenceLinks.join("\n") ?? "");

  const persist = (next: BusinessExecutionState) => {
    if (!parseBusinessExecutionState(next)) {
      setError(
        "This change would create an invalid dependency, budget, price, or evidence link. Review the affected fields.",
      );
      return false;
    }
    try {
      if (!accountId) throw new Error("No signed-in account");
      localStorage.setItem(localKeyFor(accountId), JSON.stringify(next));
      setState(next);
      notifyWorkspaceChange(STORE_KEY);
      setError(null);
      setSaveMessage("Saved on this device; account sync is queued.");
      return true;
    } catch {
      setError(
        "This change could not be saved on this device. Your previous version is unchanged.",
      );
      return false;
    }
  };

  const updateBlueprint = (
    id: string,
    update: (blueprint: ProjectBlueprint) => ProjectBlueprint,
  ) => {
    persist({
      blueprints: state.blueprints.map((blueprint) =>
        blueprint.id === id ? update(blueprint) : blueprint,
      ),
    });
  };

  const updateProposal = (
    id: string,
    update: (current: ProposalComparison) => ProposalComparison,
  ) => {
    if (!active) return;
    updateBlueprint(active.id, (blueprint) => ({
      ...blueprint,
      proposals: blueprint.proposals.map((current) =>
        current.id === id ? update(current) : current,
      ),
    }));
  };

  const addTemplate = () => {
    const blueprint = createPlaygroundBlueprint(crypto.randomUUID());
    if (persist({ blueprints: [blueprint, ...state.blueprints] })) setActiveId(blueprint.id);
  };

  if (!ready)
    return (
      <p className="ops-note" role={sync.failing ? "alert" : "status"}>
        {sync.failing
          ? "Account sync has failed in this session. Editing stays paused until the account copy is confirmed; automatic retries continue."
          : "Checking your private account workspace…"}
      </p>
    );
  if (isShowcase())
    return (
      <p className="ops-note">
        Project blueprints are unavailable in the demo. Demo records are never saved to an account.
      </p>
    );
  if (!accountId)
    return (
      <p className="ops-note" role={error ? "alert" : "status"}>
        {error ??
          "Sign in to create and compare private project plans. This workspace does not accept anonymous or demo data."}
      </p>
    );

  return (
    <section
      className="business-workbench"
      aria-label="Private project blueprints and proposal comparisons"
    >
      <div className="ops-panel">
        <Eyebrow>PRIVATE TO YOUR ACCOUNT · NO AUTOMATIC SHARING</Eyebrow>
        <p className="ops-note">
          Start with the editable playground/site-improvement template. Budget figures are
          user-entered assumptions. Nothing here is linked to an opportunity, Need, or room until
          those integrations have an authorized interface.
        </p>
        <div className="ops-toolbar">
          <Btn onClick={addTemplate}>
            <Plus size={14} /> New playground blueprint
          </Btn>
          <span className="ops-note" role="status">
            {sync.failing
              ? "Account sync has reported a failure; local changes remain available and sync will retry."
              : saveMessage || "Account sync uses the private, versioned workspace store."}
          </span>
        </div>
        {error && (
          <p className="ops-note" role="alert">
            {error}
          </p>
        )}
        {!state.blueprints.length && (
          <p className="ops-note">
            No project blueprints yet. Creating a template adds only its editable structure, not a
            project, budget, provider, or schedule.
          </p>
        )}
        {state.blueprints.length > 0 && (
          <nav className="ops-tabs" aria-label="Your private blueprints">
            {state.blueprints.map((blueprint) => (
              <button
                key={blueprint.id}
                type="button"
                aria-pressed={active?.id === blueprint.id}
                className={active?.id === blueprint.id ? "active" : ""}
                onClick={() => {
                  setActiveId(blueprint.id);
                  setActiveProposalId(blueprint.proposals[0]?.id ?? null);
                }}
              >
                {blueprint.title || "Untitled blueprint"}
              </button>
            ))}
          </nav>
        )}
      </div>

      {active && (
        <>
          <section className="ops-panel">
            <Eyebrow>EDITABLE PROJECT BLUEPRINT</Eyebrow>
            <Btn
              kind="quiet"
              onClick={() => {
                const remaining = state.blueprints.filter(
                  (blueprint) => blueprint.id !== active.id,
                );
                if (persist({ blueprints: remaining })) setActiveId(remaining[0]?.id ?? null);
              }}
            >
              <Trash2 size={13} /> Remove blueprint
            </Btn>
            <div className="ops-form">
              <label>
                Blueprint title
                <input
                  value={active.title}
                  maxLength={200}
                  onChange={(event) =>
                    updateBlueprint(active.id, (blueprint) => ({
                      ...blueprint,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Project brief
                <textarea
                  value={active.brief}
                  maxLength={5000}
                  onChange={(event) =>
                    updateBlueprint(active.id, (blueprint) => ({
                      ...blueprint,
                      brief: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <fieldset className="ops-panel">
              <legend>User-entered budget assumption</legend>
              <p className="ops-note">
                This is an assumption you enter, not an estimate, quote, or verified cost.
              </p>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={budgetAmount}
                  onChange={(event) =>
                    setBudgetDraft({
                      blueprintId: active.id,
                      amount: event.target.value,
                      currency: budgetCurrency,
                    })
                  }
                />
              </label>
              <label>
                Currency code
                <input
                  value={budgetCurrency}
                  maxLength={3}
                  autoCapitalize="characters"
                  placeholder="Enter ISO code; leave blank if unknown"
                  onChange={(event) =>
                    setBudgetDraft({
                      blueprintId: active.id,
                      amount: budgetAmount,
                      currency: event.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label>
                Assumption note
                <textarea
                  value={active.budgetAssumption.note}
                  maxLength={1000}
                  onChange={(event) =>
                    updateBlueprint(active.id, (blueprint) => ({
                      ...blueprint,
                      budgetAssumption: { ...blueprint.budgetAssumption, note: event.target.value },
                    }))
                  }
                />
              </label>
              <Btn
                kind="secondary"
                onClick={() => {
                  const amount = budgetAmount.trim() ? Number(budgetAmount) : null;
                  const currency =
                    amount === null ? null : budgetCurrency.trim().toUpperCase() || null;
                  if (!validateBudgetAssumption(amount, currency)) {
                    setError(
                      "Enter a non-negative amount and a three-letter currency code together, or leave both blank.",
                    );
                    return;
                  }
                  updateBlueprint(active.id, (blueprint) => ({
                    ...blueprint,
                    budgetAssumption: { ...blueprint.budgetAssumption, amount, currency },
                  }));
                }}
              >
                Save budget assumption
              </Btn>
            </fieldset>

            <div className="ops-panel">
              <Eyebrow>REQUIREMENTS AND QUESTIONS</Eyebrow>
              {active.requirements.map((requirement) => (
                <div className="ops-form" key={requirement.id}>
                  <label>
                    Requirement / question
                    <textarea
                      value={requirement.question}
                      maxLength={1000}
                      onChange={(event) =>
                        updateBlueprint(active.id, (blueprint) => ({
                          ...blueprint,
                          requirements: blueprint.requirements.map((item) =>
                            item.id === requirement.id
                              ? { ...item, question: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label>
                    User-entered answer
                    <textarea
                      value={requirement.answer}
                      maxLength={5000}
                      onChange={(event) =>
                        updateBlueprint(active.id, (blueprint) => ({
                          ...blueprint,
                          requirements: blueprint.requirements.map((item) =>
                            item.id === requirement.id
                              ? { ...item, answer: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </label>
                  <Btn
                    kind="quiet"
                    onClick={() =>
                      updateBlueprint(active.id, (blueprint) => ({
                        ...blueprint,
                        requirements: blueprint.requirements.filter(
                          (item) => item.id !== requirement.id,
                        ),
                      }))
                    }
                  >
                    <Trash2 size={13} /> Remove question
                  </Btn>
                </div>
              ))}
              <Btn
                kind="secondary"
                onClick={() =>
                  updateBlueprint(active.id, (blueprint) => ({
                    ...blueprint,
                    requirements: [
                      ...blueprint.requirements,
                      { id: crypto.randomUUID(), question: "", answer: "" },
                    ],
                  }))
                }
              >
                <Plus size={13} /> Add requirement
              </Btn>
            </div>

            <div className="ops-panel">
              <Eyebrow>
                WORK PACKAGES · DELIVERABLES · DEPENDENCIES · MILESTONES · DOCUMENTS
              </Eyebrow>
              {active.workPackages.map((workPackage) => (
                <article className="ops-panel" key={workPackage.id}>
                  <div className="ops-form">
                    <label>
                      Work package
                      <input
                        value={workPackage.title}
                        maxLength={200}
                        onChange={(event) =>
                          updateBlueprint(active.id, (blueprint) => ({
                            ...blueprint,
                            workPackages: blueprint.workPackages.map((item) =>
                              item.id === workPackage.id
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={workPackage.description}
                        maxLength={5000}
                        onChange={(event) =>
                          updateBlueprint(active.id, (blueprint) => ({
                            ...blueprint,
                            workPackages: blueprint.workPackages.map((item) =>
                              item.id === workPackage.id
                                ? { ...item, description: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Deliverables (one per line)
                      <textarea
                        value={workPackage.deliverables.join("\n")}
                        onChange={(event) =>
                          updateBlueprint(active.id, (blueprint) => ({
                            ...blueprint,
                            workPackages: blueprint.workPackages.map((item) =>
                              item.id === workPackage.id
                                ? { ...item, deliverables: lines(event.target.value) }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Required documents (one per line)
                      <textarea
                        value={workPackage.requiredDocuments.join("\n")}
                        onChange={(event) =>
                          updateBlueprint(active.id, (blueprint) => ({
                            ...blueprint,
                            workPackages: blueprint.workPackages.map((item) =>
                              item.id === workPackage.id
                                ? { ...item, requiredDocuments: lines(event.target.value) }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <fieldset>
                    <legend>Depends on</legend>
                    {active.workPackages
                      .filter((item) => item.id !== workPackage.id)
                      .map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={workPackage.dependsOn.includes(item.id)}
                            onChange={(event) =>
                              updateBlueprint(active.id, (blueprint) => ({
                                ...blueprint,
                                workPackages: blueprint.workPackages.map((current) =>
                                  current.id === workPackage.id
                                    ? {
                                        ...current,
                                        dependsOn: event.target.checked
                                          ? [...current.dependsOn, item.id]
                                          : current.dependsOn.filter((id) => id !== item.id),
                                      }
                                    : current,
                                ),
                              }))
                            }
                          />{" "}
                          {item.title || "Untitled work package"}
                        </label>
                      ))}
                  </fieldset>
                  <div className="ops-panel">
                    <Eyebrow>MILESTONES</Eyebrow>
                    {workPackage.milestones.map((milestone) => (
                      <div className="ops-toolbar" key={milestone.id}>
                        <label>
                          Milestone
                          <input
                            value={milestone.title}
                            maxLength={200}
                            onChange={(event) =>
                              updateBlueprint(active.id, (blueprint) => ({
                                ...blueprint,
                                workPackages: blueprint.workPackages.map((item) =>
                                  item.id !== workPackage.id
                                    ? item
                                    : {
                                        ...item,
                                        milestones: item.milestones.map((current) =>
                                          current.id === milestone.id
                                            ? { ...current, title: event.target.value }
                                            : current,
                                        ),
                                      },
                                ),
                              }))
                            }
                          />
                        </label>
                        <label>
                          Due date (optional)
                          <input
                            type="date"
                            value={milestone.dueDate ?? ""}
                            onChange={(event) =>
                              updateBlueprint(active.id, (blueprint) => ({
                                ...blueprint,
                                workPackages: blueprint.workPackages.map((item) =>
                                  item.id !== workPackage.id
                                    ? item
                                    : {
                                        ...item,
                                        milestones: item.milestones.map((current) =>
                                          current.id === milestone.id
                                            ? { ...current, dueDate: event.target.value || null }
                                            : current,
                                        ),
                                      },
                                ),
                              }))
                            }
                          />
                        </label>
                        <Btn
                          kind="quiet"
                          onClick={() =>
                            updateBlueprint(active.id, (blueprint) => ({
                              ...blueprint,
                              workPackages: blueprint.workPackages.map((item) =>
                                item.id !== workPackage.id
                                  ? item
                                  : {
                                      ...item,
                                      milestones: item.milestones.filter(
                                        (current) => current.id !== milestone.id,
                                      ),
                                    },
                              ),
                            }))
                          }
                        >
                          <Trash2 size={13} /> Remove milestone
                        </Btn>
                      </div>
                    ))}
                    <Btn
                      kind="quiet"
                      onClick={() =>
                        updateBlueprint(active.id, (blueprint) => ({
                          ...blueprint,
                          workPackages: blueprint.workPackages.map((item) =>
                            item.id === workPackage.id
                              ? {
                                  ...item,
                                  milestones: [
                                    ...item.milestones,
                                    { id: crypto.randomUUID(), title: "", dueDate: null },
                                  ],
                                }
                              : item,
                          ),
                        }))
                      }
                    >
                      <Plus size={13} /> Add milestone
                    </Btn>
                  </div>
                  <Btn
                    kind="quiet"
                    onClick={() =>
                      updateBlueprint(active.id, (blueprint) => ({
                        ...blueprint,
                        workPackages: blueprint.workPackages
                          .filter((item) => item.id !== workPackage.id)
                          .map((item) => ({
                            ...item,
                            dependsOn: item.dependsOn.filter((id) => id !== workPackage.id),
                          })),
                      }))
                    }
                  >
                    <Trash2 size={13} /> Remove work package
                  </Btn>
                </article>
              ))}
              <Btn
                kind="secondary"
                onClick={() =>
                  updateBlueprint(active.id, (blueprint) => ({
                    ...blueprint,
                    workPackages: [...blueprint.workPackages, blankPackage(crypto.randomUUID())],
                  }))
                }
              >
                <Plus size={13} /> Add work package
              </Btn>
            </div>
          </section>

          <section className="ops-panel">
            <Eyebrow>PRIVATE PROPOSAL COMPARISON</Eyebrow>
            <p className="ops-note">
              Enter only information supplied to you. Unknown scope, price, currency, timeline,
              exclusions, or evidence stays unknown. This view does not score or select a provider.
            </p>
            <Btn
              kind="secondary"
              onClick={() => {
                const next = createProposalComparison(crypto.randomUUID());
                if (
                  persist({
                    blueprints: state.blueprints.map((blueprint) =>
                      blueprint.id === active.id
                        ? { ...blueprint, proposals: [...blueprint.proposals, next] }
                        : blueprint,
                    ),
                  })
                )
                  setActiveProposalId(next.id);
              }}
            >
              <Plus size={13} /> Add proposal comparison
            </Btn>
            {!active.proposals.length && (
              <p className="ops-note">
                No proposals added. A blank entry leaves provider and all proposal terms unknown.
              </p>
            )}
            {active.proposals.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`ops-row ${proposal?.id === item.id ? "active" : ""}`}
                aria-pressed={proposal?.id === item.id}
                onClick={() => setActiveProposalId(item.id)}
              >
                <span>
                  <b>{item.providerLabel.trim() || "Provider not named"}</b>
                  <small>
                    {item.price == null || item.currency == null
                      ? "Price and currency unknown"
                      : `${item.currency} ${item.price}`}{" "}
                    · {item.timeline?.trim() || "Timeline unknown"}
                  </small>
                </span>
              </button>
            ))}
            {proposal && (
              <div className="ops-form">
                <label>
                  Provider label (entered by you)
                  <input
                    value={proposal.providerLabel}
                    maxLength={200}
                    onChange={(event) =>
                      updateProposal(proposal.id, (current) => ({
                        ...current,
                        providerLabel: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Scope
                  <textarea
                    value={proposal.scope ?? ""}
                    maxLength={5000}
                    placeholder="Unknown unless supplied"
                    onChange={(event) =>
                      updateProposal(proposal.id, (current) => ({
                        ...current,
                        scope: event.target.value || null,
                      }))
                    }
                  />
                </label>
                <label>
                  Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={proposalPrice}
                    onChange={(event) =>
                      setProposalDraft({
                        key: proposalKey,
                        price: event.target.value,
                        currency: proposalCurrency,
                      })
                    }
                  />
                </label>
                <label>
                  Currency code
                  <input
                    value={proposalCurrency}
                    maxLength={3}
                    placeholder="Unknown unless supplied"
                    onChange={(event) =>
                      setProposalDraft({
                        key: proposalKey,
                        price: proposalPrice,
                        currency: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <Btn
                  kind="secondary"
                  onClick={() => {
                    const price = proposalPrice.trim() ? Number(proposalPrice) : null;
                    const currency =
                      price === null ? null : proposalCurrency.trim().toUpperCase() || null;
                    if (!validateBudgetAssumption(price, currency)) {
                      setError(
                        "Enter a non-negative proposal price and a three-letter currency code together, or leave both blank to keep them unknown.",
                      );
                      return;
                    }
                    updateProposal(proposal.id, (current) => ({ ...current, price, currency }));
                  }}
                >
                  Save price and currency
                </Btn>
                <label>
                  Timeline
                  <textarea
                    value={proposal.timeline ?? ""}
                    maxLength={1000}
                    placeholder="Unknown unless supplied"
                    onChange={(event) =>
                      updateProposal(proposal.id, (current) => ({
                        ...current,
                        timeline: event.target.value || null,
                      }))
                    }
                  />
                </label>
                <label>
                  Exclusions
                  <textarea
                    value={proposal.exclusions ?? ""}
                    maxLength={5000}
                    placeholder="Unknown unless supplied"
                    onChange={(event) =>
                      updateProposal(proposal.id, (current) => ({
                        ...current,
                        exclusions: event.target.value || null,
                      }))
                    }
                  />
                </label>
                <label>
                  Evidence links (one HTTPS URL per line)
                  <textarea
                    value={evidenceValue}
                    onChange={(event) =>
                      setEvidenceDraft({ key: proposalKey, value: event.target.value })
                    }
                  />
                </label>
                <Btn
                  kind="secondary"
                  onClick={() => {
                    const values = lines(evidenceValue);
                    if (!values.every(validateEvidenceLink)) {
                      setError(
                        "Evidence links must be HTTPS URLs without embedded credentials; the last saved links are unchanged.",
                      );
                      return;
                    }
                    updateProposal(proposal.id, (current) => ({
                      ...current,
                      evidenceLinks: values,
                    }));
                  }}
                >
                  Save evidence links
                </Btn>
                <label>
                  Clarification questions (one per line)
                  <textarea
                    value={proposal.clarificationQuestions.join("\n")}
                    onChange={(event) =>
                      updateProposal(proposal.id, (current) => ({
                        ...current,
                        clarificationQuestions: lines(event.target.value),
                      }))
                    }
                  />
                </label>
                <Btn
                  kind="quiet"
                  onClick={() => {
                    const next = {
                      ...active,
                      proposals: active.proposals.filter((item) => item.id !== proposal.id),
                    };
                    if (
                      persist({
                        blueprints: state.blueprints.map((blueprint) =>
                          blueprint.id === active.id ? next : blueprint,
                        ),
                      })
                    ) {
                      setActiveProposalId(next.proposals[0]?.id ?? null);
                    }
                  }}
                >
                  <Trash2 size={13} /> Remove proposal comparison
                </Btn>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
