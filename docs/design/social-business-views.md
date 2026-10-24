# Social and Business views

Social View follows the published `https://aetheris-bridge.lovable.app/demo` and the owner-supplied `aetheris-bridge.zip` from October 24, 2026. The prior Social View used the different Absolute Ledger Bridge branch; the published Commons composition is now the reference.

The Commons home, People directory, profile, logo and complete light/dark glass stylesheet are adapted directly from that source. `bridge-social.css` scopes every top-level selector to `html[data-experience="social"]`, including portal styling. `bridge-social-host.css` adapts the presentation to the existing Ask Intros shell. Business retains its current dashboard, sidebar, tables and controllers. The existing Social/Business preference and dark default remain intact.

Both views use the same `IntrosApp`, canonical navigation destinations, records, action callbacks, assistant and modal instances. The live feed remains in one stable child slot within `LedgerDashboard` through experience and feed-section switches. The demo draft is shared by both composers; demo replies remain local. The reference post renderer also displays the existing demo post photos. People filters and profile actions use the production member records and existing handlers; names never resolve to unrelated portraits.

The original Bridge logo is bundled at `/ask-intros-bridge-logo.jpg` and only CSS crops it. Existing bundled fonts are reused. No Bridge environment settings, backend configuration, database migrations, credentials or account records are imported.

## Validation

Run `npx tsc --noEmit -p .`, `npx vitest run` and `npm run build`. The retained `scripts/experience-check/run.mjs` checks the Commons composition, shared draft values and DOM preservation across views, directory search retention, message drafts, light/dark controls, saved experience and mobile overflow. Production persistence still requires a permitted authenticated test account; demo checks do not establish production database readiness.
