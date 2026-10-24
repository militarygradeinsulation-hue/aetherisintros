# Recovery batches — October 23, 2026

The recovery preserves the current Ledger/Command Dashboard design. Changes are recovered onto current main in separate PRs; old branches are not merged wholesale or deleted. A merge, an editor sync, a publication request and verified live behavior are distinct states.

## Release order and evidence

| Batch | Recovery PR | Scope and validation |
| --- | --- | --- |
| Paused highlights | #297 | All GitHub checks passed; merged and published. Phone browser verified native scrolling with transform disabled on askintros.vip. Deployment bed916c1-c9b7-4d17-8f77-ecaf8a0bdc9d. |
| Posting reliability | #298 | All GitHub checks passed; merged and published. Nine receipt unit tests and twelve composer browser assertions passed. Live bundle verified draft-preservation and denied/unconfirmed receipt handling. Deployment f6df0d25-ef52-44a8-99f0-b9ee60acfd1c. This is not an authenticated production save acceptance test. |
| Social media and headlines | #299 | Two existing generated demo images in posts/highlights; live Journal attachments inline; canonical business-news ticker with pause/reduced-motion controls; signed URL cache expiry. TypeScript, build and desktop/phone checks in both themes passed locally. Full release state is tracked by the PR and deployments. |
| PDF reader | #300 | Journal/message attachment reader with local PDF.js worker, bounded canvas and search, zoom, rotation and thumbnails. Black/red controls and light-mode styling. TypeScript and 22 actual PDF browser assertions passed at 1280/390/320px. |
| Opportunity intelligence | #302 | Read current account CRM opportunity/contact/activity records; require permission and matching consent plus explicit reviewer ratings. Unknown data remains unknown. Explain weights and coverage; no enrichment, outreach, predictions or persistent ratings. Twelve focused scoring/adapter/evidence-boundary tests passed. |
| Backend safeguards | #301 | Pending-order/ledger validation, known collision exclusions, fail-closed replay and expanded isolation rehearsal. Seventeen recovery tests passed. Production activation remains separate. |

## Production activation: current evidence supersedes the old replay assumption

A fresh read-only export of the connected production Drizzle ledger has 76 rows. Comparing unchanged source migrations finds 71 hash matches, 20 pending tags and four hash conflicts. One historical ledger row has an unmatched hash/timestamp. These findings do not authorize edits to the ledger.

The refreshed public catalog was reconstructed successfully in disposable PGlite. Attempting unchanged migration 0058 then failed because `deal_rooms` already exists. Replay stopped immediately. This demonstrates partial schema activation without corresponding canonical ledger evidence; the October 20 successful rehearsal is not evidence that the old replay plan remains safe today.

Raw catalog definitions and ledger exports are intentionally outside git. No production schema, RLS, grant, member-data or migration-ledger writes were performed.

Before activation:

1. Verify management access to the actual Ask Intros database and a restorable backup; perform an isolated restore.
2. Compare existing definitions, ACLs, policies, triggers and dependencies with intended contracts. Prepare additive/forward-only repairs; do not relabel or replay 0062 and do not overwrite historical SQL or ledger rows.
3. Rehearse those exact repairs against the restored schema, then verify anonymous, distinct members, revoked members and administrator behavior.
4. Perform real-account upload, save, reload and member-isolation acceptance before claiming activation.

The journal bucket exists and is private; an owner-folder upload policy exists. That inspection alone does not establish end-to-end media or private-file isolation. Issue #211 remains the activation tracker.

## Disposition of every older PR open at the start of this recovery

| PR | Disposition | Reason / retained work |
| --- | --- | --- |
| #297 | Integrated | Scrolling fix merged, published and exercised live. |
| #290 | Superseded; closed | Current Architect checks target the Ledger shell and consolidated navigation. |
| #288 | Superseded; closed | Root routing and reputation scope repairs are represented in current main; subsequent landing/design changes are intentional. |
| #287 | Superseded; closed | #293/#295 replace its older orange styling and tool catalog. |
| #277 | Contains useful remaining work; retained | PDF recovery is #300. Admin account-switch guards, metric presentation and connection-read visualization still need review. |
| #276 | Integrated; closed | Comment receipts, draft protection and tests recovered by #298. |
| #275 | Recovery tracked in #301 | Offline safeguards only; live activation remains #211. |
| #274 | Contains useful missing work; retained | Browser-first navigation/viewport/full-browser handoff differ from the current capture-focused panel. Recover selectively. |
| #273 | Superseded; closed | Current mobile, modal-focus, contrast and route checks supersede old Specter selectors/layout. |
| #258 | Integrated; closed | Receipt classification and tests recovered by #298. |
| #247 | Contains useful missing work; retained | Separate Chromium capture worker needs an authenticated gateway, egress/DNS isolation and deployment acceptance. |
| #241 | Recovery tracked in #302 | Consent-aware scoring connected to reviewed canonical CRM evidence. |

Original branch refs are retained. Closing a source PR does not certify production database activation or discard its branch. Older retained refs without an open PR are not automatically redundant; ancestry/patch scans are only triage, not behavior-level verification.
