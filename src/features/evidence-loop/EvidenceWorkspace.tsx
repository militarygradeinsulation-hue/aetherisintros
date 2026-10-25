import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadEvidence, saveEvidence } from "@/lib/evidence.functions";
import {
  activeTick,
  minutes,
  TASKS,
  weeklySummary,
  type EvidenceCommand,
  type EvidenceState,
  type Task,
} from "./model";
import "./evidence.css";

type Controller = {
  state: EvidenceState | null;
  busy: boolean;
  error: string;
  elapsed: number;
  running: boolean;
  recovered: boolean;
  act: (c: EvidenceCommand) => Promise<boolean>;
  reload: () => Promise<void>;
  resume: () => void;
  pause: () => void;
};
const Context = createContext<Controller | null>(null);
export function EvidenceProvider({
  children,
  live = true,
}: {
  children: ReactNode;
  live?: boolean;
}) {
  const [account, setAccount] = useState<string | null>(null);
  useEffect(() => {
    if (!live) return;
    let alive = true,
      revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      revision++;
      if (alive) setAccount(s?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (alive && !revision) setAccount(data.session?.user.id ?? null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [live]);
  return (
    <AccountEvidence
      key={live ? (account ?? "signed-out") : "demo"}
      account={live ? account : null}
    >
      {children}
    </AccountEvidence>
  );
}
function AccountEvidence({ account, children }: { account: string | null; children: ReactNode }) {
  const [state, setState] = useState<EvidenceState | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [elapsed, setElapsed] = useState(0),
    [running, setRunning] = useState(false),
    [recovered, setRecovered] = useState(false);
  const alive = useRef(true),
    lock = useRef(false),
    clock = useRef({ total: 0, last: 0, input: 0, running: false });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const pause = () => {
    clock.current.running = false;
    setRunning(false);
  };
  const resume = () => {
    if (!state?.records.some((r) => !r.finished_at) || recovered) return;
    clock.current.last = clock.current.input = performance.now();
    clock.current.running = true;
    setRunning(true);
  };
  async function reload() {
    if (!account) return;
    setBusy(true);
    setError("");
    try {
      const s = await loadEvidence();
      if (alive.current && s.userId === account) {
        setState(s);
        if (s.records.some((r) => !r.finished_at)) {
          pause();
          setRecovered(true);
        }
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Could not load evidence.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    void reload();
  }, [account]);
  async function act(c: EvidenceCommand) {
    if (!account || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    if (c.action === "finish" || c.action === "delete" || c.action === "erase") pause();
    try {
      const s = await saveEvidence({ data: c });
      if (!alive.current || s.userId !== account) return false;
      setState(s);
      if (c.action === "start") {
        clock.current = {
          total: 0,
          last: performance.now(),
          input: performance.now(),
          running: true,
        };
        setElapsed(0);
        setRecovered(false);
        setRunning(true);
      } else if (!s.records.some((r) => !r.finished_at)) {
        pause();
        clock.current.total = 0;
        setElapsed(0);
        setRecovered(false);
      }
      window.dispatchEvent(new Event("aetheris:evidence-changed"));
      return true;
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Changes were not saved.");
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    const input = () => {
      clock.current.input = performance.now();
    };
    const hide = () => {
      if (document.hidden) pause();
    };
    const timer = setInterval(() => {
      const c = clock.current,
        now = performance.now();
      c.total += activeTick(now, c.last, c.input, !document.hidden, c.running);
      c.last = now;
      if (c.running && (now - c.input > 60000 || c.total >= 14400000)) pause();
      if (c.running) setElapsed(Math.floor(c.total / 1000));
    }, 1000);
    for (const e of ["pointerdown", "keydown", "scroll"])
      window.addEventListener(e, input, { passive: true, capture: true });
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(timer);
      for (const e of ["pointerdown", "keydown", "scroll"])
        window.removeEventListener(e, input, true);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const active = state?.records.find((r) => !r.finished_at);
  return (
    <Context.Provider
      value={{ state, busy, error, elapsed, running, recovered, act, reload, resume, pause }}
    >
      {active && (
        <aside className="evidence-timer" aria-label="Private task timer">
          <span>
            <strong>{TASKS.find((t) => t.id === active.task)?.label}</strong>
            <small>
              {recovered
                ? "Interrupted session. Discard it before starting again."
                : `${minutes(elapsed)} active · ${running ? "Recording" : "Paused"}`}
            </small>
          </span>
          {!recovered && (
            <>
              <button disabled={busy} onClick={running ? pause : resume}>
                {running ? "Pause" : "Resume"}
              </button>
              <button
                disabled={busy || elapsed < 1}
                onClick={() =>
                  void act({ action: "finish", id: active.id, activeSeconds: elapsed })
                }
              >
                Reviewed & complete
              </button>
            </>
          )}
          <button disabled={busy} onClick={() => void act({ action: "delete", id: active.id })}>
            Discard
          </button>
          {error && <span role="alert">{error}</span>}
        </aside>
      )}
      {children}
    </Context.Provider>
  );
}
export function EvidenceWorkspace() {
  const controller = useContext(Context);
  if (!controller)
    return (
      <section className="evidence-workspace">
        <p>Open Evidence & Time from your signed-in workspace.</p>
      </section>
    );
  return <EvidencePanel key={controller.state?.userId ?? "loading"} controller={controller} />;
}
export function EvidencePanel({ controller: c }: { controller: Controller }) {
  const [task, setTask] = useState<Task>("contact"),
    [baseline, setBaseline] = useState(""),
    [kind, setKind] = useState<"estimate" | "observed">("estimate"),
    [samples, setSamples] = useState("3"),
    [erase, setErase] = useState(false);
  const s = c.state,
    summary = weeklySummary(s?.records ?? []),
    active = s?.records.some((r) => !r.finished_at);
  const baselineSeconds = baseline.trim() ? Math.round(Number(baseline) * 60) : null;
  const baselineValid =
    baselineSeconds === null ||
    (Number.isFinite(baselineSeconds) &&
      baselineSeconds >= 1 &&
      baselineSeconds <= 14400 &&
      (kind === "estimate" ||
        (Number.isInteger(Number(samples)) && Number(samples) >= 1 && Number(samples) <= 1000)));
  const start = async () => {
    if (!baselineValid) return;
    const ok = await c.act({
      action: "start",
      task,
      baselineSeconds,
      baselineKind: baselineSeconds === null ? null : kind,
      baselineSamples: baselineSeconds === null ? 0 : kind === "estimate" ? 1 : Number(samples),
    });
    if (ok) {
      const page = TASKS.find((t) => t.id === task)!.page;
      if (page !== "executivework")
        window.dispatchEvent(new CustomEvent("aetheris:navigate", { detail: page }));
    }
  };
  const exportRecords = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            scope:
              "Private device-observed active times and member-reported baselines. Not causal savings evidence.",
            records: s?.records ?? [],
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "ask-intros-time-ledger.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="evidence-workspace">
      <small>ASK INTROS · EVIDENCE & TIME</small>
      <h2>Know what your work gives back.</h2>
      <p>
        Private timing, transparent comparisons and introductions that learn from shared outcomes.
      </p>
      {c.error && <p role="alert">{c.error}</p>}
      {!s ? (
        <>
          <p>
            {c.busy
              ? "Loading your evidence settings…"
              : "Sign in to use your private evidence workspace."}
          </p>
          <button disabled={c.busy} onClick={() => void c.reload()}>
            Retry
          </button>
        </>
      ) : (
        <>
          {!s.storageReady && (
            <p role="status">
              Evidence storage is awaiting database activation. Timing and consent controls are
              unavailable until it is connected.
            </p>
          )}
          <fieldset disabled={c.busy || !s.storageReady}>
            <legend>Your choices</legend>
            {(
              [
                {
                  key: "timing",
                  label: "Enable private task timing",
                  copy: "Only task type, timestamps, active duration and your comparison baseline are saved. No text, recipients, keystrokes or screen contents.",
                },
                {
                  key: "ranking",
                  label: "Let mutually shared outcomes inform matching",
                  copy: "When both people opt in and share agreeing reports, distinct partner counts can influence ranking. Private notes, amounts and counterpart identities are never returned. Turning this off removes your reports from future ranking reads.",
                },
                {
                  key: "newcomer",
                  label: "Include me in the newcomer lane",
                  copy: "During your first 30 account days, eligible newcomers get a reserved place in relevant recommendations, with daily rotation. This does not guarantee an introduction, job or outcome.",
                },
              ] as const
            ).map((x) => (
              <label className="evidence-choice" key={x.key}>
                <input
                  type="checkbox"
                  checked={s.preferences[x.key]}
                  onChange={(e) =>
                    void c.act({
                      action: "preferences",
                      ...s.preferences,
                      [x.key]: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>{x.label}</strong>
                  <small>{x.copy}</small>
                </span>
              </label>
            ))}
            {s.newcomerUntil && (
              <p className="evidence-note">
                Your newcomer eligibility ends {new Date(s.newcomerUntil).toLocaleDateString()}. A
                verified member can recommend you from your profile; you approve its display. A
                vouch is a recommendation, not a verified outcome.
              </p>
            )}
          </fieldset>
          <div className="evidence-stats">
            <article>
              <small>Recorded active time · last 7 days</small>
              <strong>{minutes(summary.activeSeconds)}</strong>
              <span>{summary.count} completed tasks</span>
            </article>
            <article>
              <small>Difference against reported observations</small>
              <strong>
                {summary.observedDelta === null
                  ? "Not enough evidence"
                  : minutes(summary.observedDelta)}
              </strong>
              <span>
                {summary.observedCount} tasks with at least 3 reported baseline observations
              </span>
            </article>
            <article>
              <small>Estimated difference</small>
              <strong>
                {summary.estimatedDelta === null
                  ? "No comparison yet"
                  : minutes(summary.estimatedDelta)}
              </strong>
              <span>
                {summary.estimatedCount} tasks with estimates or fewer than 3 observations
              </span>
            </article>
          </div>
          <p className="evidence-note">
            Positive differences mean less active time; negative values mean more. Baselines are
            supplied by you and are not independently verified. Differences are not proof that Ask
            Intros caused savings. {summary.unpaired} completed tasks have no comparison. Setup,
            maintenance and work outside the timer are not deducted, so these are not net weekly
            savings.
          </p>
          <fieldset
            disabled={c.busy || !s.storageReady || !s.preferences.timing || Boolean(active)}
          >
            <legend>Measure a complete task</legend>
            <p>
              Start when the work begins. Include review and corrections, then choose Reviewed &
              complete. Timing pauses when this tab is hidden or after 60 seconds without
              interaction. Resume explicitly. One task at a time prevents overlap; interrupted
              reloads are discarded, not estimated.
            </p>
            <label>
              Task
              <select aria-label="Task" value={task} onChange={(e) => setTask(e.target.value as Task)}>
                {TASKS.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="evidence-inputs">
              <label>
                Usual active minutes for the same task (optional)
                <input
                  type="number"
                  min="0.02"
                  max="240"
                  step="0.01"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                />
              </label>
              <label>
                Baseline source
                <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                  <option value="estimate">My estimate</option>
                  <option value="observed">Median of my timed observations</option>
                </select>
              </label>
              {kind === "observed" && (
                <label>
                  Number of comparable observations
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={samples}
                    onChange={(e) => setSamples(e.target.value)}
                  />
                </label>
              )}
            </div>
            {!baselineValid && (
              <p role="alert">
                Enter a baseline between 1 second and 240 minutes and a whole observation count
                between 1 and 1000.
              </p>
            )}
            <button disabled={!baselineValid} onClick={() => void start()}>
              Start task timer
            </button>
          </fieldset>
          <h3>Recommendations for your approval</h3>
          <p>
            Only you can approve a recommendation for display. Edits by its author require approval
            again. Reconfirm older recommendations before they can count as starter trust evidence.
          </p>
          {!s.vouches.length && (
            <p>
              No recommendations to review yet. Verified members can recommend you from your member
              profile.
            </p>
          )}
          <div className="evidence-records">
            {s.vouches.map((v) => (
              <article key={v.id}>
                <div>
                  <strong>{v.author_name}</strong>
                  <p>{v.body}</p>
                </div>
                <button
                  disabled={c.busy || !s.storageReady}
                  onClick={() => void c.act({ action: "vouch", id: v.id, approve: true })}
                >
                  {v.display_approved ? "Reconfirm display approval" : "Approve display"}
                </button>
                {v.display_approved && (
                  <button
                    disabled={c.busy}
                    onClick={() => void c.act({ action: "vouch", id: v.id, approve: false })}
                  >
                    Hide recommendation
                  </button>
                )}
              </article>
            ))}
          </div>
          <h3>Your completed records</h3>
          <div className="evidence-actions">
            <button disabled={!s.records.length} onClick={exportRecords}>
              Export my records
            </button>
            <button disabled={c.busy || !s.records.length} onClick={() => setErase(true)}>
              Delete all timing records
            </button>
          </div>
          {erase && (
            <div role="alert">
              <p>
                Delete your timing history? This cannot be undone. Export first if you want to keep
                a copy.
              </p>
              <button
                disabled={c.busy}
                onClick={() =>
                  void c.act({ action: "erase" }).then((ok) => {
                    if (ok) setErase(false);
                  })
                }
              >
                Confirm deletion
              </button>
              <button onClick={() => setErase(false)}>Keep records</button>
            </div>
          )}
          {!s.records.some((r) => r.finished_at) && (
            <p>No completed tasks yet. Nothing is prefilled from the white paper.</p>
          )}
          <div className="evidence-records">
            {s.records
              .filter((r) => r.finished_at)
              .slice(0, 50)
              .map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>{TASKS.find((t) => t.id === r.task)?.label}</strong>
                    <small>
                      {new Date(r.finished_at!).toLocaleString()} · {minutes(r.active_seconds)}{" "}
                      active
                    </small>
                    <small>
                      {r.baseline_seconds === null
                        ? "No baseline"
                        : `${minutes(r.baseline_seconds)} ${r.baseline_kind === "estimate" ? "estimated baseline" : `reported baseline (${r.baseline_samples} observations)`}`}{" "}
                      · {minutes((Date.parse(r.finished_at!) - Date.parse(r.started_at)) / 1000)}{" "}
                      elapsed
                    </small>
                  </div>
                  <button
                    disabled={c.busy}
                    onClick={() => void c.act({ action: "delete", id: r.id })}
                  >
                    Delete record
                  </button>
                </article>
              ))}
          </div>
          {s.records.length > 50 && (
            <p>Showing the latest 50 completed records. Export includes the full history.</p>
          )}
        </>
      )}
    </section>
  );
}
