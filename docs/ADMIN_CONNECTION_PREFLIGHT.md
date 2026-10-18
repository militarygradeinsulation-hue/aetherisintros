# Administrator connection preflight

The existing Launch Control page now includes **Check the deployed connections**. A confirmed signed-in administrator can run seven existing read-only RPCs on demand: owner overview, network health, current-account membership, provider directory, own provider requests, provider inbox and shared Opportunity Exchange. This adds no database migration or new authorization path.

The report distinguishes verified reads, inactive membership, missing database objects/schema cache, denied access, invalid responses, timeouts and unavailable transport. Empty valid lists are valid reads. Missing responses are never converted to plausible healthy counts. Each transport is aborted after ten seconds. Changing accounts, losing admin access or unmounting cancels the run; another account cannot inherit its results. No check runs automatically and concurrent clicks do not start duplicate runs.

Only the diagnostic classification and timestamp are retained in the panel. No returned member records, raw errors, credentials, provider IDs or message bodies are included. Existing RPC permissions remain authoritative; the panel cannot grant roles or bypass membership or row security.

**Read verified** certifies that one existing RPC returned a valid response to the current account at that time. It does not certify write paths, signup, another member's privacy boundaries, or Google/ElevenLabs integrations. Follow the release acceptance checklists for those workflows. Missing `list_exchange_opportunities` may indicate migration 0090 has not been applied or the API schema cache needs reloading. Do not infer production migration state from a source merge.

Validation: TypeScript, unit tests, build, targeted ESLint, and `node scripts/admin-connections-check/run.mjs` (fixture-based role transitions, diagnostic states, account isolation, cancellation, raw-error redaction, mobile light/dark contrast and overflow). The browser test is included in Checks CI. Production connection results require running the panel against the deployed signed-in account; local fixtures are not production evidence.
