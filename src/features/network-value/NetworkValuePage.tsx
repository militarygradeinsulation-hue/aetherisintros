import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isShowcase } from "@/aetheris/showcase";
import { useNav } from "@/aetheris/nav";
import { networkValue } from "@/lib/networkValue.functions";
import {
  METRICS,
  STEPS,
  STEP_LABELS,
  verdict,
  feeBreakdown,
  usd,
  type Metric,
  type NetworkCommand,
  type NetworkSnapshot,
  type Settlement,
} from "./model";
import { prepareJobPost, type JobRoutingMode } from "./job-routing";
import "./network-value.css";

export type NetworkMode = "benchmarks" | "settlements" | "capacity";
const TITLES = {
  benchmarks: "Benchmark pools",
  settlements: "Referral settlement",
  capacity: "Capacity exchange",
};
type Action = (command: NetworkCommand) => Promise<boolean>;
const value = (form: HTMLFormElement, name: string) =>
  String(new FormData(form).get(name) ?? "").trim();
const number = (form: HTMLFormElement, name: string) => Number(value(form, name));
const download = (name: string, data: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function NetworkValuePage({ mode }: { mode: NetworkMode }) {
  const [member, setMember] = useState<string | null>(null),
    [checking, setChecking] = useState(true);
  useEffect(() => {
    if (isShowcase()) {
      setChecking(false);
      return;
    }
    let alive = true,
      revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      revision++;
      if (alive) {
        setMember(session?.user.id ?? null);
        setChecking(false);
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (alive && revision === 0) {
        setMember(error ? null : (data.session?.user.id ?? null));
        setChecking(false);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  if (checking)
    return (
      <section className="nv">
        <p role="status">Opening your network workspace…</p>
      </section>
    );
  if (!member)
    return (
      <section className="nv">
        <h1>{TITLES[mode]}</h1>
        <p>
          Sign in with your Ask Intros profile to use these systems. Concept examples are not member
          data.
        </p>
        <a href="/auth">Sign in</a>
      </section>
    );
  return <NetworkValueWorkspace key={member} member={member} mode={mode} />;
}

export function NetworkValueWorkspace({ member, mode }: { member: string; mode: NetworkMode }) {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const alive = useRef(true),
    pending = useRef(false),
    seq = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current = false;
      seq.current++;
    };
  }, []);
  const act: Action = async (command) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const request = ++seq.current;
    try {
      const next = await networkValue({ data: command });
      if (!alive.current || request !== seq.current) return false;
      if (next.user_id !== member) throw new Error("Your account changed. Reopen this workspace.");
      setSnapshot(next);
      if (command.action !== "load") setNotice("Saved to your account.");
      return true;
    } catch (e) {
      if (alive.current && request === seq.current)
        setError(e instanceof Error ? e.message : "Unable to complete the action.");
      return false;
    } finally {
      if (request === seq.current) {
        pending.current = false;
        if (alive.current) setBusy(false);
      }
    }
  };
  useEffect(() => {
    void act({ action: "load", radius: 60 });
  }, [member]); // keyed account boundary
  return (
    <section className="nv">
      <header>
        <small>ASK INTROS · NETWORK SYSTEMS</small>
        <h1>{TITLES[mode]}</h1>
        <p>
          {mode === "capacity"
            ? "Put available crews, equipment, and expertise to work nearby."
            : mode === "benchmarks"
              ? "Understand your business alongside a relevant group of peers."
              : "Agree the fee before the introduction. Keep each confirmation on record."}
        </p>
      </header>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={busy} onClick={() => void act({ action: "load", radius: 60 })}>
            Retry connection
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!snapshot && !error && <p role="status">Loading your records…</p>}
      {snapshot && (
        <>
          {!snapshot.verified && (
            <aside className="nv-note">
              <strong>Business verification required</strong>
              <p>
                Verify your business before sharing benchmarks, arranging paid referrals, or using
                the capacity exchange.
              </p>
              <a href="/app?workspace=profile">Open my profile</a>
            </aside>
          )}
          <fieldset disabled={busy}>
            <legend className="nv-sr">{TITLES[mode]} controls</legend>
            {mode === "capacity" && <Capacity data={snapshot} act={act} />}
            {mode === "benchmarks" && <Benchmarks data={snapshot} act={act} />}
            {mode === "settlements" && <Settlements data={snapshot} act={act} />}
          </fieldset>
          <p className="nv-footnote">
            Your most recent 100 posts, requests, and agreements are shown. Benchmarks are privately
            contributed, not independently audited.
          </p>
        </>
      )}
    </section>
  );
}

function Capacity({ data, act }: { data: NetworkSnapshot; act: Action }) {
  const nav = useNav();
  const [kind, setKind] = useState<"available" | "needed">("available"),
    [radius, setRadius] = useState(60),
    [clock, setClock] = useState(Date.now()),
    [postId, setPostId] = useState(() => crypto.randomUUID()),
    [postingMode, setPostingMode] = useState<JobRoutingMode>("standard"),
    [postError, setPostError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  async function location(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    await act({
      action: "location",
      city: value(f, "city"),
      latitude: number(f, "latitude"),
      longitude: number(f, "longitude"),
    });
  }
  async function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    setPostError("");
    try {
      const prepared = prepareJobPost({
        mode: postingMode,
        kind: value(f, "kind") as "available" | "needed",
        title: value(f, "title"),
        details: value(f, "details"),
        starts: value(f, "starts"),
        expires: value(f, "expires"),
        radius: number(f, "radius"),
        privacyReviewed: new FormData(f).has("privacyReviewed"),
      });
      if (await act({ action: "capacity_post", id: postId, ...prepared })) {
        f.reset();
        setKind(prepared.kind);
        setPostId(crypto.randomUUID());
      }
    } catch (error) {
      setPostError(error instanceof Error ? error.message : "Review your request and try again.");
    }
  }
  const posts = data.posts.filter(
    (p) =>
      p.kind === kind &&
      !p.closed_at &&
      Date.parse(p.expires_at) > clock &&
      (p.owner_id === data.user_id || p.distance_miles <= radius),
  );
  return (
    <>
      <details className="nv-card" open={!data.location}>
        <summary>Your approximate location</summary>
        <p>
          We round coordinates to about city scale and show approximate distances. Your coordinates
          are never displayed on other members’ posts.
        </p>
        <form onSubmit={(e) => void location(e)} className="nv-form">
          <label>
            City or service area
            <input name="city" required maxLength={100} defaultValue={data.location?.city} />
          </label>
          <label>
            Latitude
            <input
              name="latitude"
              type="number"
              min={-90}
              max={90}
              step="any"
              required
              defaultValue={data.location?.latitude}
            />
          </label>
          <label>
            Longitude
            <input
              name="longitude"
              type="number"
              min={-180}
              max={180}
              step="any"
              required
              defaultValue={data.location?.longitude}
            />
          </label>
          <button
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.form!;
              navigator.geolocation?.getCurrentPosition(
                (p) => {
                  (form.elements.namedItem("latitude") as HTMLInputElement).value = String(
                    p.coords.latitude,
                  );
                  (form.elements.namedItem("longitude") as HTMLInputElement).value = String(
                    p.coords.longitude,
                  );
                },
                () =>
                  window.alert(
                    "Location could not be read. Enter your approximate city coordinates.",
                  ),
              );
            }}
          >
            Use device location
          </button>
          <button>Save location</button>
        </form>
      </details>
      <div className="nv-toolbar">
        <div role="group" aria-label="Capacity type">
          {(["available", "needed"] as const).map((k) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "available" ? "Available" : "Needed"}
            </button>
          ))}
        </div>
        <label>
          Within
          <select
            aria-label="Distance radius"
            value={radius}
            onChange={async (e) => {
              const next = Number(e.target.value);
              if (await act({ action: "load", radius: next })) setRadius(next);
            }}
          >
            {[15, 30, 60, 100].map((n) => (
              <option key={n} value={n}>
                {n} miles
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="nv-grid">
        {posts.map((p) => (
          <article className="nv-card" key={p.id}>
            <small>VERIFIED BUSINESS · {p.company}</small>
            <h2>{p.title}</h2>
            <p>{p.details}</p>
            <p>
              {p.city} · approximately {p.distance_miles ?? 0} miles
            </p>
            <small>
              Starts {new Date(p.starts_at).toLocaleDateString()} · Expires in{" "}
              {Math.max(1, Math.ceil((Date.parse(p.expires_at) - clock) / 3600000))} hours
            </small>
            {p.owner_id === data.user_id ? (
              <button onClick={() => void act({ action: "capacity_close", id: p.id })}>
                Close my post
              </button>
            ) : data.letters.some((l) => l.post_id === p.id && l.requester_id === data.user_id) ? (
              <p>Request saved. Review it in Letters below.</p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  await act({ action: "capacity_request", post_id: p.id, note: value(f, "note") });
                }}
              >
                <label>
                  Note to the owner
                  <textarea name="note" required maxLength={1000} />
                </label>
                <button>{kind === "available" ? "Request this" : "I can help"}</button>
              </form>
            )}
          </article>
        ))}
      </div>
      {!posts.length && (
        <div className="nv-card">
          <h2>No current {kind} posts</h2>
          <p>
            {data.location
              ? "Posts appear when verified members share capacity within your radius."
              : "Save your service area to see nearby posts."}
          </p>
        </div>
      )}
      <details className="nv-card">
        <summary>Post capacity, route overflow, or request urgent help</summary>
        <p>
          All three options use the existing Capacity Exchange and private Letters. An urgent
          post expires after two hours; automated responder notifications are not connected.
          Sharing a customer’s identity or contact information requires that customer’s approval.
        </p>
        <div className="nv-routing-choices" role="group" aria-label="Job network workflow">
          {([
            ["standard", "Capacity / need"],
            ["overflow", "Overflow job"],
            ["urgent", "Urgent help · 2 hours"],
          ] as const).map(([option, label]) => (
            <button
              type="button"
              key={option}
              aria-pressed={postingMode === option}
              onClick={() => { setPostingMode(option); setPostError(""); }}
            >
              {label}
            </button>
          ))}
        </div>
        {postingMode === "overflow" && (
          <div className="nv-note">
            <strong>Overflow routing</strong>
            <p>
              Post a high-level job request when a customer’s work is too far away,
              outside your trade, or beyond your available capacity. Other verified
              members can request it and agree terms privately. This does not transfer
              the customer or trigger a referral payment automatically.
            </p>
          </div>
        )}
        {postingMode === "urgent" && (
          <div className="nv-note">
            <strong>Urgent capacity request</strong>
            <p>
              Publish a needed post for two hours. Nearby verified members can respond
              in Letters. Responder opt-in lists, timed push alerts and guaranteed
              replies are not activated.
            </p>
          </div>
        )}
        <form onSubmit={(e) => void post(e)} className="nv-form">
          {postingMode === "standard" ? (
            <label>
              Post type
              <select name="kind">
                <option value="available">Available</option>
                <option value="needed">Needed</option>
              </select>
            </label>
          ) : <input type="hidden" name="kind" value="needed" />}
          <label>
            {postingMode === "standard" ? "Title" : "Trade / job type (no customer name)"}
            <input name="title" maxLength={postingMode === "standard" ? 120 : 100} required />
          </label>
          <label className="nv-wide">
            {postingMode === "standard" ? "Specifics" : "Service area, scope, timing and qualifications only"}
            <textarea
              name="details"
              maxLength={2000}
              required
              placeholder={postingMode === "standard"
                ? "Crew size, equipment, qualifications, dates, and limits"
                : "General area, trade, project scope, time needed. Do not include names, phone numbers, emails or addresses."}
            />
          </label>
          {postingMode !== "urgent" && (
            <>
              <label>
                Available from
                <input type="datetime-local" name="starts" required />
              </label>
              <label>
                Expires at
                <input type="datetime-local" name="expires" required />
              </label>
            </>
          )}
          <label>
            Visible within
            <select name="radius" defaultValue="60">
              {[15, 30, 60, 100].map((n) => (
                <option key={n} value={n}>{n} miles</option>
              ))}
            </select>
          </label>
          {postingMode !== "standard" && (
            <label className="nv-check nv-wide">
              <input type="checkbox" name="privacyReviewed" required />
              <span>
                I reviewed this public summary and removed customer names, phone numbers,
                email addresses, exact job addresses and other identifying details.
                I will get the customer’s consent before sharing their contact details privately.
              </span>
            </label>
          )}
          {postError && <p className="nv-wide" role="alert">{postError}</p>}
          <p className="nv-wide">
            {postingMode === "urgent"
              ? "Your post automatically expires in two hours. No text messages or push alerts are sent."
              : "Posts expire within 30 days. Close yours sooner when it is no longer needed."}
          </p>
          <button disabled={!data.verified || !data.location}>
            {postingMode === "overflow" ? "Post overflow opportunity"
              : postingMode === "urgent" ? "Post two-hour request" : "Publish capacity post"}
          </button>
        </form>
      </details>
      <section aria-label="Capacity letters">
        <h2>Letters</h2>
        <p>
          Review requests and agree the work, dates, price, and responsibilities privately. Only the
          two participants can see each letter. Do not share customer contact details without permission.
        </p>
        {data.letters.map((l) => (
          <article className="nv-card" key={l.id}>
            <small>{l.state.toUpperCase()}</small>
            <h3>{l.title}</h3>
            <p>{l.note}</p>
            {l.terms && (
              <div className="nv-note">
                <strong>Proposed terms</strong>
                <p>{l.terms}</p>
              </div>
            )}
            {l.owner_id === data.user_id && ["pending", "offered"].includes(l.state) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await act({
                    action: "capacity_terms",
                    id: l.id,
                    terms: value(e.currentTarget, "terms"),
                  });
                }}
              >
                <label>
                  Terms for the requester
                  <textarea name="terms" required maxLength={3000} defaultValue={l.terms} />
                </label>
                <button>Confirm and offer terms</button>
              </form>
            )}
            {l.requester_id === data.user_id && l.state === "offered" && (
              <button
                onClick={() => void act({ action: "capacity_accept", id: l.id, terms: l.terms })}
              >
                Accept these terms
              </button>
            )}
            {["pending", "offered"].includes(l.state) && (
              <button onClick={() => void act({ action: "capacity_decline", id: l.id })}>
                Decline
              </button>
            )}
            <button
              onClick={() =>
                nav.messageMember(l.owner_id === data.user_id ? l.requester_id : l.owner_id)
              }
            >
              Open member conversation
            </button>
          </article>
        ))}
        {!data.letters.length && <p>No capacity requests yet.</p>}
      </section>
    </>
  );
}

function Benchmarks({ data, act }: { data: NetworkSnapshot; act: Action }) {
  const [metric, setMetric] = useState<Metric>("response_minutes");
  const result = data.benchmarks
    .filter((r) => r.metric === metric)
    .sort((a, b) => b.period.localeCompare(a.period))[0];
  const current = data.contributions.find((c) => c.metric === metric);
  function explain() {
    if (!result) return;
    window.dispatchEvent(
      new CustomEvent("aetheris:open-assistant", {
        detail: {
          question: `Help me understand this privately contributed benchmark. Metric: ${METRICS[metric].label}. Quarter starting ${result.period}. My number: ${result.value} ${METRICS[metric].unit}. Peer median: ${result.median}. ${verdict(result)}. At least ${result.companies_at_least} reviewed companies. Ask for my actual volumes and economics before estimating the value of closing the gap. Do not invent revenue or causal claims.`,
        },
      }),
    );
  }
  return (
    <>
      <article className="nv-card">
        <small>YOUR PEER GROUP</small>
        <h2>
          {data.cohort
            ? `${data.cohort.trade} · ${data.cohort.size_band} people · ${data.cohort.region}`
            : "Company cohort awaiting review"}
        </h2>
        <p>
          Comparisons require at least 10 independently reviewed companies. Each company contributes
          once per metric and quarter. Your business verification is used to assign a stable cohort.
        </p>
      </article>
      <div className="nv-toolbar" role="group" aria-label="Benchmark metric">
        {(Object.keys(METRICS) as Metric[]).map((m) => (
          <button key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>
            {METRICS[m].label}
          </button>
        ))}
      </div>
      <article className="nv-card">
        <small>
          {result ? `RELEASED QUARTER STARTING ${result.period}` : "COMPARISON NOT YET AVAILABLE"}
        </small>
        <h2>{METRICS[metric].label}</h2>
        {result ? (
          <>
            <div className="nv-metrics">
              <div>
                <small>Your number</small>
                <strong>
                  {result.value} {METRICS[metric].unit}
                </strong>
              </div>
              <div>
                <small>Peer median</small>
                <strong>
                  {result.median} {METRICS[metric].unit}
                </strong>
              </div>
              <div>
                <small>Peer group</small>
                <strong>{result.companies_at_least}+ companies</strong>
              </div>
            </div>
            <div
              className="nv-quartiles"
              aria-label={`Your comparison: ${verdict(result)}. Peer quartile boundaries ${result.p25} and ${result.p75}.`}
            >
              {["Bottom quartile", "Middle half", "Top quartile"].map((label) => (
                <span
                  key={label}
                  data-active={
                    verdict(result) === label ||
                    (label === "Middle half" && verdict(result) === "At the peer median")
                  }
                >
                  {label}
                  {verdict(result) === label ||
                  (label === "Middle half" && verdict(result) === "At the peer median") ? (
                    <b>You</b>
                  ) : null}
                </span>
              ))}
            </div>
            <p>
              <strong>{verdict(result)}</strong>. Peer quartile boundaries: {result.p25} and{" "}
              {result.p75} {METRICS[metric].unit}.{" "}
              {METRICS[metric].lowerIsBetter ? "Lower is better." : "Higher is better."}
            </p>
            <button onClick={explain}>Explain the gap with Ask Intros</button>
            <button
              onClick={() =>
                download("ask-intros-benchmark-evidence.json", {
                  ...result,
                  cohort: data.cohort,
                  source: "Privately contributed company data",
                  qualification: "Not audited; no causal or monetary claim",
                })
              }
            >
              Download evidence for my report
            </button>
          </>
        ) : (
          <p>
            Share this metric, then wait for a completed quarterly pool of at least 10 companies. No
            comparison or placeholder number is shown before the server releases it.
          </p>
        )}
      </article>
      <article className="nv-card">
        <h2>Give to get</h2>
        <p>
          You have shared {data.contributions.length} of 3 metrics for the current quarter, starting{" "}
          {data.period}. Comparisons are only shown for metrics you contributed in that same
          released quarter.
        </p>
        <form
          key={metric}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            await act({
              action: "benchmark_share",
              metric,
              value: number(f, "metricValue"),
              consent: true,
            });
          }}
        >
          <label>
            Your {METRICS[metric].label.toLowerCase()} ({METRICS[metric].unit})
            <input
              name="metricValue"
              type="number"
              min="0"
              max={METRICS[metric].max}
              step="0.01"
              required
              defaultValue={current?.value}
            />
          </label>
          <p className="nv-footnote">
            Use the current quarter to date. Response time is the median minutes to a first human
            response. Follow up is the percentage of sent quotes contacted within 48 hours. Close
            rate is won quotes divided by quotes decided in the period. Keep the same definition
            when updating.
          </p>
          <label className="nv-check">
            <input type="checkbox" required />I agree to include this value in the peer pool. My raw
            number stays private. Published aggregate releases are retained after withdrawal.
          </label>
          <button disabled={!data.verified || !data.cohort}>
            {current ? "Update shared metric" : "Share this metric"}
          </button>
        </form>
        {(current || result) && (
          <button onClick={() => void act({ action: "benchmark_withdraw", metric })}>
            Withdraw this metric and its comparison access
          </button>
        )}
      </article>
    </>
  );
}

function Settlements({ data, act }: { data: NetworkSnapshot; act: Action }) {
  const [id, setId] = useState(() => crypto.randomUUID());
  return (
    <>
      <aside className="nv-note">
        <strong>Terms and milestone tracking</strong>
        <p>
          All three parties electronically acknowledge the same terms before the connector releases
          the referral. Stripe Connect collection and bank payouts are not activated. No button here
          moves money.
        </p>
      </aside>
      <details className="nv-card">
        <summary>Prepare a referral agreement</summary>
        <form
          className="nv-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            if (
              await act({
                action: "settlement_create",
                id,
                title: value(f, "title"),
                seller_id: value(f, "seller"),
                buyer_id: value(f, "buyer"),
                rate_bps: Math.round(number(f, "rate") * 100),
                cap_cents: Math.round(number(f, "cap") * 100),
                window_months: number(f, "months"),
              })
            ) {
              f.reset();
              setId(crypto.randomUUID());
            }
          }}
        >
          <label className="nv-wide">
            Agreement title
            <input name="title" required maxLength={120} />
          </label>
          {["seller", "buyer"].map((role) => (
            <label key={role}>
              {role === "seller" ? "Seller who pays the fee" : "Buyer being introduced"}
              <select name={role} required defaultValue="">
                <option value="" disabled>
                  Choose a verified member
                </option>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.company}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            First invoice fee (%)
            <input
              name="rate"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              defaultValue="5"
              required
            />
          </label>
          <label>
            Fee cap (USD)
            <input
              name="cap"
              type="number"
              min="1"
              max="1000000"
              step="0.01"
              defaultValue="2500"
              required
            />
          </label>
          <label>
            Closing window in months
            <input name="months" type="number" min="1" max="24" defaultValue="12" required />
          </label>
          <p>
            Pilot fee model: 10% of the connector fee. This illustrative platform rate is not
            activated pricing. These proposed terms require everyone’s review and separate payment
            authorization before any money can move.
          </p>
          <button disabled={!data.verified}>Create terms for review</button>
        </form>
      </details>
      {!data.settlements.length && (
        <article className="nv-card">
          <h2>No referral agreements yet</h2>
          <p>
            Prepare the terms first. All parties review them before an introduction is released.
          </p>
        </article>
      )}
      {data.settlements.map((s) => (
        <Agreement
          key={s.id}
          item={s}
          user={data.user_id}
          act={act}
          referralsReady={data.referrals_ready}
        />
      ))}
    </>
  );
}

function Agreement({
  item: s,
  user,
  act,
  referralsReady,
}: {
  item: Settlement;
  user: string;
  act: Action;
  referralsReady: boolean;
}) {
  const signed = s.signatures.some((sig) => sig.user_id === user),
    next = STEPS.find((step) => !s.events.some((e) => e.step === step));
  const nextIndex = next ? STEPS.indexOf(next) : -1;
  const canConfirm = nextIndex >= 0 && user === (nextIndex < 2 ? s.buyer_id : s.seller_id);
  const paid = s.events.find((e) => e.step === "invoice_paid");
  const fees = paid?.invoice_cents
    ? feeBreakdown(paid.invoice_cents, s.rate_bps, s.cap_cents, s.platform_bps)
    : null;
  return (
    <article className="nv-card">
      <small>
        {s.cancelled_at ? "CANCELLED" : s.released_at ? "REFERRAL RELEASED" : "TERMS UNDER REVIEW"}
      </small>
      <h2>{s.title}</h2>
      <p>
        Connector: {String(s.terms["connector_name"] ?? "Member")} · Seller:{" "}
        {String(s.terms["seller_name"] ?? "Member")} · Buyer:{" "}
        {String(s.terms["buyer_name"] ?? "Member")}
      </p>
      <p>
        <strong>
          {s.rate_bps / 100}% of the first paid invoice, capped at {usd(s.cap_cents)}
        </strong>
        . Paid by the seller for deals closed within {s.window_months} months of release. Ask Intros
        receives {s.platform_bps / 100}% of the connector fee.
      </p>
      <details>
        <summary>Read the full preserved terms</summary>
        <dl>
          {Object.entries(s.terms).map(([key, v]) => (
            <div key={key}>
              <dt>{key.replaceAll("_", " ")}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="nv-hash">Terms fingerprint: {s.terms_hash}</p>
      </details>
      <p>{s.signatures.length} of 3 signatures received.</p>
      <ul>
        {s.signatures.map((sig) => (
          <li key={sig.user_id}>
            {sig.typed_name} · {new Date(sig.signed_at).toLocaleString()}
          </li>
        ))}
      </ul>
      {!s.cancelled_at && !s.released_at && !signed && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await act({
              action: "settlement_sign",
              id: s.id,
              typed_name: value(e.currentTarget, "name"),
              terms_hash: s.terms_hash,
              consent: true,
            });
          }}
        >
          <label>
            Your full name
            <input name="name" required maxLength={150} />
          </label>
          <label className="nv-check">
            <input type="checkbox" required />I have read and electronically acknowledge these exact
            referral terms. I understand payments are not activated.
          </label>
          <button>Sign these terms</button>
        </form>
      )}
      {!s.cancelled_at && !s.released_at && s.connector_id === user && (
        <button
          disabled={s.signatures.length !== 3 || !referralsReady}
          onClick={() => void act({ action: "settlement_release", id: s.id })}
        >
          Release signed introduction
        </button>
      )}
      {!s.cancelled_at && !s.released_at && (
        <button onClick={() => void act({ action: "settlement_cancel", id: s.id })}>
          Cancel before release
        </button>
      )}
      {!referralsReady && !s.released_at && (
        <p>Referral release is awaiting database recovery. Your signed terms are preserved.</p>
      )}
      <ol className="nv-steps">
        {STEPS.map((step, i) => {
          const event = s.events.find((e) => e.step === step);
          return (
            <li key={step} data-complete={!!event}>
              <strong>{STEP_LABELS[i]}</strong>
              <small>
                {event
                  ? `Confirmed ${new Date(event.created_at).toLocaleDateString()}`
                  : `Waiting for ${i < 2 ? "buyer" : "seller"} confirmation`}
              </small>
              {event && <p>{event.evidence}</p>}
            </li>
          );
        })}
      </ol>
      {s.released_at && !s.cancelled_at && next && canConfirm && (
        <form
          key={next}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            await act({
              action: "settlement_confirm",
              id: s.id,
              step: next,
              evidence: value(f, "evidence"),
              ...(next === "invoice_paid"
                ? { invoice_cents: Math.round(number(f, "invoice") * 100) }
                : {}),
            });
          }}
        >
          <label>
            Evidence for {STEP_LABELS[nextIndex]?.toLowerCase()}
            <textarea
              name="evidence"
              maxLength={1500}
              required
              placeholder="Record what happened and a reference you can substantiate."
            />
          </label>
          {next === "invoice_paid" && (
            <label>
              First paid invoice amount (USD)
              <input name="invoice" type="number" min="0.01" max="10000000" step="0.01" required />
            </label>
          )}
          <label className="nv-check">
            <input type="checkbox" required />I personally confirm this milestone happened.
          </label>
          <button>Confirm {STEP_LABELS[nextIndex]?.toLowerCase()}</button>
        </form>
      )}
      {fees && (
        <div className="nv-note">
          <h3>Projected settlement</h3>
          <div className="nv-metrics">
            <div>
              <small>Connector fee</small>
              <strong>{usd(fees.fee)}</strong>
            </div>
            <div>
              <small>Ask Intros share</small>
              <strong>{usd(fees.platform)}</strong>
            </div>
            <div>
              <small>Connector amount</small>
              <strong>{usd(fees.connector)}</strong>
            </div>
          </div>
          <p>
            Based on the seller’s confirmation. This is not a verified Stripe payment or a bank
            payout. Processing costs are not included.
          </p>
        </div>
      )}
      <button onClick={() => download("ask-intros-referral-record.json", s)}>
        Download terms and confirmation record
      </button>
    </article>
  );
}
