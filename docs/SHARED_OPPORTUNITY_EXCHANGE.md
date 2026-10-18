# Shared Opportunity Exchange

The live Opportunities page uses authenticated database RPCs backed by the existing `professional_opportunities` envelope. `/demo` retains its illustrative workspace. Historic private workspace content is not automatically published to other members.

## Database release

Apply reviewed migrations in journal order through **0090_shared_opportunity_exchange** using the established database release process. Code merge alone does not apply the migration. Until installed, the live page reports unavailable and does not substitute sample records. Confirm the existing envelope has the expected id/owner_id/scope/data/created_at/updated_at columns before deployment.

0090 preserves the canonical envelope and introduces only two subordinate tables: viewer-specific saves and private interest responses. Direct authenticated table access is revoked; the three RPCs check the actual live membership gate. The private helper cannot be executed by clients. Public/network posts are visible only to eligible signed-in members while the owner remains eligible; confidential, connections-scoped and private legacy posts remain owner-only. Posting initially supports network and private visibility. No automatic messages or invitations are sent.

The publisher derives owner identity from the session and stores only the supported fields. Database actions serialize on the opportunity row; interest retries do not duplicate or overwrite a response. Only owners close posts. Closed/expired posts reject interest server-side. Saves are independent for each member. The list returns at most the 100 most recent visible posts, and returns interest only to the poster and that response's author.

## Validation

- `npx tsc --noEmit -p .`
- `npx vitest run`
- `npx vite build`
- `node scripts/migration-checks/run.mjs` (includes 24 exchange checks using the real migrated membership gate)
- `node scripts/exchange-check/run.mjs` (browser RPC fixture; not a production connectivity test)
- Targeted ESLint on the new source files.

The browser check exercises posting, per-member saves, response drafts requiring completion, private response UI, account changes, reload, closing, backend failure, mobile overflow and light/dark field contrast. The database suite verifies actual isolated Postgres permissions and invariants separately.

## Production acceptance still required

Use two confirmed, onboarded member accounts and an unrelated third account: A posts, B responds and saves, A reads the response after reload, and C cannot read B's private response or affect B's saved state. Verify revoked/nonmember denial, owner-only close, expired rejection and theme rendering in the deployed shell. Check #168 for remaining live verification.

If rollout fails, revert the UI routing commit to restore the prior workspace surface while investigating. Keep the forward migration and stored member data; do not drop the new tables as a rollback. The existing generic remote Pro adapter should not be enabled wholesale: it lacks the exchange's field mapping and privacy contract.
