# Social and Business views

Social View follows the published `https://aetheris-bridge.lovable.app/demo` and the owner-supplied `aetheris-bridge.zip` from October 24, 2026. The prior Social View used the different Absolute Ledger Bridge branch; the published Commons composition is now the reference.

The Commons home, People directory, profile, logo and complete light/dark glass stylesheet are adapted directly from that source. `bridge-social.css` scopes every top-level selector to `html[data-experience="social"]`, including portal styling. `bridge-social-host.css` adapts the presentation to the existing Ask Intros shell. Business retains its current dashboard, sidebar, tables and controllers. The existing Social/Business preference and dark default remain intact.

Both views use the same `IntrosApp`, canonical navigation destinations, records, action callbacks, assistant and modal instances. The live feed remains in one stable child slot within `LedgerDashboard` through experience and feed-section switches. The demo draft is shared by both composers; demo replies remain local. The reference post renderer also displays the existing demo post photos. People filters and profile actions use the production member records and existing handlers; names never resolve to unrelated portraits.

The original Bridge logo is bundled at `/ask-intros-bridge-logo.jpg` and only CSS crops it. Existing bundled fonts are reused. No Bridge environment settings, backend configuration, database migrations, credentials or account records are imported.

## Validation

Run `npx tsc --noEmit -p .`, `npx vitest run` and `npm run build`. The retained `scripts/experience-check/run.mjs` checks the Commons composition, shared draft values and DOM preservation across views, directory search retention, message drafts, light/dark controls, saved experience and mobile overflow. Production persistence still requires a permitted authenticated test account; demo checks do not establish production database readiness.


## Unmodified Bridge presentation source

The `src/bridge-reference` snapshot copies the supplied `aetheris-bridge.zip` presentation files byte for byte. `manifest.json` pins their SHA-256 digests; `scripts/bridge-reference/check.mjs` fails if any copied file changes. Home, People, profile, navigation, portrait and logo render directly from this snapshot. Do not edit these files to implement host integration.

The original Commons stylesheet, fonts and root theme stylesheet are retained unchanged. `scripts/bridge-reference/styles.mjs` generates Social-only selector scopes and a layer namespace from those originals. No design declarations are rewritten. Business uses its original stylesheet. The previous approximate Social rules have been removed.

Canonical member types/data are re-exported at the snapshot boundary. Existing callbacks still own posts, introductions and connections. The live feed uses a single persistent portal, so moving its host between presentations or hiding Bridge's Posts tab never recreates the feed controller. The original Bridge navigation is mounted beside the host's separate view switch. Vite resolves the original logo implementation and its original asset URL within the snapshot.

Original Bridge demo draft and directory filters remain internal to their original components. Each view retains its own unsent demo draft and filters when toggling views; demo drafts and search input text no longer mirror between the two presentations. Shared records and submitted actions still use the canonical handlers. This is an intentional consequence of retaining the original component code.

This is not a byte-identical copy of the entire Bridge application: host controllers, other workspaces, authentication, the view switch and the feed integration remain Ask Intros code. Source equality checks apply exactly to the files listed in the manifest.

Live messaging now uses the exact original Bridge JSX in Social mode, verified against the untouched source snapshot by the same source check. The shared newer controller above that rendering continues to supply idempotent send/retry and canonical thread IDs. There is one live messaging controller, not two hidden inboxes.
