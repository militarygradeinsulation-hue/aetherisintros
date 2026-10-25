import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isShowcase } from "@/aetheris/showcase";
import { loadHR, saveHR, askHR } from "@/lib/hr.functions";
import {
  AI_TASKS,
  KINDS,
  MODULES,
  contextSchema,
  recordInput,
  planTasks,
  payrollCsv,
  grossPay,
  type Field,
  type HRKind,
  type HRContext,
  type HRState,
  type HRRecord,
  type HRRecordInput,
  type HRCommand,
} from "./model";
import "./hr.css";

type Tab = "overview" | "setup" | "assistant" | HRKind;
type Act = (command: HRCommand) => Promise<boolean>;
export function downloadHR(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function HRWorkspace() {
  const [account, setAccount] = useState<string | null>(null),
    [checking, setChecking] = useState(true);
  useEffect(() => {
    if (isShowcase()) {
      setChecking(false);
      return;
    }
    let active = true,
      revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      revision++;
      if (active) {
        setAccount(s?.user.id ?? null);
        setChecking(false);
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && !revision) {
        setAccount(error ? null : (data.session?.user.id ?? null));
        setChecking(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  if (checking)
    return (
      <section className="hr-workspace">
        <p role="status">Opening your private HR workspace…</p>
      </section>
    );
  if (!account)
    return (
      <section className="hr-workspace">
        <h1>People & HR</h1>
        <p>Sign in to tailor your private HR workspace to your business.</p>
        <a href="/auth">Sign in</a>
      </section>
    );
  return <MemberHR key={account} account={account} />;
}
function MemberHR({ account }: { account: string }) {
  const [state, setState] = useState<HRState | null>(null),
    [tab, setTab] = useState<Tab>("overview"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<HRRecordInput | null>(null),
    [search, setSearch] = useState("");
  const alive = useRef(true),
    pending = useRef(false),
    sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current = false;
      sequence.current++;
    };
  }, []);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  async function run(command?: HRCommand) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const seq = ++sequence.current;
    try {
      const next = command ? await saveHR({ data: command }) : await loadHR();
      if (!alive.current || seq !== sequence.current) return false;
      if (next.userId !== account) throw new Error("Your account changed. Reopen HR.");
      setState(next);
      if (command) {
        setNotice("Saved privately to your account.");
        setDirty(false);
      }
      return true;
    } catch (e) {
      if (alive.current && seq === sequence.current)
        setError(e instanceof Error ? e.message : "Your changes could not be saved.");
      return false;
    } finally {
      if (seq === sequence.current) {
        pending.current = false;
        if (alive.current) setBusy(false);
      }
    }
  }
  useEffect(() => {
    void run();
  }, []);
  function navigate(next: Tab) {
    if (next === tab) return;
    if (dirty && !window.confirm("Leave this section and discard unsaved changes?")) return;
    setDirty(false);
    setEditing(null);
    setSearch("");
    setNotice("");
    setError("");
    setTab(next);
  }
  function edit(record: HRRecordInput) {
    if (dirty && !window.confirm("Discard the current unsaved changes?")) return;
    setEditing(record);
    setDirty(false);
    setError("");
  }
  const newRecord = (kind: HRKind) =>
    edit({
      id: crypto.randomUUID(),
      kind,
      version: 0,
      fields: Object.fromEntries(
        (MODULES[kind].fields as readonly Field[]).map((f) => [
          f.key,
          f.type === "select" ? (f.options?.[0] ?? "") : "",
        ]),
      ),
    });
  const canEdit = Boolean(state?.storageReady && state.version);
  return (
    <section className="hr-workspace">
      <header className="hr-header">
        <div>
          <small>ASK INTROS · PRIVATE BUSINESS TOOLS</small>
          <h1>People & HR</h1>
          <p>
            {state?.context.company ?? "Your business"} · One place to care for your team and manage
            the work.
          </p>
        </div>
        {state && (
          <button
            onClick={() =>
              downloadHR(
                "ask-intros-hr-export.json",
                JSON.stringify(state, null, 2),
                "application/json",
              )
            }
          >
            Export saved HR records
          </button>
        )}
      </header>
      {error && (
        <div className="hr-alert" role="alert">
          <p>{error}</p>
          <button
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Reload saved records? Export any unsaved editor text first.")
              ) {
                setEditing(null);
                setDirty(false);
                void run();
              }
            }}
          >
            Reload saved records
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!state && !error && <p role="status">Loading your business context…</p>}
      {state && (
        <>
          {!state.storageReady && (
            <aside className="hr-alert">
              <strong>HR storage awaits activation</strong>
              <p>
                Your profile has prepared the business setup below. HR saving and AI will become
                available after the private database migration is activated.
              </p>
            </aside>
          )}
          {!state.version && (
            <aside className="hr-note">
              <strong>Your business profile is ready to use</strong>
              <p>
                Review the prefilled company details, work model, locations and team size to tailor
                HR to your business.
              </p>
              <button onClick={() => navigate("setup")}>Review business setup</button>
            </aside>
          )}
          <div className="hr-layout">
            <nav aria-label="HR sections">
              {(["overview", "setup", ...KINDS, "assistant"] as Tab[]).map((t) => (
                <button
                  key={t}
                  disabled={busy}
                  aria-current={tab === t ? "page" : undefined}
                  onClick={() => navigate(t)}
                >
                  <span>
                    {t === "overview"
                      ? "Overview"
                      : t === "setup"
                        ? "Business setup"
                        : t === "assistant"
                          ? "HR Butler"
                          : MODULES[t].label}
                  </span>
                  {KINDS.includes(t as HRKind) && (
                    <span className="hr-count">
                      {state.records.filter((r) => r.kind === t).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <main className="hr-main" aria-busy={busy}>
              {tab === "overview" && <Overview state={state} navigate={navigate} />}
              {tab === "setup" && (
                <Setup
                  key={state.version}
                  context={state.context}
                  busy={busy || !state.storageReady}
                  onChange={() => setDirty(true)}
                  save={(context) => run({ action: "context", context, version: state.version })}
                />
              )}
              {tab === "assistant" && (
                <HRButler
                  state={state}
                  account={account}
                  act={run}
                  onDirty={setDirty}
                  parentBusy={busy}
                />
              )}
              {KINDS.includes(tab as HRKind) &&
                (() => {
                  const kind = tab as HRKind;
                  const module = MODULES[kind];
                  const records = state.records.filter(
                    (r) =>
                      r.kind === kind &&
                      Object.values(r.fields)
                        .join(" ")
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  );
                  return (
                    <>
                      <div className="hr-section-heading">
                        <div>
                          <h2>{module.label}</h2>
                          <p>{module.description}</p>
                        </div>
                        <button disabled={busy || !canEdit} onClick={() => newRecord(kind)}>
                          Add {module.singular.toLowerCase()}
                        </button>
                      </div>
                      {kind === "task" && canEdit && !editing && (
                        <PlanBuilder state={state} act={run} busy={busy} onDirty={setDirty} />
                      )}
                      {kind === "timesheet" && (
                        <div className="hr-note">
                          <p>
                            Only approved hours appear in this CSV. Gross estimates exclude taxes,
                            deductions, benefits and jurisdiction rules. Review with your payroll
                            provider.
                          </p>
                          <button
                            disabled={
                              !state.records.some(
                                (r) =>
                                  r.kind === "timesheet" &&
                                  ["Approved", "Exported"].includes(r.fields["status"] ?? ""),
                              )
                            }
                            onClick={() =>
                              downloadHR(
                                "ask-intros-payroll-inputs.csv",
                                payrollCsv(state.records),
                                "text/csv",
                              )
                            }
                          >
                            Export approved payroll inputs
                          </button>
                        </div>
                      )}
                      {editing && (
                        <RecordEditor
                          key={editing.id}
                          record={editing}
                          records={state.records}
                          busy={busy}
                          onChange={() => setDirty(true)}
                          save={async (record) => {
                            if (await run({ action: "record", record })) setEditing(null);
                          }}
                          cancel={() => {
                            if (!dirty || window.confirm("Discard these unsaved changes?")) {
                              setEditing(null);
                              setDirty(false);
                            }
                          }}
                        />
                      )}
                      <label className="hr-search">
                        Search {module.label.toLowerCase()}
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Find saved records"
                        />
                      </label>
                      <div className="hr-records">
                        {records.map((r) => (
                          <article className="hr-card" key={r.id}>
                            <div className="hr-section-heading">
                              <h3>{r.fields["name"] || r.fields["title"]}</h3>
                              <span className="hr-badge">{r.fields["status"]}</span>
                            </div>
                            <dl>
                              {(module.fields as readonly Field[])
                                .filter(
                                  (f) =>
                                    !["title", "name", "status"].includes(f.key) && r.fields[f.key],
                                )
                                .map((f) => (
                                  <div key={f.key}>
                                    <dt>{f.label}</dt>
                                    <dd>
                                      {f.type === "employee" || f.type === "job"
                                        ? (state.records.find((link) => link.id === r.fields[f.key])
                                            ?.fields[f.type === "employee" ? "name" : "title"] ??
                                          "Record unavailable")
                                        : r.fields[f.key]}
                                    </dd>
                                  </div>
                                ))}
                            </dl>
                            {kind === "timesheet" && (
                              <p>
                                <strong>
                                  Gross estimate: {grossPay(r.fields).toFixed(2)}{" "}
                                  {r.fields["currency"]}
                                </strong>
                              </p>
                            )}
                            <small>
                              Version {r.version} · Saved{" "}
                              {new Date(r.updated_at).toLocaleDateString()}
                            </small>
                            <div className="hr-actions">
                              <button disabled={busy} onClick={() => edit(r)}>
                                Review and edit
                              </button>
                              <button
                                disabled={busy || dirty || !!editing}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Delete this private record? Linked records must be removed or reassigned first.",
                                    )
                                  )
                                    void run({ action: "delete", id: r.id, version: r.version });
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                      {!records.length && (
                        <div className="hr-card">
                          <h3>
                            {search
                              ? "No matching records"
                              : `Your ${module.label.toLowerCase()} starts here`}
                          </h3>
                          <p>
                            {search
                              ? "Try a different search."
                              : `Add a ${module.singular.toLowerCase()} to begin. No example people or employment records have been added.`}
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
            </main>
          </div>
          <footer>
            <p>
              Private to this account. No HR records are published to the social feed or shared with
              other members. Keep government IDs, bank details and medical records out of these
              fields.
            </p>
          </footer>
        </>
      )}
    </section>
  );
}
function Overview({ state, navigate }: { state: HRState; navigate: (tab: Tab) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const due = state.records
    .filter(
      (r) =>
        r.fields["due"] &&
        !["Done", "Complete", "Completed", "Closed", "Retired", "Archived", "Cancelled"].includes(
          r.fields["status"] ?? "",
        ),
    )
    .sort((a, b) => (a.fields["due"] ?? "").localeCompare(b.fields["due"] ?? ""));
  return (
    <>
      <h2>Your people operations</h2>
      <div className="hr-stats">
        {[
          [
            "Active people",
            state.records.filter((r) => r.kind === "employee" && r.fields["status"] !== "Departed")
              .length,
            "employee",
          ],
          [
            "Open roles",
            state.records.filter((r) => r.kind === "job" && r.fields["status"] === "Open").length,
            "job",
          ],
          [
            "Pending time off",
            state.records.filter((r) => r.kind === "leave" && r.fields["status"] === "Pending")
              .length,
            "leave",
          ],
          [
            "Tasks to complete",
            state.records.filter((r) => r.kind === "task" && r.fields["status"] !== "Done").length,
            "task",
          ],
        ].map(([label, count, tab]) => (
          <button key={String(tab)} onClick={() => navigate(tab as Tab)}>
            <strong>{count}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <article className="hr-card">
        <small>TAILORED TO YOUR BUSINESS</small>
        <h3>{state.context.company}</h3>
        <p>
          {state.context.industry || "Add your industry"} · {state.context.workModel} team ·{" "}
          {state.context.teamSize
            ? `${state.context.teamSize} people declared`
            : "Team size to confirm"}
        </p>
        <p>{state.context.locations || "Add employee work locations to guide HR planning."}</p>
        <p>
          {state.context.workModel === "Field"
            ? "Your starter checklists emphasize site safety, equipment, role training and handovers."
            : state.context.workModel === "Remote"
              ? "Your starter checklists emphasize remote access, communication and manager check ins."
              : "Your starter checklists emphasize workplace orientation, access, role training and manager check ins."}
        </p>
        <button onClick={() => navigate("setup")}>Adjust business context</button>
        <button onClick={() => navigate("assistant")}>Work with HR Butler</button>
      </article>
      <article className="hr-card">
        <h3>Upcoming work</h3>
        {due.length ? (
          <ul className="hr-due">
            {due.slice(0, 12).map((r) => (
              <li key={r.id}>
                <button onClick={() => navigate(r.kind)}>
                  {r.fields["title"] || r.fields["name"]}
                </button>
                <span>
                  {r.fields["due"]}
                  {(r.fields["due"] ?? "") < today ? " · Overdue" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Add due dates to training, reviews, tasks and other records to see them here.</p>
        )}
      </article>
      <details className="hr-card">
        <summary>Recent account activity</summary>
        {state.audit.length ? (
          <ul>
            {state.audit.map((event, i) => (
              <li key={i}>
                {event.action}
                {event.kind
                  ? ` · ${MODULES[event.kind as HRKind]?.singular ?? event.kind}`
                  : ""} · {new Date(event.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>Saved HR changes will appear here.</p>
        )}
      </details>
    </>
  );
}
function Setup({
  context,
  busy,
  onChange,
  save,
}: {
  context: HRContext;
  busy: boolean;
  onChange: () => void;
  save: (context: HRContext) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(context),
    [error, setError] = useState("");
  const fields: Array<[keyof HRContext, string]> = [
    ["company", "Business name"],
    ["industry", "Industry"],
    ["description", "What your business does"],
    ["locations", "Employee work locations"],
    ["teamSize", "Team size"],
    ["priorities", "Current people priorities"],
    ["policyContext", "Existing policies and business practices"],
  ];
  return (
    <article className="hr-card">
      <h2>Your business, reflected in HR</h2>
      <p>
        Company information is prefilled from your profile. Confirm the work model and missing
        details. Later profile changes never overwrite your reviewed setup.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = contextSchema.safeParse(draft);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Review the fields");
            return;
          }
          setError("");
          await save(parsed.data);
        }}
      >
        <fieldset disabled={busy}>
          <div className="hr-form-grid">
            {fields["map"](([key, label]) => (
              <label key={key}>
                {label}
                {["description", "priorities", "policyContext"].includes(key) ? (
                  <textarea
                    value={draft[key]}
                    maxLength={key === "policyContext" ? 5000 : 3000}
                    onChange={(e) => {
                      onChange();
                      setDraft({ ...draft, [key]: e.target.value });
                    }}
                  />
                ) : (
                  <input
                    value={draft[key]}
                    required={key === "company"}
                    inputMode={key === "teamSize" ? "numeric" : undefined}
                    maxLength={key === "teamSize" ? 6 : 500}
                    onChange={(e) => {
                      onChange();
                      setDraft({ ...draft, [key]: e.target.value });
                    }}
                  />
                )}
              </label>
            ))}
            <label>
              Work model
              <select
                value={draft.workModel}
                onChange={(e) => {
                  onChange();
                  setDraft({ ...draft, workModel: e.target.value as HRContext["workModel"] });
                }}
              >
                {["Field", "Office", "Hybrid", "Remote"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p role="alert">{error}</p>}
          <button>Confirm and save business setup</button>
        </fieldset>
      </form>
    </article>
  );
}
function RecordEditor({
  record,
  records,
  busy,
  onChange,
  save,
  cancel,
}: {
  record: HRRecordInput;
  records: HRRecord[];
  busy: boolean;
  onChange: () => void;
  save: (record: HRRecordInput) => Promise<void>;
  cancel: () => void;
}) {
  const [fields, setFields] = useState(record.fields),
    [error, setError] = useState("");
  const module = MODULES[record.kind];
  function change(key: string, value: string) {
    onChange();
    setFields((old) => ({ ...old, [key]: value }));
  }
  return (
    <article className="hr-card hr-editor">
      <h3>
        {record.version ? "Edit" : "Add"} {module.singular.toLowerCase()}
      </h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = recordInput.safeParse({
            id: record.id,
            kind: record.kind,
            version: record.version,
            fields,
          });
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Review your record");
            return;
          }
          setError("");
          await save(parsed.data);
        }}
      >
        <fieldset disabled={busy}>
          <div className="hr-form-grid">
            {(module.fields as readonly Field[]).map((f) => (
              <label key={f.key} className={f.type === "textarea" ? "hr-wide" : ""}>
                {f.label}
                {f.required ? " *" : ""}
                {f.type === "textarea" ? (
                  <textarea
                    name={f.key}
                    aria-label={f.label + (f.required ? " *" : "")}
                    value={fields[f.key] ?? ""}
                    required={f.required}
                    maxLength={20000}
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                ) : ["select", "employee", "job"].includes(f.type ?? "") ? (
                  <select
                    name={f.key}
                    aria-label={f.label + (f.required ? " *" : "")}
                    value={fields[f.key] ?? ""}
                    required={f.required}
                    onChange={(e) => change(f.key, e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {f.type === "select"
                      ? f.options?.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))
                      : records
                          .filter((r) => r.kind === f.type)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.fields["name"] || r.fields["title"]}
                            </option>
                          ))}
                  </select>
                ) : (
                  <input
                    name={f.key}
                    aria-label={f.label + (f.required ? " *" : "")}
                    type={f.type ?? "text"}
                    value={fields[f.key] ?? ""}
                    required={f.required}
                    min={f.type === "number" ? 0 : undefined}
                    max={f.max}
                    step={f.type === "number" ? "0.01" : undefined}
                    maxLength={500}
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="hr-actions">
            <button>Save {module.singular.toLowerCase()}</button>
            <button type="button" onClick={cancel}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                downloadHR(
                  "ask-intros-hr-unsaved-draft.json",
                  JSON.stringify({ ...record, fields }, null, 2),
                  "application/json",
                )
              }
            >
              Download this draft
            </button>
          </div>
        </fieldset>
      </form>
    </article>
  );
}
function PlanBuilder({
  state,
  act,
  busy,
  onDirty,
}: {
  state: HRState;
  act: Act;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const [employee, setEmployee] = useState(""),
    [workflow, setWorkflow] = useState<"Onboarding" | "Offboarding">("Onboarding"),
    [date, setDate] = useState(""),
    [plan, setPlan] = useState<HRRecordInput[]>([]);
  return (
    <details className="hr-card">
      <summary>Build a tailored checklist</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const person = state.records.find((r) => r.id === employee && r.kind === "employee");
          if (person) {
            setPlan(planTasks(state.context, person, workflow, date));
            onDirty(true);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className="hr-form-grid">
            <label>
              Employee for checklist
              <select
                value={employee}
                required
                onChange={(e) => {
                  setEmployee(e.target.value);
                  setPlan([]);
                }}
              >
                <option value="">Choose an employee</option>
                {state.records
                  .filter((r) => r.kind === "employee")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fields["name"]}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Checklist type
              <select
                value={workflow}
                onChange={(e) => {
                  setWorkflow(e.target.value as typeof workflow);
                  setPlan([]);
                }}
              >
                <option>Onboarding</option>
                <option>Offboarding</option>
              </select>
            </label>
            <label>
              Initial task due date
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPlan([]);
                }}
              />
            </label>
          </div>
          <button>Preview tailored checklist</button>
        </fieldset>
      </form>
      {plan.length > 0 && (
        <>
          <p>
            Review this starting checklist. Each task can be edited after saving. Completion remains
            manual.
          </p>
          <ol>
            {plan.map((r) => (
              <li key={r.id}>{r.fields["title"]}</li>
            ))}
          </ol>
          <button
            disabled={busy}
            onClick={async () => {
              if (await act({ action: "plan", records: plan })) {
                setPlan([]);
                onDirty(false);
              }
            }}
          >
            Save these {plan.length} tasks
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setPlan([]);
              onDirty(false);
            }}
          >
            Discard checklist
          </button>
        </>
      )}
    </details>
  );
}
function HRButler({
  state,
  account,
  act,
  onDirty,
  parentBusy,
}: {
  state: HRState;
  account: string;
  act: Act;
  onDirty: (dirty: boolean) => void;
  parentBusy: boolean;
}) {
  const [task, setTask] = useState<(typeof AI_TASKS)[number]>("Conversation"),
    [brief, setBrief] = useState(""),
    [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]),
    [consent, setConsent] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState(""),
    [title, setTitle] = useState(""),
    [documentId, setDocumentId] = useState(() => crypto.randomUUID()),
    [saved, setSaved] = useState(false);
  const active = useRef(true),
    pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending.current || !consent) return;
    pending.current = true;
    setWorking(true);
    setError("");
    try {
      const result = await askHR({
        data: { task, brief, history: history.slice(-8), consent: true },
      });
      if (!active.current || result.userId !== account) return;
      setAnswer(result.answer);
      setDocumentId(crypto.randomUUID());
      setSaved(false);
      setHistory((old) => [
        ...old.slice(-6),
        { role: "user", content: brief },
        { role: "assistant", content: result.answer },
      ]);
      setBrief("");
      onDirty(true);
      setTitle(`${state.context.company}: ${task}`);
    } catch (e) {
      if (active.current)
        setError(e instanceof Error ? e.message : "Unable to get an HR response.");
    } finally {
      pending.current = false;
      if (active.current) setWorking(false);
    }
  }
  return (
    <>
      <h2>HR Butler</h2>
      <p>Have a conversation or prepare a working draft tailored to your saved business setup.</p>
      <aside className="hr-note">
        <p>
          Uses {state.context.company}, its industry, work model, locations and saved business
          practices. Personnel records are not automatically sent. Only the question and
          conversation you submit are included.
        </p>
      </aside>
      {!state.aiAvailable && (
        <p role="status">
          HR AI is awaiting provider configuration. You can still manage your saved records and
          create checklists.
        </p>
      )}
      <form onSubmit={(e) => void submit(e)}>
        <fieldset disabled={working || parentBusy || !state.aiAvailable || !state.version}>
          <label>
            What are we working on?
            <select value={task} onChange={(e) => setTask(e.target.value as typeof task)}>
              {AI_TASKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Your question or brief
            <textarea
              required
              minLength={3}
              maxLength={6000}
              value={brief}
              onChange={(e) => {
                setBrief(e.target.value);
                onDirty(true);
              }}
              placeholder="Help me prepare an interview guide for a service manager, using job related evidence."
            />
          </label>
          <label className="hr-checkbox">
            <input
              type="checkbox"
              checked={consent}
              required
              onChange={(e) => setConsent(e.target.checked)}
            />
            Use my business context and this conversation with the AI provider. I will keep
            unnecessary personal details out.
          </label>
          <button>{working ? "Preparing your response…" : "Ask HR Butler"}</button>
        </fieldset>
      </form>
      {error && (
        <p className="hr-alert" role="alert">
          {error}
        </p>
      )}
      {history.length > 0 && (
        <details className="hr-card">
          <summary>Conversation so far</summary>
          {history.map((m, i) => (
            <div key={i}>
              <strong>{m.role === "user" ? "You" : "HR Butler"}</strong>
              <p className="hr-pre">{m.content}</p>
            </div>
          ))}
        </details>
      )}
      {answer && (
        <article className="hr-card">
          <h3>Review your working draft</h3>
          <p>
            Nothing has been approved, sent, or published. Edit the draft before saving it to
            Documents.
          </p>
          <label>
            Document title
            <input
              value={title}
              maxLength={180}
              onChange={(e) => {
                if (saved) setDocumentId(crypto.randomUUID());
                setSaved(false);
                setTitle(e.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label>
            Editable response
            <textarea
              className="hr-answer"
              maxLength={20000}
              value={answer}
              onChange={(e) => {
                if (saved) setDocumentId(crypto.randomUUID());
                setSaved(false);
                setAnswer(e.target.value);
                onDirty(true);
              }}
            />
          </label>
          <button
            disabled={parentBusy || working || saved || !title.trim() || !answer.trim()}
            onClick={async () => {
              if (
                await act({
                  action: "record",
                  record: {
                    id: documentId,
                    kind: "document",
                    version: 0,
                    fields: {
                      title,
                      category: task,
                      content: answer,
                      status: "Draft",
                      reviewer: "",
                      due: "",
                    },
                  },
                })
              ) {
                setSaved(true);
                onDirty(false);
              }
            }}
          >
            {saved ? "Saved to Documents" : "Save draft to Documents"}
          </button>
          <button onClick={() => downloadHR("ask-intros-hr-draft.txt", title + "\n\n" + answer)}>
            Download draft
          </button>
        </article>
      )}
    </>
  );
}
