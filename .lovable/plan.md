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
- Digital You never hides, collapses or rewrites a finding. Only the member can dismiss or resolve one, one finding at a time, with a note.
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
                       granted_scopes text[], web_domains text[], cost_tier(light|medium|heavy), engine,
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

## Final decisions (settled)

1. **Cost:** members see Light / Medium / Heavy with a plain sentence about what the run uses. Raw provider and credit accounting stays internal, in a server-only usage ledger. Admins can set daily caps.
2. **Artifacts and portals:** private by default and previewed inside Intros. They can be shared in two ways: with signed-in network members, or through an external revocable link. Both need an approved share proposal.
3. **Findings:** private to the owner. A delegate can see a finding only with an explicit read grant for that subject or capability. Findings are never visible to the network.
4. **Referrals:** reciprocity plus optional amount and currency. An amount exists only when it was typed in or comes from a recorded opportunity or outcome. It is never inferred.
5. **Migrations:** `supabase/migrations` is frozen as history. Drizzle is the only way forward, and this is documented.
6. **Maker:** Phase 3 is declarative only. Phase 4 allows sandboxed generated code for portals and dashboards only, never running in the main app.
7. **Digital You:** style and priority only.
8. **Autonomy:** Level 1 by default. External actions always need approval.
9. **Naming:** no legacy source names in the UI, in ids, in prompts or in stored `capability_id` values.

## A. Contradictions found and how they are resolved

1. **Digital You "collapse by rule"** (section D) contradicted decision 7. It has been removed: Digital You can no longer hide findings in any way.
2. **The `cost_estimate int` column** exposed provider-style accounting. It is replaced with `cost_tier`, and a separate server-only `capability_usage` ledger takes over (service_role only; admins read totals through an RPC).
3. **Delegate permissions are too coarse.** `has_delegate_permission(principal, perm)` has no subject or capability scope, so it can't express decision 3. Fix: add a `delegate_capability_grants` table (delegate_id, capability_id or '*', subject_type, subject_id or null, access read|run) and a `can_delegate(principal, capability, subject, access)` function.
4. **The approval queue lets any client self-approve.** That breaks decisions 6 and 8, because nothing stops a delegate's or client's row from going straight to executed. Fix (Package 1): clients can set only `approved` or `rejected`, and only the principal can do it. `executed` is set by a server RPC only, and only for rows already `approved`.
5. **Section B's `dismissed` ranking input** had no storage. Fix: add a small owner-scoped `capability_dismissals` table (subject + capability + until).
6. **Section C's `visibility`** didn't include signed-in network sharing as a distinct option, and didn't tie visibility to approval. Fix: `visibility private|network|link`, where any value other than private requires `share_proposal_id` to point to an applied proposal. A trigger enforces this.
7. **The daily caps in section I** had no settings home. Fix: add `capability_limits` (singleton, admin-only write) holding per-tier daily caps per member.
8. **Section E still names source systems.** That's acceptable in this planning document only. Code, ids, comments visible in the UI, and prompts must use outcome names. A lint check (grep in CI for the legacy names) enforces this.
9. **Roadmap Phase 0 bundled the router extraction with the security fixes.** They are now split, so security can be verified on its own (see below).
10. **`roadmap.md` has not been updated yet,** because only the plan can be edited in planning mode. Its first build step is to add these packages there.

## B. Build packages with stop criteria

Each package is small, can be reverted, and ends with a stop: verify, report, and wait for your OK.

**P1 — Security spine (no visible change).** Details in section C below.
Stop when:
- The SQL tests pass: cross-account reads return 0 rows, a client can't set `executed` or forge an event source or link rows it doesn't own, and a delegate can't approve.
- A signed-out `askIntros` call returns 401.
- The linter is clean, and the build and the existing phrase routing are unchanged.

**P2 — Router extraction (no visible change).**
- `recognizeCommand` moves into `capabilities/match.ts`, and the old exports stay as wrappers.
- The registry holds only "adapter" capabilities that point to existing CEO panels.
- Stop when: a phrase test suite covering every existing command passes, and the Playwright smoke test for Ask Intros opens the same panels.

**P3 — Capability Workspace shell (first visible change).**
- The workspace sheet opens (desktop sheet, mobile bottom sheet), with the lifecycle states rendered from `capability_runs`.
- It is wired to one read-only capability: Challenge, which wraps the existing red team.
- Stop when:
  - Every lifecycle state renders correctly in a fixture.
  - There is no horizontal overflow at 1440, 1280, 390 or 360px.
  - Cancel works.
  - AI-off mode shows the deterministic result.

**P4 — Discovery.**
- The "Do more" menu on Person, Company, Opportunity and Decision.
- The ranking function with unit tests.
- At most 2 chips.
- "What can you do here?".
- Stop when: at most 4 verbs appear, the ranking tests pass, a dismissed chip stays hidden, and no new nav or catalog was added.

**P5 — Findings + proposals + approvals.**
- Findings UI, proposal apply / send to approval, the Digital You rule evaluation, delegate grants in the UI.
- Stop when:
  - Level 1 behaves correctly (writes ask, external always asks).
  - A delegate's proposals need the principal.
  - Findings feed the Risk/Blind Spot engines as an input.
  - Resolving or dismissing a finding is logged.

**P6 — Phase 1 capabilities.**
- Diagnose (internal only), Prepare Meeting, Find Who Can Help, Draft (follow_up, intro_note, exec_update).
- Stop when: each one shows its context used, returns a deterministic fallback, links its output to the subject, and passes a cross-account leak test.

**P7 — External research.**
- The Diagnose web layer with a consent step, the Light/Medium/Heavy label, the usage ledger and the daily caps.
- Stop when:
  - An audit test shows no private field in any logged query.
  - The cap blocks correctly and shows a plain message.
  - A 402/403 from the provider leaves the run UNAVAILABLE rather than retrying it.

**P8 — Growth templates + referrals.** social_post, signal, sales_script, content_calendar proposals, and referral reciprocity/amount fields.

**P9 — Maker Phase 3.** Artifacts and revisions, declarative doc/deck/form/calculator/portal, approval-gated network or link sharing.

**P10 — Maker Phase 4.** Media service boundary, sandboxed portal code generation, and AEC-gated Analyze Plan / Visualize.

**Checkpoint: DO NOT BUILD beyond P1 until P1 is verified and you approve.**

## C. Minimum first package (P1) — the spine, almost invisible

One Drizzle migration, plus two server-function changes.

1. **Documentation:** `docs/MIGRATIONS.md` states that `supabase/migrations` is frozen and Drizzle is the forward path.
2. **Hardening of existing tables:**
   - `approval_queue`:
     - Split the `FOR ALL` policy into SELECT, INSERT (status must be `pending`) and UPDATE (status only `approved` or `rejected`, owner only).
     - Add `execute_approval()` (security definer; requires `approved`).
     - Add nullable `run_id` and `proposal_id` columns.
     - Add the `capability_proposal` action type.
   - `entity_events`:
     - Client insert policy requires `source = 'app'` and an `event` that does not start with `capability.`.
     - Add `append_capability_event()` (security definer, callable only through the router, which checks the owner).
   - `entity_links`:
     - Add a type allow-list CHECK as `NOT VALID`, then check existing rows and validate in a follow-up migration.
     - Add a `link_entities()` RPC that verifies both ends belong to the owner.
3. **New tables, empty and not yet used by the UI:**
   - `capability_runs`, `capability_findings`, `capability_proposals`
   - `capability_dismissals`
   - `delegate_capability_grants`
   - `capability_limits` (admin)
   - `capability_usage` (service_role only)
   - `capability_artifacts` + `capability_artifact_revisions` are deferred to P9 to keep P1 small.

   For every table: RLS, minimum grants, no authenticated TRUNCATE/REFERENCES/TRIGGER, `freeze_columns` on the identity columns, and status transitions only through security-definer RPCs: `start_run`, `set_run_status`, `add_finding`, `add_proposal`, `decide_proposal`, `resolve_finding`.
4. **Server:**
   - `askIntros` gets `requireSupabaseAuth`. The dock shows a friendly signed-out message; this is the only visible change.
   - Add a `capabilities.functions.ts` skeleton with `startRun`, `getRun` and `cancelRun`, backed by one internal no-op test capability. It isn't reachable from the UI.
   - Add `context.server.ts` with scope enforcement and unit tests.
5. **Types only:** `src/aetheris/capabilities/types.ts`, with the envelopes, the lifecycle enum and `layer` tags.
6. **Verification** (these are the stop criteria):
   - Simulated SQL tests as two users plus a delegate.
   - The linter.
   - A privilege matrix query.
   - A signed-out 401 check.
   - The existing Ask/CEO command smoke test.
   - The build.

