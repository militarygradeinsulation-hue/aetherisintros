# Evidence loop release

Scope: an initial private time ledger, opt-in shared-outcome ranking and relevant newcomer exposure. Six other requested product additions remain explicit roadmap items.

## Authority and activation

Migration 0098 is journaled but must be activated through the existing managed Drizzle rollout after reconciling production migration history. Do not execute this file through a direct live SQL tool. `evidence_workspace` and `match_evidence_signals` must both exist before activation is described as complete. Missing contracts disable the new workspace and remove evidence adjustments; existing network operation remains available.

The rehearsal uses a disposable baseline. The full migration harness now imports historical 0001 unchanged for recommendation dependencies and includes Auth's canonical `created_at` field. This is not a production dump or a production compatibility certificate.

## What the numbers mean

- Timers are explicitly started and completed by members. Device-observed active seconds exclude hidden tabs and idle periods over 60 seconds. Reloaded incomplete sessions cannot be estimated into completed tasks. One active task per account and server wall-time bounds prevent overlapping or impossible submissions. A client duration is not independently audited telemetry.
- Baselines are member-supplied estimates or medians of their own comparable timed observations. At least three reported observations qualify for the observed-comparison bucket. These are neither causal savings nor net savings. Negative differences stay negative. No aggregate sales claim is produced.
- Only mutually shared, agreeing terminal outcomes from mutually ranking-consenting participants count. Private notes, dollar values and counterpart identities never leave the ranking RPC. Repeated introductions to one partner count once; the latest agreed pair is used. Evidence expires with the introduction's one-year horizon and withdrawals/consent changes affect subsequent reads.
- At three distinct partners, the weight is `0.12 * n / (n + 5)` taken from the prior 0.24 relevance weight. The outcome score is `100 * (positive + 2) / (n + 4)`. Maximum transferred weight is 0.12. Missing or invalid evidence transfers zero. This ranks potential conversations, not employment suitability.
- Newcomer eligibility uses Auth account creation plus explicit opt-in, recorded relevance and availability. Matching lists reserve the third slot of each five where eligible candidates exist and rotate daily. The Social host has an additional newcomer recommendation outside the unchanged Bridge snapshot. No fit-score inflation, universal impression guarantee, job guarantee or candidate-screening decision is implied.
- Vouches are visible recipient-approved recommendations by approved verified members. They provide only a small starter-trust contribution capped at 30 within the existing 18% trust component. Historical display flags require reconfirmation; author edits clear approval. Approval can be revoked.

## Verification

Run the domain/RLS suite, complete TypeScript/unit/build checks, migration rehearsal, `scripts/evidence-loop-check/run.mjs`, and Bridge parity. Browser fixtures are local and labeled; no live messages or member records are created. Verify the real opt-in flow with a consenting account after the managed database rollout before claiming the system is activated.
