# Ask Intros: safe innovation and release queue

This is a planning-only change. It adds no runtime code, permissions, database migrations, external services, or deployment dependencies.

## Release gates

- Require green CI, CodeQL, browser and migration checks for every runtime PR.
- Do not ship an interface that calls an unapplied database migration.
- Recheck conflicts after each merge; do not force-merge stale branches.
- Confirm Lovable commit synchronization and separately verify the published deployment.
- Run authenticated member smoke tests for sign-up, messaging, introductions, and access boundaries.

## Product improvements, ordered by value and low deployment risk

1. **Introduction clarity:** show the recipient, purpose, consent state, and next step before submitting; avoid duplicate requests. Reuse existing introduction records.
2. **Opportunity evidence:** explain why each opportunity matches a member's demonstrated skills, including source and uncertainty. Avoid unsupported scoring claims.
3. **Relationship follow-through:** show a concise next-action checklist after a successful introduction. Reuse existing CRM tasks and message threads.
4. **Accessible reliability:** audit contrast, keyboard focus, truncation, mobile layouts, and offline feedback in both themes.
5. **Member trust:** expose clear profile visibility and consent explanations; never reveal private contact data without authorization.
6. **Owner insight:** summarize funnel stages and failed operations using existing authorized telemetry, without granting wider data access.

## Safe implementation pattern

For each improvement, first inventory the existing component, API, and tests; avoid duplicate modules. Implement the smallest frontend-only enhancement possible, with a feature flag if dependent on an optional service. Add unit and browser regressions, validate against production-equivalent permissions, and release independently. Keep any database changes in a separate reviewed migration-first PR.

## Current known blockers to revisit

- PR #203 requires migration 0093 to exist in production before its allowance UI can ship.
- PR #205 requires social metadata question-count correction and rebase/conflict repair after PR #204 merged.
- PR #204 was merged to main; confirm the corresponding Lovable publish separately.
