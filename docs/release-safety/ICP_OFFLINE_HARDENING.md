# Candidate 0095: offline security audit and validation

2026-10-20. Proposal only: no live SQL, founder grant, migration journal entry, or publication.

## Confirmed defect repaired in the candidate

The prior guard trusted a caller-writable custom GUC. A member could set `app.icp_reviewed_write` and directly INSERT an ICP row through the legacy column-level INSERT grant. The prior UPDATE regression failed on privileges and did not cover this exploit.

The candidate now checks the execution role, real caller identity, actual private grant, and the marker together. A restrictive INSERT policy independently rejects ICP inserts by authenticated callers. The trigger remains SECURITY INVOKER; changing it to SECURITY DEFINER would invalidate the execution-role defense. General SECURITY DEFINER workspace saving still refuses every `icp:%` key. Direct service-role writes are refused by the trigger too; a privileged DBA able to disable triggers is outside the application threat boundary.

## Additional candidate-only repairs

- Definer search paths are `pg_catalog, public, pg_temp`; application tables and role/grant functions are schema-qualified. Temporary CRM shadowing is tested with TEMP explicitly granted only inside the disposable fixture.
- The new grant references canonical `public.profiles`, not managed `auth.users`; account deletion still cascades and is tested. Unique capability index remains single-owner; no production account is seeded or granted.
- NULL keys, extra person fields, invalid stored statuses and initial `new` writes are rejected. Transition checks fail closed rather than accepting NULL expressions.
- Profile arrays require 1–20 complete UI-shaped profiles, unique IDs, supported objectives, bounded strings, booleans and integer fit thresholds 0–100.
- Direct reviewed saves enforce the existing unsupported-familiarity/promotion/link checks and cross-person contacted-note uniqueness, not only the app check.
- A per-owner advisory lock serializes note review/contact writes, alongside the existing per-key lock. Canonical CRM person rows are locked before changed saves to prevent archive/delete races during mutation.
- Exact-payload retries at saved or just-previous version remain no-ops with no new history; this preserves the established lost-response contract. Returning an already stored value is not a new contact action. It does not claim the caller's device actually sent anything.
- Existing non-ICP key allowlist, save return shape, optimistic concurrency and delete behavior are unchanged.

## Validation

- **54 candidate checks PASS** on pinned PGlite 0.2.17 (previously 36): includes forged INSERT for founder/ungranted admin/member, no poisoned initial row, malformed/extra payloads, duplicate IDs, threshold bounds, direct-RPC promotional/familiarity/duplicate-note refusal, temporary table shadowing, corrupted legacy status rejection, initial retry and account cascade.
- **25 prior release-safety checks PASS** in the disposable engine.
- **686 application/recovery tests PASS** in 109 files (681 existing + 5 recovery tests).
- Source app and historical migrations are unchanged by this pass.

## Not established

This is not production deployability. Both live ledgers and an authorized schema-only export are still required. Existing grant rows/schema and index identity must be audited before rollout; `IF NOT EXISTS` is not proof that pre-existing definitions match the proposal. The key-constraint replacement requires an existing-row compatibility scan and acquires a table lock. Applying candidate SQL must be one atomic tool transaction, with the privileged grant a separate approved step.

PGlite uses one serialized connection here; true concurrent multi-session behavior and PostgreSQL lock contention are **not tested**. No signed-in owner UI, actual LinkedIn send, hosted Data API permissions, or live production tests are claimed. UI/server owner gate remains unchanged and fail-closed; it requires `has_private_owner_grant` to exist and return exactly true. LinkedIn actions remain manual navigation and manually confirmed statuses, with no send integration.

The current platform harness supplies structure, not service delivery. Automatic project compilation reports are checked separately; no manual build or typecheck command was run in this engineering pass under the harness rules.
