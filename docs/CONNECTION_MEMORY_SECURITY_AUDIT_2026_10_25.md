# Connection, Memory and security audit

Reviewed October 25, 2026 against main 72f7d29c, with subsequent non-overlapping social-asset changes preserved from 793a0a0f.

## Verified boundaries

The connected production catalog reports row security enabled on all exposed tables inspected. The member directory view uses security_invoker. Memory and workspace-state reads are owner-scoped. Google connection credentials are not included in authenticated column grants. All four inspected storage buckets are private. These catalog observations establish configuration, not complete multi-account API acceptance.

## Repairs in this release

- Add restrictive post, comment, reaction and Journal attachment visibility guards so legacy permissive rules cannot widen the intended read boundary. Attachments must belong to the author of the visible network post; merely copying another owner's file path does not grant access. The forward repair is repeatable, changes no member rows and preserves existing grants/policies.
- Require matching Memory save receipts, confirm trigger-suppressed duplicates through owner-bound readback, preserve failed drafts and keep unconfirmed automatic context out of retained Memory. Automatic learning respects the existing remember-actions and remember-conversations preferences. Scope labels accurately describe a sharing preference rather than claiming a private Memory row has been shared.
- Bind workspace, Memory and private-media operations to the initiating account token; discard stale results and clear previous account state on identity changes. Prevent stale membership lookups from restoring old access. Same-account auth refreshes retain mounted workspaces and drafts.
- Partition private media caches by viewer, invalidate avatar blobs on auth changes and use five-minute Journal URLs. Previously issued URLs remain subject to their existing expiration.
- Route arbitrary page reads through the existing fixed reader origin, validate targets, reject redirects from that origin, constrain publisher-image proxy origins and redirects, bound response bodies and AI durations, and validate Butler/news inputs. AI news analysis requires authentication and failures leave questions retryable.

## Validation

Local validation covers TypeScript, production build, unit tests, the unchanged Bridge snapshot, 1,624 canonical disposable database assertions and 16 new privacy-boundary assertions. The PDF binary fixture is unavailable through the text-only source connector locally; GitHub CI retains and runs that test. Final CI status and publication are recorded in the pull request.

## Remaining production acceptance

The live catalog lacks 22 tables and 117 routine names expected by current canonical Drizzle source. The inventory is a name comparison, not a complete migration or compatibility certification. Advanced feature families still require the established recovery procedure in docs/MEMBER_READINESS_2026_10_22.md and issues #211/#278: verified restorable backup or isolated restore, full catalog/ledger reconciliation, reviewed forward-only repairs and real member A/member B/unrelated/anonymous/revoked acceptance. Do not replay historical migrations or modify ledger history blindly.

The current public authentication settings report email and Google enabled, signup enabled, and LinkedIn OIDC disabled. Provider flags do not prove OAuth consent, calendar/Gmail synchronization, outbound delivery, AI credentials or production call transport. Those require authorized provider configuration and real workflow acceptance. The connected Supabase management account does not have access to the actual production project; the existing Lovable connection supplied read-only catalog evidence.

This audit must not be represented as an all-features-working or zero-issues certification.
