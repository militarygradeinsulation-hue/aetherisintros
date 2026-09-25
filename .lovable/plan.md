# Ask Intros Capability Layer — revised architecture (v2)

Core idea: members never open "apps". They ask for an outcome, such as Diagnose, Prepare, Challenge, Find, Fix, Draft, Create or Build. Every request becomes one **capability run**. Each run opens the same **Capability Workspace**, reads only the context it was given, and writes back to the one Intros graph only through findings, proposals and artifacts.

Legacy app names never appear in the UI, in prompts, or in ids.

## Settled decisions (from your review)

1. **Maker capabilities are in, through the same framework.** They come in Phase 3/4 as narrow verbs, open in one Intros-native canvas, and never ship as a separate IDE or studio.
2. **Live web research only on explicit Diagnose, Research or Competitive runs.** Before the run starts, the member sees the target domain, the fact that the web is used, and a cost estimate. Private graph content is never used as a query.
3. **Findings and proposals get their own first-class tables.** Proposals go to the approval queue when approval is needed.
4. **Autonomy starts at Level 1.** Read, analyze and draft always run. Consequential writes ask first. External actions always ask.
5. **Migrations are covered in section H.**
6. **Delegates** can only read, analyze or draft, and only with explicit permission. Every write or external proposal needs the principal's approval. A delegate never inherits the principal's "allow" rules.

## A. Capability Workspace — one operating surface

Everything opens one component, `CapabilityWorkspace`, driven by a `run_id`. That includes Ask Intros, entity menus and suggestion chips.

```text
+-----------------------------------------------------------+
| Diagnose  ·  Acme Holdings                 [Running 62%]  |  header: verb + subject + outcome
|-----------------------------------------------------------|
| Context used  (chips, removable before start)             |  granted scopes, entities, web domain
| Progress      step 3/5 "Reading public hiring signals"    |
| Result        editorial summary                           |
| Findings      claim · evidence · confidence · source      |  FACT layer
| Recommended   ranked next actions                         |  RECOMMENDATION layer
| Drafts/Assets artifact previews + versions                |
| Approvals     proposals needing a decision                |
| Linked to     Acme · Q4 renewal opp · Board decision      |
| History       earlier runs on this entity                 |
+-----------------------------------------------------------+
```

- **Desktop:** a right-side sheet, about 560px wide and expandable to full width for Maker canvases. The page underneath stays visible, so the member keeps their place. It is dark Intelligence panel style, with amber used only for live progress.
- **Mobile:** a full-height bottom sheet with a sticky header. Sections become a segmented control (Result / Evidence / Drafts / Approvals). The primary action is pinned to the bottom.
- **Ask Intros:** the dock shows a compact run card that says "Open workspace". A conversation can own several runs.
- **Deep link:** `?run=<id>` on the current page reopens the workspace. No new route and no new nav item.
- **Entity pages** get a "Runs & findings" module fed by the same data (history, open findings, artifacts).

## B. Discovery without a catalog

There are four entry points, all reading from the registry:

1. Natural language in Ask Intros.
2. One **"Do more"** menu per entity header. It shows the top 3 verbs plus a "More for this…" option that lists every valid verb for that entity type.
3. **Suggestion chips.** At most 2 appear inline next to a risk, commitment or finding.
4. **"What can you do here?"** in Ask Intros. It answers in plain sentences with the ranked verbs for the current context.

**Ranking:** each capability `c` that is valid for the subject gets a score, and the top 3–4 are shown (at most 4).

```text
score(c) = 3.0*entityFit + 2.5*missionFit + 2.0*riskSignal + 1.5*openCommitment
         + 1.0*roleFit + 1.0*recency - 1.5*recentlyRun - 2.0*dismissed - costPenalty
```

- `entityFit`: 1 if `c.appliesTo` includes the subject type and `c.when()` passes (for example an AEC tag). If this is 0, the capability is excluded.
- `missionFit`: overlap between the active mission's target or outcome and the subject or the capability's tags.
- `riskSignal`: open risk, blind-spot or customer-risk items, or unresolved findings on the subject (normalised 0–1).
- `openCommitment`: overdue or near-due commitments or tasks tied to the subject.
- `roleFit`: the member's verified role (CEO, founder, managing partner…) matched against `c.roles`.
- `recency`: activity on the subject in the last 14 days.
- `recentlyRun`: the same capability ran on the same subject in the last 7 days.
- `dismissed`: the member hid this chip for this subject.
- `costPenalty`: web or media runs rank lower unless there is a direct signal for them.

This is deterministic and needs no AI. The same function feeds all four entry points, so they never disagree.

## C. Maker mode — artifacts and revisions

Maker verbs:
- Create brief / deck / document
- Draft post / Signal
- Create image
- Create short video
- Build calculator / form
- Build client portal / dashboard

Each one produces an **artifact** from a typed template. It opens in the workspace canvas with preview, edit and revise, then save. Publishing or sharing is always an `external` proposal.

```text
capability_artifacts
  id, owner_id, run_id, kind (brief|deck|doc|post|signal|script|image|video|audio|form|portal|dashboard),
  template_id, title, subject_type, subject_id, current_revision_id,
  status (draft|approved|published|archived), visibility (private|shared_link|network),
  created_at, updated_at
capability_artifact_revisions
  id, artifact_id, owner_id, revision_no, author ('member'|'capability'|'delegate'),
  content jsonb        -- structured doc/deck/form/portal spec (no raw code)
  storage_path text    -- binary media in private bucket
  source_run_id, change_note, created_at      -- immutable rows
```

Rules:
- Revisions are append-only. "Restore" creates a new revision.
- Build outputs are **declarative specs**: form fields, a calculator formula over the existing Grid formula engine, and a portal layout made of approved Intros blocks. Intros renders them. No arbitrary generated code runs in Phase 3. A code-generation service boundary is a Phase 4 option, and only in a sandbox.
- Binaries go in the private bucket `capability-assets/{owner_id}/{artifact_id}/{revision}`. Access is by signed URL.
- Sharing uses a revocable token that follows the Passport pattern and is created only after approval. Viewers see only the approved revision.

## D. Digital You — personalization layer

Every result has three layers that are stored and shown separately:

| Layer | Source | May Digital You change it? |
|---|---|---|
| FACT / EVIDENCE | records, events, web citations | Never. Only facts that have evidence refs. |
| RECOMMENDATION | deterministic rules + optional model reasoning over facts | No. It can only re-rank, and the original rank is kept. |
| STYLE / PRIORITY | Digital You profile (tone, directness, risk appetite, priorities) | Yes. It shapes drafts, ordering and phrasing. |

- The UI labels any re-ranking: "Reordered for your priorities — original ranking."
- "What would I do?" is an explicitly labelled simulation. Its output is RECOMMENDATION + STYLE, and it must cite the facts it relied on.
- Digital You never suppresses a finding. It can only collapse a finding when the member has set a rule to do that, and a hidden-by-preference counter stays visible.
- Autonomy rules (`digital_you_rules`) are the governance part of Digital You. They are evaluated by the router, not by the model.

## E. Diagnose — one capability, layered

`diagnose` applies to company, opportunity and the member's own company. Its layers:

1. **Internal evidence (reused as-is):** Company Pulse, Customer Risk, Relationship Health, Promise Risk, Forecast Confidence, Coverage/Influence, Key-Person Dependency, Blind Spot Radar, Deal/Company Memory. These are wrapped as read-only providers inside the context builder.
2. **External evidence (new):** the `webSearch.server` / `readPage` already in the project, with queries built only from the public company name and domain. It covers hiring, tech, content and competitor signals. It only runs if the member opted into web research for this run.
3. **Findings:** claim, evidence refs (internal record ids or URLs), confidence, unknowns, severity.
4. **Revenue-leak hypotheses:** only produced when at least 2 independent evidence refs support them. Otherwise they are listed as an "Unknown worth checking".
5. **Gaps / patterns / competitive signals:** reuse the Pattern Recognition and Collisions engines.
6. **Recommended fixes:** proposals such as a task, an opportunity update, a mark, a mission or a Signal draft.
7. **Confidence + unknowns summary.**

Write-back works only through findings and proposals. The existing Risk and Blind Spot engines read open `capability_findings` as a new input source, so the output is not a competing risk list.

What comes from the source systems (reimplemented as logic, no code copied wholesale):
- the evidence-grading rubric and finding schema from the Golden Report
- the leak taxonomy and the signal categories (tech / hiring / content / competitive) from Nexus
- the conditional-surface idea, which is our `when()`.

## F. Create/Draft foundation — typed templates

There is one `draft`/`create` engine with typed templates:

| Template | Output kind | Where it lands |
|---|---|---|
| follow_up | message draft | Messages composer (approval to send) |
| intro_note | intro capsule draft | Intros double opt-in flow |
| sales_script | doc | Opportunity > Artifacts |
| social_post | post | Journal/Home composer (approval to publish) |
| signal | ask | Signals composer (approval to post) |
| exec_update | doc | Home widget + share proposal |
| board_deck | deck | Decision > Artifacts |
| meeting_brief | doc | Meeting/Calendar event |
| content_calendar | calendar entries | existing `calendar_events` as proposals |
| opportunity_video | video | Opportunity > Artifacts |

Each template declares its input slots, required facts, the Digital You style hooks it uses, its output schema, and its destination. There are no mini-tools.

## G. Lifecycle

```text
REQUESTED -> CONTEXT_BUILT -> RUNNING -> (NEEDS_INPUT) -> RESULT_READY
  -> PROPOSALS_READY -> (NEEDS_APPROVAL) -> APPLIED -> CLOSED
side exits: CANCELLED, FAILED(retryable|terminal), PARTIAL, UNAVAILABLE
```

What the member sees in the workspace at each step:
- **REQUESTED:** the header plus a "Preparing context" shimmer.
- **CONTEXT_BUILT:** the context chips, and for web runs the domain and cost estimate with Start / Adjust. Instant runs skip the confirmation.
- **RUNNING:** step label, percent, and a Cancel button.
- **NEEDS_INPUT:** an inline question (for example "Which of these two Acmes?"). The run pauses. It never guesses.
- **RESULT_READY:** result, findings and recommendations.
- **PROPOSALS_READY:** a list of proposals with Apply / Send to approval / Dismiss.
- **NEEDS_APPROVAL:** "Waiting for your approval" (or the principal's, for a delegate), with a link to the Approval Queue.
- **APPLIED:** each applied change is linked to its record.
- **CLOSED:** read-only, and kept in the history.
- **PARTIAL:** results so far, plus a list of what failed and why.
- **UNAVAILABLE:** a plain reason (credits, provider, region) plus the deterministic result where one exists.
- **FAILED (retryable):** a Retry button. Only 429/5xx are retried automatically, with bounded backoff.
- **FAILED (terminal):** the reason, and no retry.
- **CANCELLED:** "Stopped by you". Partial output is kept.

Transitions happen only on the server, through a security-definer function. The client can never set a status.

## H. Refactor before new capabilities

**What the live database shows today:**
- The database has two applied histories: 19 files in `supabase/migrations` (up to 16 Sep) and 11 Drizzle entries (0000–0010, from 22 Sep onward).
- The current tooling (`drizzle.config.ts`, the migration tool) writes only to Drizzle.
- **Recommendation:** freeze `supabase/migrations` as a historical baseline and never edit or delete it. Treat Drizzle as the only forward path, and write a one-line README that records the split.
- Don't try to squash the two. Squashing would rewrite applied history and break both journals.

Other findings:
- **Ask Intros has no sign-in check at all.** `askIntros` calls paid AI and web search without auth.
- **Approval Queue can be approved by the client.** The owner policy is `FOR ALL`, so a client can set `status = 'executed'` itself, with no run link and a narrow `action_type` list. That means an approval is only a UI convention today, not something the server enforces.
- **`entity_events` provenance can be forged**, because clients can insert any `source`.
- **`entity_links` has no type allow-list** and doesn't check that both ends belong to the owner.

Smallest safe sequence (each step is a separate migration or PR, with no behavior change for members):
1. Gate `askIntros` with auth. Show a friendly signed-out message in the dock.
2. Harden the approval queue:
   - Clients may only INSERT `pending` rows and UPDATE `status` to `approved` or `rejected`.
   - `executed` is set only by the server RPC `execute_approval`.
   - Add `run_id` and `proposal_id` columns (nullable).
   - Widen `action_type` to include `capability_proposal`.
3. Make `entity_events` trustworthy: client inserts are forced to `source = 'app'`, and add `append_capability_event()` (security definer).
4. Add a type CHECK allow-list to `entity_links`, plus a `link_entities()` RPC that checks both ends belong to the owner.
5. Extract the router: move `recognizeCommand` into `capabilities/match.ts`, keeping the same exports as thin wrappers so the existing 16+ phrases keep working, and add phrase tests.
6. Don't grow `App.tsx`. New UI goes under `src/aetheris/capabilities/`. Only one mount line is added to App (the workspace host).

## Schema (new, owner-scoped, minimum grants, immutable identity columns)

```text
capability_runs        id, owner_id, actor_id, actor_kind(member|delegate), capability_id, verb,
                       subject_type, subject_id, status, progress, step_label, input jsonb, input_hash,
                       granted_scopes text[], web_domains text[], cost_estimate int, engine,
                       error_code, error_message, created_at, started_at, finished_at
capability_findings    id, owner_id, run_id, subject_type, subject_id, kind(risk|gap|leak|pattern|competitive|unknown),
                       claim, severity, confidence, evidence jsonb[], status(open|resolved|dismissed),
                       resolved_note, created_at, resolved_at
capability_proposals   id, owner_id, run_id, finding_id?, impact(read|draft|write|external), action jsonb,
                       target_type, target_id, status(proposed|queued|applied|rejected|dismissed),
                       approval_id?, created_by_actor, created_at, decided_at
capability_artifacts / capability_artifact_revisions  (section C)
bucket capability-assets (private)
```

- Clients can only SELECT these tables and UPDATE a finding's `status`.
- All run, proposal and artifact writes go through `capabilities.functions.ts`, which verifies the caller and then calls security-definer RPCs.
- The admin client is never used for reads.

Types and directories:

```text
src/aetheris/capabilities/  types.ts registry.ts rank.ts match.ts templates/ defs/
                            Workspace.tsx WorkspaceHost.tsx DoMoreMenu.tsx Chips.tsx RunCard.tsx
src/lib/capabilities.functions.ts   start, getRun, answerInput, cancel, retry, decideProposal, reviseArtifact
src/lib/capabilities/context.server.ts  scoped envelope builder (RLS client, budgets)
src/lib/capabilities/writeback.server.ts
src/lib/capabilities/providers/*.server.ts  wrappers over existing engines
```

The Context/Result envelopes stay as in v1, with the `layer: 'fact'|'recommendation'|'style'` tag added to each output item.

## Isolation rules (unchanged, now enforced)

- A capability declares its scopes. The builder fetches only the subject, the rows linked to it, and the declared scopes, up to a record budget.
- Web queries come from an allow-listed field set: company name and domain.
- The model receives only the serialized envelope.
- A delegate's runs are evaluated with `actor_kind = delegate`. They never match "allow" rules.

## I. Roadmap with acceptance criteria

**Phase 0 — Hardening**
- A signed-out call to `askIntros` returns 401 and the dock shows a friendly message.
- A client cannot set an approval to `executed`, cannot forge event sources, and cannot link entities it doesn't own. There are SQL tests for all three.
- All existing command phrases route the same way through the new matcher, covered by a phrase test suite.
- The build is clean and there are no behavior changes.

**Phase 1 — Framework + first five**
- Tables, RPCs, router, Workspace (desktop + mobile), Do more menu, chips, "What can you do here?".
- The first five capabilities: Diagnose (internal only), Prepare Meeting, Challenge, Find Who Can Help, Draft (follow_up, intro_note, exec_update).
- Acceptance:
  - Every run shows its context used.
  - AI-off mode still returns deterministic results or UNAVAILABLE.
  - A cross-account test shows zero leakage.
  - A delegate cannot apply a write.
  - At most 4 verbs appear per entity.

**Phase 2 — Research + growth**
- Diagnose external layer with web consent and cost display, Competitive Intelligence, revenue-leak hypotheses, and findings feeding the Risk/Blind Spot engines.
- Referral attribution/reciprocity on CRM records, content_calendar, social_post, signal, sales_script.
- Acceptance:
  - No private field ever appears in a logged web query (an audit test checks this).
  - A leak hypothesis without 2 evidence refs is never shown as a finding.

**Phase 3 — Maker (artifacts)**
- Artifacts + revisions, brief/deck/doc, image, board_deck, declarative form/calculator, approval-gated sharing links.
- Acceptance:
  - Every artifact is linked to a subject.
  - Revisions are immutable.
  - Sharing needs an approved proposal and can be revoked.

**Phase 4 — Advanced maker + specialized**
- Short video/audio through a media service boundary, declarative client portal/dashboard, "Visualize this concept", and "Analyze this plan" gated by AEC/real-estate tags.
- Optional sandboxed code generation for portals.
- Acceptance:
  - Jobs are resumable and cancellable, with a per-member daily budget.
  - Specialized verbs never rank for non-matching entities.

**Checkpoint: DO NOT BUILD YET.** After Phase 0 is approved and verified, we stop and review before Phase 1 starts.

## Decisions still open

1. **Cost display:** show an estimate in credits per run, or only "uses web research · light/medium/heavy"? I recommend light/medium/heavy plus a daily cap.
2. **Default daily budget** for web and media runs per member. It could be set by admins in launch settings.
3. **Portal hosting:** should client portals live on the Passport-style public route (network-visible or shareable link), or only for signed-in network members in Phase 3?
4. **Findings visibility:** strictly private to the owner, or shareable with delegates who have read permission?
5. **Referral economics:** do we record monetary referral fees, or only reciprocity (favours given and received)?
