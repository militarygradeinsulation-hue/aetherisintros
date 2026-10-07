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
- The public intro runs a bounded automatic transition after one forward gesture and releases scrolling without another gesture. Why: entering the site must not require repeated swipes or depend on video buffering.
- The root shell owns the shared aurora, numeric drift, and connection field; page shells must not mount duplicate background canvases. Why: every route keeps the same ambience without extra animation loops or intercepting input.
