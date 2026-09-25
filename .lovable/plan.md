# Ask Intros Capability Layer — hardened plan

The short version: don't port six apps. Port about eight **verbs** onto the Intros graph Intros already has. Most of what the source projects offer either already exists in Intros or would split the graph in two.

## Challenge first

- **Obsidian Coder, Filament/Lumina and ArchVision don't belong in a CEO relationship network.** They are separate products, and adding them turns Intros into "everything for everyone". A CEO won't look for a code IDE or a floor-plan tool inside their intro network. My recommendation: leave them out of Phase 1–2. The only exception is media output that is tied to a relationship. For example: "Create a 60-second intro video for this opportunity" or "Create a deck for this board ask".
- **Nexus IQ and the Golden Report overlap heavily** with things Intros already does: Company Pulse, Customer Risk, Blind Spots, Red Team, Forecast Confidence, Capital Map. The part that is actually new is **outside-in company diagnostics**: evidence from the public web, plus tech/hiring/content signals.
- **Referral Connector Hub is about 80% duplicate.** Only port referral attribution (who referred, value, reciprocity owed) and partner tiers. Put both on `crm_people`/`crm_opportunities`. Don't add a new CRM.
- **The idea's biggest risk is data leakage, not UI.** A capability that runs with the admin client, or that receives "the whole store", breaks the rule that each capability gets only the context it was given. The envelope design below exists to prevent that.

## 1. Integration spine (existing, verified)

- Canonical graph: `crm_people`, `crm_companies`, `crm_opportunities`, `crm_tasks`, `crm_activities`, `crm_notes`, plus Grid.
- Linking: `entity_links` (owner-scoped, text ids).
- History: `entity_events` (append-only for authenticated users; SELECT/INSERT only).
- Governance: `approval_queue`, `digital_you_rules` (block / ask / allow / remind), `delegates` plus `has_delegate_permission`.
- Reasoning objects: `decisions`, `missions`, `negotiation_rooms`, `scenario_rooms`, `asks`/Signals, `memories`.
- Routing: `recognizeCommand` (regex, in ceo-engine) → `openCeo`, with `askIntros` as the language fallback.
- Surfaces: `AskIntrosDock`, the CEO panels host, the InsightBar, and Home widgets.

## 2. Additive vs duplicate

| Source | Port (additive) | Do NOT port |
|---|---|---|
| Command GDR | Diagnose Company report with evidence-graded findings; "What would I do?" framed as a Digital You simulation; autonomy levels 0–4 wired to the existing rules | Work queue (use `approval_queue` + `crm_tasks`); its own confidence model (reuse the provenance layer) |
| Nexus IQ | Outside-in signals (hiring, tech, content, competitors); revenue-leak hypotheses as Findings; Content drafts + calendar (use `calendar_events`) | Company profiles and gap lists as new tables; a separate calendar |
| Referral Hub | Referral attribution, partner tier, reciprocity balance | Partner CRM, contacts, pipeline |
| Filament/Lumina | Later: Create Asset (brief, script, deck, short video) linked to an entity | Timeline editor, effects, studio UI |
| ArchVision | Later, only when the company/opportunity tag is real estate/AEC: Analyze Plan | Every other tool it has |
| Obsidian Coder | Nothing yet. Maybe later: "Build a landing page for this opportunity", through a service boundary | IDE, file explorer, Git, deploy |

## 3. Registry + Router + envelopes

The registry is code-defined and typed. There is no registry table, so users can't install or add capabilities.

```ts
type Verb = 'diagnose'|'prepare'|'challenge'|'find'|'fix'|'create'|'draft'|'build'|'analyze'
type EntityRef = { type: 'person'|'company'|'opportunity'|'signal'|'meeting'|'decision'|'mission'; id: string }
type Scope = 'entity:read'|'links:read'|'activities:read'|'notes:read'|'memory:read'|'web:read'|'asset:write'|'record:propose'

interface Capability<I, O> {
  id: string                      // 'company.diagnose'
  verb: Verb; label: string       // 'Diagnose this company'
  appliesTo: EntityRef['type'][]
  when?(ctx: SurfaceContext): boolean        // contextual gating (e.g. AEC tag)
  scopes: Scope[]                             // declared, enforced server-side
  impact: 'read'|'draft'|'write'|'external'   // drives approval
  mode: 'instant'|'job'
  input: ZodSchema<I>; output: ZodSchema<O>
  deterministic(ctx: ContextEnvelope, i: I): Promise<O> | O   // required
  ai?(ctx: ContextEnvelope, i: I): Promise<O>                 // optional enhancer
}

interface ContextEnvelope {           // built server-side ONLY
  requestId: string; ownerId: string; actor: 'member'|'delegate'
  subject: EntityRef
  granted: Scope[]                    // intersection of capability.scopes and consent
  data: { entity; links?; activities?; notes?; memory? }   // fetched by scope, with RLS
  budget: { maxRecords: number; maxWebCalls: number }
}

interface ResultEnvelope<O> {
  status: 'ok'|'partial'|'unavailable'|'needs_approval'|'failed'
  engine: 'deterministic'|'ai'|'hybrid'
  output: O
  findings?: Finding[]                // claim, evidence[], confidence, source
  proposals?: Proposal[]              // record changes, never applied directly
  assets?: AssetRef[]
  provenance: { inputs: EntityRef[]; sources: string[]; model?: string; runId?: string }
  unavailableReason?: string
}
```

The router has a single entry point, `runCapability(id, subject, input)`, implemented as an auth-gated server function. Its steps:

1. Resolve the capability.
2. Check that the subject belongs to the caller. Fetch it with the user's RLS client, never the admin client.
3. Build the envelope using the declared scopes only.
4. Run the deterministic path. If AI is available, run the AI path and merge.
5. Validate the output against the zod schema.
6. Write the run record and events.
7. Send proposals to approval.

## 4. Ask Intros routing without legacy names

- Use a three-tier router:
  1. The current regex `recognizeCommand`.
  2. A deterministic verb+noun matcher built from the registry labels and synonyms, e.g. "diagnose", "what's wrong with", "audit".
  3. The language model, given the registry as a tool list: `run_capability(id, subject)`.
- The subject is resolved from what the user is looking at (page, open entity) or from a name lookup through `crm_people`/`crm_companies`.
- User-facing text uses verbs and outcomes only. Source-app names never appear anywhere in the UI or in prompts.

## 5. Write-back to canonical records

- Capabilities never write to CRM tables directly. They return `Proposal`s, for example `create task`, `update opportunity stage`, `add note`, `add tag`, `set referral source`.
- Low-impact proposals that Digital You allows are applied by the router through the existing repositories (`crm/repo.ts`). Everything else goes to `approval_queue`.
- Every created row gets an `entity_links` row: capability_run → record, plus the subject.
- Findings are stored as `crm_notes` of kind `finding`, with evidence in a JSON field. There is no parallel findings table unless Decision 3 says otherwise.

## 6. Files and assets

- Create a new private bucket, `capability-assets`, with the path `{owner_id}/{run_id}/{file}`. Its storage policy uses the first path segment `= auth.uid()`. Downloads use signed URLs only, following the existing journal pattern.
- Create a new table, `capability_assets`, with these columns: id, owner_id, run_id, subject_type, subject_id, kind (doc/image/video/audio/deck), mime, bytes, storage_path, title, created_at.
- Each asset is also linked in `entity_links`, so it shows on the Person, Company or Opportunity page under "Created for this".

## 7. Long-running jobs

- Create a new table, `capability_runs`, with these columns: id, owner_id, capability_id, subject, status (queued/running/needs_approval/done/failed/unavailable/cancelled), progress 0–100, step_label, input_hash, result jsonb, engine, error_code, started_at, finished_at.
- `mode: 'job'` returns a run id immediately. Work continues in the server function via chunked steps. The client polls or listens through realtime on its own rows.
- Retries follow the gateway rules: 429/5xx are retried with backoff, 402/403 pause the run and show the reason. Nothing retries forever.
- Cancel sets status and an abort flag. Deduping uses the same `input_hash` within 10 minutes.
- Results show up in three places: the Ask Intros dock, a "Running" chip in the InsightBar, and the Home "Work in progress" widget. All three are existing surfaces.

## 8. Approvals and Digital You

- `impact` decides the approval:
  - `read`: always runs.
  - `draft`: runs; the output is a draft.
  - `write`: checked against `digital_you_rules` (rule_kind = capability id or impact class). `allow` applies it and logs it; `ask` sends it to `approval_queue`; `block` refuses.
  - `external` (sends a message, publishes, contacts someone): always goes to `approval_queue`. Autonomy never bypasses it, and double opt-in still applies.
- Delegates can run a capability only if they have `has_delegate_permission(principal, 'capability:<verb>')`. Their proposals always go to approval.

## 9–11. Tenant, RLS and context isolation

- All new tables are owner-scoped: minimum grants, no authenticated TRUNCATE/REFERENCES/TRIGGER, immutable `owner_id`, `capability_id`, `subject` and `created_at` (following the existing freeze pattern). `capability_runs.result` can only be changed by the router, meaning service_role.
- The admin client is used only to write run status. Data reads always use the user's RLS client.
- The context builder is the only way data reaches a capability. It fetches only the subject, plus rows linked to it through `entity_links`, capped by `budget`. There is no "search all my data" scope in Phase 1.
- Web reads are logged with their URLs. Private graph data is never sent to web search queries; queries are built only from public company names and domains.
- Other members' private data (their memories, asks, messages) is never in scope. Only public profile fields are.
- Each envelope has a `requestId`. The AI prompt gets only the serialized envelope, never the store.

## 10. Audit and provenance

Every run writes `entity_events` rows:
- `capability.started`
- `capability.completed` or `capability.failed` or `capability.unavailable`
- `proposal.created`
- `proposal.applied` or `proposal.rejected`
- `asset.created`

Each row's `detail` holds: run_id, capability_id, engine, scopes granted, input entity refs, sources, model, approval id.

This exposes a gap: today `entity_events.source` is free text that the client can insert, so provenance can be forged. The fix is technical debt item #2 below.

## 12–13. UI without a new nav or Apps page

**One component, `CapabilityActions`,** takes an `EntityRef` and shows the 2–4 verbs that apply to it, taken from the registry's `appliesTo` and `when`. It appears:

| Surface | Verbs |
|---|---|
| Person | Prepare for meeting, Find warm path, Draft intro, Challenge this relationship, Track referral |
| Company | Diagnose company, Find revenue leaks, Watch signals, Find who can change this |
| Opportunity | Challenge the deal, Prepare proposal, Create deck/brief, Fix stalled stage |
| Signal / Ask | Find who can help, Draft reply, Route to member |
| Meeting | Prepare brief, Capture outcomes → commitments |
| Decision | Challenge (red team), What would I do?, Run scenario |
| Home | "Ready for you" widget (completed runs, pending approvals), plus 1 suggested verb |

The same verbs work typed or spoken in Ask Intros. There is no catalog page. "What can you do here?" in the dock lists the verbs for the current context.

## 14. Verb vocabulary

Diagnose, Prepare, Challenge, Find, Fix, Draft, Create, Analyze, Build. Names are always written as verb + object ("Diagnose Acme"), never as a feature name.

## 15. Phasing

- **Phase 0 (debt, required):** see §17.
- **Phase 1:** registry/router/envelopes, runs, events, approvals. Five capabilities:
  - Diagnose Company (deterministic from CRM + public web signals)
  - Prepare Meeting (upgrades the existing brief)
  - Challenge Decision/Deal (wraps the existing red team)
  - Find Who Can Help (wraps the existing routing)
  - Draft Outreach/Content (draft only)
- **Phase 2:**
  - Referral attribution + reciprocity
  - Find Revenue Leaks
  - What Would I Do? (Digital You simulation)
  - Content calendar on `calendar_events`
  - Assets bucket + Create Brief/Deck (document output)
- **Phase 3 (only if Decision 1 = yes):** Create short video/audio for an opportunity through a service boundary; Analyze Plan gated to AEC tags.
- **Not planned:** code building/IDE.

## 16. Copy into Intros vs call through a service

- **Copy and refactor into Intros:** diagnostics scoring rules, finding/evidence model, revenue-leak heuristics, referral logic, content prompt templates, autonomy levels. All of these are pure logic and get rewritten against Intros types.
- **Service boundary (server function → external API, never an iframe):** media generation/editing (AI Gateway image/video models or ElevenLabs), ArchVision vision models, anything heavy or long-running. The service receives only the envelope subset it needs and returns asset bytes or a URL, which Intros stores.
- **Never:** a shared database or cross-project login. The other apps stay as they are; Intros doesn't depend on them running.

## 17. Technical debt to fix first

1. **`askIntros` has no auth.** It calls paid AI and web search, and anyone can reach it. Gate it with `requireSupabaseAuth` and pass through the caller's scope.
2. **`entity_events` provenance can be forged.** Clients can insert any `source`/`event`. Make capability events writable only by the router (a security-definer RPC or service_role), and restrict client inserts to `source = 'app'`.
3. **`entity_links` uses text ids without integrity.** Add type allow-list CHECKs and a helper RPC that verifies both ends belong to the owner.
4. **Two migration histories** (`supabase/migrations` and `drizzle/migrations`). Pick one as the source of truth before adding more tables.
5. **Ownership columns are inconsistent** (`owner_id` vs `user_id`). Document one convention; new tables use `owner_id`.
6. **Routing is fragile.** `recognizeCommand` is a long regex chain in ceo-engine. Move it into the registry-driven matcher so there's one source of truth.
7. **`App.tsx` is about 2.8k lines** and `store.tsx` is a large client store. Don't add capability UI there. Put it in `src/aetheris/capabilities/`.
8. **AI replies are parsed from free-form JSON text.** Switch to tool calls / structured output with a fallback.

## 18. Failure and confusion risks

- Verb overload: showing 12 buttons on every page. Keep it to 4 per entity and rank them by relevance.
- Two sources of truth for "risk": Diagnose findings versus Customer Risk. Findings must feed the existing risk engines, not compete with them.
- Silent AI degradation: always show the engine and "Unavailable because…".
- Cost runaway from web or media jobs: budgets per run and per day, and dedupe.
- Leakage through prompts: the envelope is the only thing sent.
- Approval fatigue: batch approvals, and let Digital You learn "allow" rules.
- Scope creep into IDE or studio territory: refuse at the registry level.

## 19. Directories and sequence

```text
src/aetheris/capabilities/
  types.ts            Verb, Scope, EntityRef, envelopes, Finding, Proposal
  registry.ts         capability list (imports defs)
  match.ts            deterministic verb+noun matcher (absorbs recognizeCommand)
  defs/diagnose-company.ts  prepare-meeting.ts  challenge.ts  find-help.ts  draft.ts
  CapabilityActions.tsx  RunChip.tsx  ResultView.tsx  ReadyWidget.tsx
src/lib/capabilities.functions.ts   runCapability, getRun, cancelRun, decideProposal (auth-gated)
src/lib/capabilities/context.server.ts   scoped envelope builder (RLS client)
src/lib/capabilities/writeback.server.ts proposals → repo + links + events
```

New tables (one migration): `capability_runs`, `capability_proposals` (or reuse `approval_queue` with `run_id`; see Decision 3), `capability_assets`, and the private `capability-assets` bucket.

Sequence:
1. Debt 1–4
2. Types + registry + matcher (fold in the existing commands)
3. Runs table + router + context builder
4. Events/provenance RPC
5. Approvals + Digital You wiring
6. `CapabilityActions` on Company/Person/Opportunity/Decision
7. Phase 1 capabilities
8. Home "Ready for you" widget
9. QA: RLS, privileges, cross-account leakage tests, desktop/mobile, AI-off mode

## Decisions to settle first

1. **Scope:** Are code building, full media studio and architecture tools in or out? I recommend out, with only entity-linked briefs/decks/short media in Phase 3.
2. **Web data:** May Diagnose Company use live web search (it costs money per run), or should Phase 1 be CRM-only plus manually pasted evidence?
3. **Storage shape:** Should Findings and Proposals reuse `crm_notes`/`approval_queue` (fewer tables) or get dedicated tables (cleaner provenance)? I lean toward dedicated `capability_proposals` feeding `approval_queue`.
4. **Autonomy default:** Should new members start at level 1 (everything asks) or level 2 (low-impact writes auto-apply)?
5. **Migrations:** Which migration history is canonical going forward?
6. **Delegates:** Can delegates run capabilities at all in Phase 1?
