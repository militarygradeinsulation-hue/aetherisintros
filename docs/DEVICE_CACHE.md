# Encrypted Device Cache for Ask Intros

Implemented from the attached device-cache package on October 26, 2026.

## Visible member behavior
- The real authenticated Ask Intros shell mounts one encrypted, per-account IndexedDB cache in both Social and Business View. The public demo does not activate it.
- Security & Privacy > Encrypted device cache contains a private working draft, local save status, pending count and a Sync now button.
- The draft is saved encrypted locally after typing stops for 900 ms. Until Drizzle 0100 is applied, it stays locally queued and shows a clear sync error rather than a false cross-device success.
- New devices pull the member's own changed context through two authenticated RPCs after the database rollout.
- Member logout asks before discarding unsent edits and attempts to wipe the encrypted account database before redirecting.
- Existing member_workspace_state sync, CRM, messages, introductions and Butler history remain canonical. This is an additional account-owned cache; the package does not alter those existing workflows.

## Code and SQL
- src/features/device-cache/: encrypted store, 6 allowlisted slice types, ordered outbox and guarded Supabase adapter
- drizzle/migrations/0100_member_context_sync.sql: idempotent member-context writes, change cursor, RLS and explicit grants
- scripts/device-cache-check/member_context.pglite.mjs: disposable Postgres isolation/idempotency test
- src/features/device-cache/deviceCache.test.ts: RPC/cursor/outbox unit tests

## Privacy and conflict model
Browser encryption at rest uses a non-extractable AES-GCM key stored in that member's IndexedDB; this is not protection against a compromised origin or browser extensions. The server copy is scoped to auth.uid() and strict known slices. The server only stores a snapshot when save('drafts', ...) is called.
No public feed or other member's private details are written to this cache.
Unsynced drafts are protected from pull overwrites. Retried mutation IDs are applied once. Sync cursors come from server time with 5 seconds overlap.

## Database release gate
0100 is a new forward-only entry in the Drizzle journal. **Do not** copy the original ZIP's `supabase/migrations/XXXX...` into the frozen Supabase history or run SQL out of order on production.
Confirm current Drizzle ledger, run the isolated PGlite tests and a real authenticated A/B account test, then apply the single journaled migration by the existing approved Drizzle recovery pipeline. Lovable publishing does not automatically prove the database RPCs exist.
Do not claim "cross-device synced" until read-back via ask_context_since shows a confirmed mutation from another device.

## Gradual rollout
Phase 1: private working draft and status, no new offline action handlers.
Phase 2: connect canonical own profile/preference snapshots only after duplicate-data reconciliation.
Phase 3: add idempotent wrappers for actual intro responses, outcome checks and capacity posts, followed by member permission tests.
Phase 4: decide whether to surface the device-only vault and a member-facing dead-outbox retry interface.

## Development checks
- npm exec -- vitest run src/features/device-cache/deviceCache.test.ts
- node scripts/device-cache-check/member_context.pglite.mjs
- npm exec -- tsc --noEmit
- scripts/migration-checks/journal-integrity.standalone.mjs

No Lovable AI editing credits used.