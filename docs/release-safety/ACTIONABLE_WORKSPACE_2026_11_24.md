# Actionable workspace stage — November 24, 2026

This stage is independent of production deployment and uses existing member
tables and existing authenticated RLS. No production data, schedules or schema
are changed by these commits.

## New feature boundaries
- Directory: bounded 30-row pages; all loaded members remain searchable.
  Search/filter/page preferences live in the account-keyed parent for the
  current session. No private query text is written to browser storage.
- Executive brief: on-demand sample of member-authored introduction outcomes.
  Deduplicates introduction IDs. It does not establish audited financial ROI.
- Report import: user-supplied, versioned JSON format documented in the UI.
  No direct Aetheris API retrieval, no automatic enrichment, no external AI.
  Each approval writes one canonical CRM task or unquantified opportunity.
  Same owner + report reference + finding ID + action kind yields a stable ID.
  A retry never overwrites an existing record.
- Executive brief review task: approval re-reads currently authorized evidence
  and rejects a changed or missing source. No messages or consent actions.
- Butler: existing read-only assistant tools stay read-only; the approved
  actions are separate authenticated endpoints. Request counters are not
  billing measurements.

## Runtime cost controls (optional server environment)
- ASK_INTROS_BUTLER_MAX_REQUESTS: default 8, permitted 2–8. Shared across
  RouteLLM and Lovable AI provider attempts for the Ask Intros text assistant.
- ASK_INTROS_BUTLER_MAX_TOOL_READS: default 16, permitted 2–32. Counts uncached
  reads; cache hits do not consume another read.
- ASK_INTROS_ALLOW_LOVABLE_AI=false: opt out of the Lovable *runtime AI*
  provider for this assistant, including fallback. Default preserves existing
  provider availability. This is not the Lovable build-credit setting.
- Other AI endpoints, cross-request quotas, cost ledger and measured device
  performance remain future work. No environment variable was modified here.

## Release gates
Full CI, migration replay and recovery checks, production catalog/backup and
coordinated migration preflight where needed, verification of Lovable's synced
Git SHA, then explicit publish and live smoke checks. No build agent invocation.
