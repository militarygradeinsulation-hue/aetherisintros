# Ask Intros — unified delivery roadmap
Reviewed: 2026-10-17. Source of truth: `main` plus open GitHub PRs. This document is a plan, not a claim that the full live experience is certified.

## Rules of engagement
1. Audit existing code, migration journal, frontend route, RPC grants/RLS, and running integration **before** writing a feature.
2. Choose one canonical user/account/company/contact/relationship record per scope; never create a second CRM, spreadsheet, intro, messaging, reputation, or opportunity store.
3. Extend existing modules through small PRs. Never merge a branch with old duplicate migration numbers or generated router files wholesale.
4. Backend permissions must be tested with two distinct authenticated actors, one nonmember, one admin; deny arbitrary access to other members' private records.
5. Every feature requires loading/error/empty/success states, persisted state after reload, mobile and light/dark review, accessibility, and rollback support. Distinguish UI prototype from live connected functionality.
6. External sending, profile enrichment, invitations, and automations need explicit consent; support permission revocation, provenance and an audit trail.
7. No administrator privilege via a quick-access code. Protect role assignment by verified identity and reviewed migrations.

## Current capability inventory (avoid doubling)
| Domain | Main branch evidence | Status / work left |
|---|---|---|
| Founding signup and membership | 0086 signup mode, 0087 confirmed/onboarded access, access.ts | Implement live two-user production smoke journey and recovery paths; do not repeat #117/#122-127. |
| Owner analytics and existing admin controls | 0035 admin_network_health, 0088 overview, 0089 owner provision, existing admin.early-access page | Check deployed migration, RBAC, expand feature/operational health only after auditing existing admin panels. |
| Business network and matching | matching.ts ranks with explainable component evidence; IntrosApp live hub and directory | Use observed outcomes and permissioned intent; add confidence and feedback rather than new matching engine. |
| Relationship and deal workflow | 0058 deal rooms; 0063-64 workspaces; 0068 meeting briefs; 0071-72 referrals; 0080 intro read contract | Audit real UI entry points and persistence; repair missing buttons/permissions; no second workspace or intro request model. |
| CRM and spreadsheet | pages/CrmPage.tsx, pages/GridPage.tsx with canonical linked records and formula support | Test cross-module updates, CSV/XLSX imports, errors, duplicate handling and sync, rather than rebuilding CRM/Grid. |
| Proof and reputation | 0069 track_record and 0070 reputation_scores, passport/talent navigation in App.tsx | Convert verified work samples and outcomes into permissioned proof-of-ability, avoid second scoring table. |
| Intelligence and business execution | 0067 workbench, 0073 business_analyst; TwinPanel, simulation and strategy pages | Audit outputs vs actual persistent data, add grounded scenario engine and feedback. |
| Marketplace, collaboration | 0074 storefront proposals, 0075 syndication, 0076-77 peer groups | Inspect route coverage, capabilities and RLS; finish integrations instead of merging original feature PRs. |
| AI / assistant | VoiceBar, read-aloud, Butler/assistant surface and agent gateway 0054 | Build tool registry, approvals, failure recovery and telemetry; do not duplicate current assistants. |

**Migration note:** 0062–0077 exist on main. Old PR branch copies of the same features and migration names are not safe to merge verbatim. Migration 0088–0089 are merged in code, but deployment/migration activation is a separate checkpoint.

## Delivery order and acceptance gates

### Phase 0 — Reliability & admin control (P0; prerequisite for every other phase)
- Inventory all visible app navigation destinations, auth gates, server RPCs, provider connection flags and background jobs; classify working / degraded / demo-only / disconnected.
- Add admin-only integration status, signup funnel, failure-rate summaries, failed job queue and owner release monitor to **existing** admin UI.
- Regression suites: unauthenticated -> signup -> confirm email -> profile -> live session; account A -> intro -> B receives -> consent -> persisted message; post ask -> reload; CRM ↔ Grid edit; dark/light mobile tiles/modals. Denied RLS operations must fail.
- Server should return meaningful failure messages; UI must not silently substitute sample data as live data. Capture correlation IDs but redact message bodies and access tokens.
- Set release gates: TypeScript/build, migration checks, browser parity, 2-user DB permission tests, security scan, production smoke with real owner sign-in.
- Done when no known P0 flows fail and admin sees evidence of failure instead of blank UI.

### Phase 1 — Opportunity intelligence (P1)
- Reuse matching.ts, existing warm-referral engine (0072), meeting briefs (0068), business analyst (0073), company/intel pages.
- Ground ranking in opted-in needs/offers/industry, confirmed relationship edges and observed outcomes. Show why recommended, freshness, missing evidence and opt-out.
- Introduce a *scenario layer* over existing opportunity/company graph: assumptions, constraints, ranges and comparisons; never present scenario estimates as guaranteed forecasts.
- Deliver targeted opportunity alerts and one-click **draft** introduction, not automatic outbound introduction without consent.
- Done when two members see distinct explainable recommendations, feedback influences rank, and an accepted recommendation becomes an existing intro/room record rather than a duplicate.

### Phase 2 — Autonomous CRM and Smart Grid (P2)
- Keep current CRM and linked Grid canonical. Implement import preflight (CSV/XLSX), dedupe suggestions, mapping previews, source provenance, dry-run, explicit approval, undo/audit, per-company permissions.
- Add stale-field detection, follow-up recommendation drafts, user-approved batch edits and idempotent connectors. Never silently rewrite existing contact data.
- Build integration health and retry behavior for existing services rather than creating unverified connector buttons.
- Done when imported records appear once in CRM, Grid and relationship view; edits remain consistent across refresh and conflicts can be recovered.

### Phase 3 — Proof-of-ability and talent network (P3)
- Reuse track_record (0069), reputation_scores (0070), existing passport/talent pages, verified evidence and outcomes.
- Create claim -> evidence -> reviewer decision -> revocation workflow with visibility settings and anti-gaming checks. Business-role verification is not proof of work.
- Match opportunities to demonstrated ability, not just titles; allow restricted sharing of private work samples and clear provenance on badges.
- Done when verified and unverified claims are distinguishable, the reviewer can't approve their own claim, and deleted/revoked evidence disappears from public views.

### Phase 4 — Cross-system orchestration (P4)
- Integrate Butler, business twin, opportunity engine, CRM, proofs and existing deal rooms through explicit approved tool actions.
- Feature flags, usage quotas, per-tenant boundaries, action log, human confirmation for external messages/deals, safe fallback, rollback.
- Done when cross-module workflows continue after reload, follow account permissions, and can be explained/audited from the owner console.

## Safe open-PR disposition
- **#117, #122, #123, #125–127**: competing older signup/access rewrites; superseded in core by 0086–0087 and merged #128. Extract only specific nonduplicate UI/test fixes after diff review; no direct merges.
- **#104, #108, #62, #12, #1**: old visual/demo refinements; test real current UI first; cherry-pick isolated uncovered tests or CSS, never overwrite current theme.
- **#44, #45, #50, #60, #63, #74**: broad integration branches based on older architecture. Compare each feature to 0062–0079 and current App.tsx; extract only missing wiring under new migrations if needed.
- **#53–59**: feature PRs for briefs, reputation, warm paths, analysis, storefront, syndication and peer groups; database foundations already have corresponding newer migration tags. Review missing frontend routes/actions/tests individually; **do not** merge duplicates or stale generated routeTree.gen.ts.
- **#80**: review consent/privacy and provider configuration for profile enrichment; keep draft until security tests and real integration evidence.
- **#64–65**: no code changes / WIP; close or update after verification rather than merging.
- All long-lived branches need a fresh `main` baseline and CI; branch mergeability alone is not a release criterion.

## Recommended PR sequence
1. **P0-A:** production migration checklist + owner dashboard status and secure admin role verification (no unreviewed prod mutation).
2. **P0-B:** automated signup-to-first-intro integration test + reliable empty/error states; demo/live segregation.
3. **P0-C:** existing CRM/Grid and intro/room permission contracts + mobile/light/dark release checks.
4. **P1-A/B:** explainable opportunity ranking and consent-based alerts on existing matching/referral stores.
5. **P2-A/B:** reviewed import/dedupe and permissioned follow-up automation on existing canonical CRM.
6. **P3-A/B:** evidence-reviewed proof claims and member talent discovery through existing track record/passport.
7. **P4:** Butler tool orchestration and admin audit/feature-flag console.

**No blanket branch merges.** Merge one green, backward-compatible PR per milestone; check current main again before each merge and verify deployed behavior after migration.
