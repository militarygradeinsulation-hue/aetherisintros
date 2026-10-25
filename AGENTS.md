<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Capabilities (Diagnose, Trace cause, Model impact…) all open in the one `src/aetheris/capabilities/CapabilityWorkspace.tsx` host; App.tsx only mounts it. Why: one workspace, no floating mini-tools.
- Diagnose findings are written only via `add_capability_finding_v2`; leaks need ≥2 independent evidence refs and money needs evidence + currency (enforced in DB trigger and `capabilities/evidence.ts`). Why: never fabricate losses.
- Evidence areas live as providers in `src/lib/capabilities/diagnose.server.ts`; unsupported areas return `not_connected`. Why: new connectors plug in without changing the Diagnose contract.
- Ask Intros phrase matching lives in `src/aetheris/capabilities/match.ts` (ceo-engine re-exports it). Why: one matcher, regression-tested.
- Professional (LinkedIn) enrichment attaches to canonical `crm_people` via `person_external_profiles` + append-only `person_enrichment_snapshots`, written only by RPCs; CRM fields change only through approved `update_person_field` proposals. Why: no duplicate people, no silent overwrites, full history.
- LinkedIn results enter only through real hand-off (assistant lookup / manual paste) behind the `ProfessionalProfileProvider` seam; `direct_api` stays unavailable until a licensed provider exists. Why: never fabricate profiles.
- The Intros shell owns mobile bottom navigation and its overflow menu; reserve safe-area space and lift the assistant above it. Why: thumb access must not obscure page actions or duplicate navigation.
- The public intro exposes manual entry after a bounded timer independent of media buffering, with skip and reduced-motion access. Why: members choose when to enter without being trapped by video failures.
- The root shell owns the shared aurora, numeric drift, and connection field; page shells must not mount duplicate background canvases. Why: every route keeps the same ambience without extra animation loops or intercepting input.
- Shared paper-surface contrast repairs belong in the final site-readability layer, scoped to editorial copy rather than photographic overlays or intelligence graphs. Why: legacy classic-host styles must not leak inverse ink into light surfaces.

- Live Home reuses the existing member feed through the feed-only classic host; demo social interactions stay local. Why: real posts, comments and messaging must use the established member store, not a second fake feed.
- Home board migrations retain known widget IDs and append new defaults. Why: adding tiles must not erase a member’s saved arrangement.
- Home board pinning disables the existing grid's editing rather than blocking tile actions, and persists on the device. Why: members can lock placement without losing navigation or social controls.
- Home tile sizes persist with the arrangement and sync into the mounted grid without size-dependent keys; content and resize controls opt out of dragging. Why: resizing must not replay board entrance animations, lose scroll position, or interfere with reading.
- Prospect Intelligence lives inside canonical CRM, uses the existing admin gate and owner-scoped workspace state, and saves reviewed outcomes atomically through icp_save; LinkedIn actions remain manual. Why: one person graph, no duplicate contacts or falsely recorded sends.
- Private Prospect Intelligence access requires admin role plus the single row allowed per capability in private_owner_grants (candidate 0095); the server gate (prospect/owner-gate.ts) only admits when has_private_owner_grant exists and returns true, with no admin fallback. Why: founder-private data must fail closed before and after rollout.
- Recovery replay runs only in disposable PGlite with explicit baseline provenance and unchanged historical SQL; incomplete baselines must never be reported as live compatibility. Why: synthetic dependency diagnostics cannot establish production migration state.
- Professional document evidence extends the existing LinkedIn scan contract; unsupported fields and hypotheses remain ephemeral private review, while supported own-profile changes use an owner-bound optimistic snapshot. Why: no duplicate profile store, public evidence leak or silent concurrent overwrite.

- Specter Detect uses the single canonical `src/features/specter-detect/SpecterDetectPanel.tsx` capture workflow inside the reference sidebar/top-bar host in `src/intros-ui/views/SpecterDetectView.tsx`. Preserve its live-data integration and scoped black/orange reference layout. Never replace that host with a simulated browser, preloaded sample company, fixed extraction counts or fabricated findings; anonymous demo visitors get a sign-in path for real capture. Why: the owner explicitly requires the reference appearance AND functional URL autofill, not a visual-only simulator.

- Editorial openings use the shared media-optional composition and avatar fallbacks use member-media; no name resolves to a stock face. Why: compact layouts preserve genuine media without decorative photo substitutions.
- Dashboard defaults to the social feed; tools occupy a separate view without unmounting feed drafts, and both feeds use the shared presentation-only feed window. Why: progressive disclosure reduces scroll without changing stored posts or live visibility rules.
- The four Executive member tools share a scoped presentation stylesheet, including their portalled dialogs. Why: dark surfaces and controls remain consistent without changing global themes or page logic.
- Member navigation belongs in `src/intros-ui/components/layout/workspace-navigation.ts`: ten main destinations, related section controls, and account administration in the account menu. Preserve canonical tool IDs and data providers when grouping features; CRM & Pipeline only exposes CRM and Pipeline. Why: consolidating navigation must not merge private records or remove existing tools.
- The active Dashboard uses `LedgerDashboard` and `LedgerWidgetBoard`, with the shared `components/ui/widget-board.tsx` drag engine. Keep the feed mounted when switching views, persist only layout preferences, retain known widget IDs and sizes, and render canonical records or explicit loading/sign-in states. Card depth belongs in the shared `raised-surfaces.css` layer and must respect reduced motion. Why: visual upgrades must preserve drafts, real data, and usable controls.
- Social presentation uses the hash-pinned Bridge reference; integrations stay outside the snapshot, generated CSS remains Social-scoped, and the canonical live feed moves through one persistent portal. Why: reference fidelity must not replace authentication, data controllers or Business presentation; component-local demo drafts persist independently per view.
