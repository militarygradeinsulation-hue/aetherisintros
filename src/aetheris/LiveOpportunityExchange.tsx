import "./exchange.css";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  actOnExchange,
  exchangeKinds,
  exchangeReadableKinds,
  listExchange,
  publishExchange,
  type ExchangeDraft,
} from "./exchange-client";
import {
  matchesOpportunityFocus,
  opportunityDaysLeft,
  opportunityFocuses,
  type OpportunityFocus,
} from "./opportunity-focus";
import { Btn, Eyebrow, Head } from "./ui";
import { useNetwork } from "./store";

const newDraft = (): ExchangeDraft => ({
  title: "",
  objective: "",
  kind: "Partnership",
  whatIsNeeded: "",
  whatIsOffered: "",
  mutualValue: "",
  visibility: "network",
  expiresOn: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
});

/** Shared live data never comes from the illustrative Pro workspace. */
export function LiveOpportunityExchange() {
  const net = useNetwork();
  const cache = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [focus, setFocus] = useState<OpportunityFocus>("Active");
  const [kind, setKind] = useState("All");
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState(newDraft);
  const [responding, setResponding] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    let changed = false;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && !changed) setUserId(data.session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setPosting(false);
    setDraft(newDraft());
    setResponding(null);
    setNote("");
    setNotice("");
  }, [userId]);
  const query = useQuery({
    queryKey: ["shared-opportunity-exchange", userId],
    queryFn: listExchange,
    enabled: !!userId,
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: async (
      action:
        | { id: string; kind: "save" | "unsave" | "interest" | "close"; note?: string }
        | { kind: "publish"; draft: ExchangeDraft },
    ) => {
      if (action.kind === "publish") await publishExchange(action.draft);
      else await actOnExchange(action.id, action.kind, action.note);
    },
    onSuccess: async (_data, action) => {
      if (action.kind === "publish") {
        setPosting(false);
        setDraft(newDraft());
      }
      if (action.kind === "interest") {
        setResponding(null);
        setNote("");
      }
      setNotice(
        action.kind === "interest"
          ? "Interest saved. Only you and the opportunity owner can read your response."
          : action.kind === "publish"
            ? "Opportunity published."
            : "Change saved.",
      );
      await cache.invalidateQueries({ queryKey: ["shared-opportunity-exchange", userId] });
    },
  });
  const rows = query.data ?? [];
  const visible = rows.filter(
    (o) => matchesOpportunityFocus(o, focus) && (kind === "All" || kind === o.kind),
  );
  const busy = mutation.isPending;
  const updateDraft = (key: keyof ExchangeDraft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <section className="exchange-live">
      <Head
        label="OPPORTUNITY EXCHANGE"
        title="Make the right opportunity actionable."
        copy="Publish a clear need, explain the mutual value, and keep responses between the people involved. Closing dates use UTC."
        proof="Member-created opportunities · up to 100 most recent visible posts"
        action={
          <Btn disabled={!userId || busy} onClick={() => setPosting((p) => !p)}>
            {posting ? "Cancel post" : "Post an opportunity"}
          </Btn>
        }
      />
      <div className="filter-chips" role="group" aria-label="Opportunity focus">
        {opportunityFocuses.map((f) => (
          <button
            key={f}
            className={`chip ${focus === f ? "on" : ""}`}
            aria-pressed={focus === f}
            onClick={() => setFocus(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="filter-chips" role="group" aria-label="Opportunity category">
        {["All", ...exchangeReadableKinds].map((k) => (
          <button
            key={k}
            className={`chip ${kind === k ? "on" : ""}`}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <Btn
        kind="quiet"
        disabled={!userId || query.isFetching || busy}
        onClick={() => {
          void query.refetch();
        }}
      >
        Refresh opportunities
      </Btn>
      {notice && <p role="status">{notice}</p>}
      {(query.isError || mutation.isError) && (
        <p role="alert">
          {mutation.isError
            ? mutation.error.message
            : "Could not load the Opportunity Exchange. Refresh to retry. No sample opportunities are shown."}
        </p>
      )}
      {!userId && (
        <p className="empty-state">
          Sign in with your member account to load shared opportunities.
        </p>
      )}
      {userId && query.isPending && <p role="status">Loading member opportunities…</p>}
      {posting && (
        <form
          className="module exchange-form"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("");
            mutation.mutate({ kind: "publish", draft });
          }}
        >
          <h2>Post an opportunity</h2>
          <p>
            Network posts are visible to eligible members. Keep sensitive identities and private
            contact details out of your post.
          </p>
          {(["title", "objective", "whatIsNeeded", "whatIsOffered", "mutualValue"] as const).map(
            (key) => (
              <label key={key}>
                {
                  {
                    title: "Title",
                    objective: "Objective",
                    whatIsNeeded: "What is needed",
                    whatIsOffered: "What you offer",
                    mutualValue: "Why both sides benefit",
                  }[key]
                }
                <textarea
                  aria-label={
                    {
                      title: "Title",
                      objective: "Objective",
                      whatIsNeeded: "What is needed",
                      whatIsOffered: "What you offer",
                      mutualValue: "Why both sides benefit",
                    }[key]
                  }
                  required
                  minLength={3}
                  maxLength={key === "title" ? 140 : 2000}
                  rows={key === "title" ? 1 : 3}
                  value={draft[key]}
                  onChange={(e) => updateDraft(key, e.target.value)}
                />
              </label>
            ),
          )}
          <label>
            Type
            <select value={draft.kind} onChange={(e) => updateDraft("kind", e.target.value)}>
              {exchangeKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Visibility
            <select
              value={draft.visibility}
              onChange={(e) => updateDraft("visibility", e.target.value)}
            >
              <option value="network">Network members</option>
              <option value="private">Only me</option>
            </select>
          </label>
          <label>
            Closing date (UTC, within 90 days)
            <input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              max={new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)}
              value={draft.expiresOn}
              onChange={(e) => updateDraft("expiresOn", e.target.value)}
            />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            Publish opportunity
          </button>
        </form>
      )}
      <section className="opp-list">
        {visible.map((o) => {
          const own = o.ownerId === userId;
          const active = matchesOpportunityFocus(o, "Active");
          const days = opportunityDaysLeft(o);
          const sent = o.interest.some((i) => i.memberId === userId);
          return (
            <article className="module opp-card" key={o.id}>
              <Eyebrow>
                {o.kind} · {own ? "YOUR POST" : "MEMBER POST"} ·{" "}
                {o.visibility === "private" ? "PRIVATE" : "NETWORK"}
              </Eyebrow>
              <h2>{o.title}</h2>
              <p className="opp-objective">{o.objective}</p>
              <dl className="opp-grid">
                <div>
                  <dt>What is needed</dt>
                  <dd>{o.whatIsNeeded}</dd>
                </div>
                <div>
                  <dt>What is offered</dt>
                  <dd>{o.whatIsOffered}</dd>
                </div>
                <div>
                  <dt>Mutual value</dt>
                  <dd>{o.mutualValue}</dd>
                </div>
                <div>
                  <dt>Closes (UTC)</dt>
                  <dd>{o.expiresOn}</dd>
                </div>
              </dl>
              <p className="opp-evidence">
                Poster-supplied claims are not independently verified. Ask permission before sharing
                private contact details.
              </p>
              <p>
                <b>Next step.</b>{" "}
                {!active
                  ? "This opportunity is no longer accepting responses."
                  : own
                    ? `Review ${o.interest.length} private response${o.interest.length === 1 ? "" : "s"}.`
                    : sent
                      ? "Your response is recorded. The owner can review your fit."
                      : days !== null && days <= 7
                        ? `Closes ${days === 0 ? "today" : `in ${days} days`}. Explain your fit before the deadline.`
                        : "Explain the specific value you can offer before requesting a conversation."}
              </p>
              <footer className="opp-foot">
                <Btn
                  kind="secondary"
                  disabled={busy}
                  onClick={() => mutation.mutate({ id: o.id, kind: o.saved ? "unsave" : "save" })}
                >
                  {o.saved ? "Unsave" : "Save"}
                </Btn>
                {own && active && (
                  <Btn
                    kind="secondary"
                    disabled={busy}
                    onClick={() => mutation.mutate({ id: o.id, kind: "close" })}
                  >
                    Close opportunity
                  </Btn>
                )}
                {!own && active && !sent && (
                  <Btn
                    disabled={busy}
                    onClick={() => {
                      setResponding(responding === o.id ? null : o.id);
                      setNote("");
                    }}
                  >
                    {responding === o.id ? "Cancel response" : "Express interest"}
                  </Btn>
                )}
              </footer>
              {responding === o.id && active && !sent && (
                <form
                  className="exchange-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice("");
                    mutation.mutate({ id: o.id, kind: "interest", note: note.trim() });
                  }}
                >
                  <label>
                    Why is this a fit? Only you and the owner can read this.
                    <textarea
                      aria-label="Why is this a fit?"
                      required
                      minLength={12}
                      maxLength={2000}
                      rows={4}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <Btn
                    kind="secondary"
                    disabled={busy}
                    onClick={() =>
                      setNote(
                        `I can contribute ${net.profile.expertise?.join(", ") || "[describe your relevant experience]"}. For your objective, “${o.objective}”, my proposed first step is [add a concrete step and evidence of your fit].`,
                      )
                    }
                  >
                    Draft from my profile
                  </Btn>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={
                      busy ||
                      note.trim().length < 12 ||
                      note.includes("[add a concrete") ||
                      note.includes("[describe your")
                    }
                  >
                    Send private interest
                  </button>
                </form>
              )}
              {own && o.interest.length > 0 && (
                <section aria-label="Private responses">
                  <h3>Private responses</h3>
                  {o.interest.map((i) => (
                    <div key={i.memberId}>
                      <p>
                        <b>
                          {net.members.find((m) => m.id === i.memberId)?.name ?? "Network member"}
                        </b>{" "}
                        · {new Date(i.when).toLocaleDateString()}
                      </p>
                      <p>{i.note}</p>
                    </div>
                  ))}
                </section>
              )}
            </article>
          );
        })}
      </section>
      {userId && query.isSuccess && !visible.length && (
        <p className="empty-state">
          No opportunities match this view. Try Active or another category, or publish a specific
          need.
        </p>
      )}
    </section>
  );
}
