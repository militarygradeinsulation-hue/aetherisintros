# Reverse marketplace implementation status

## Delivered in this branch

`src/aetheris/marketplace/contract.ts` is a UI- and storage-independent contract slice with synthetic unit tests:

- Request input shape for scope/outcome, category, broad location and remote eligibility, capabilities, hard requirements/preferences, buyer questions, optional budget/currency, separate delivery and application-closing dates, response cap, and approved-member or invited-provider audience.
- Strict public-request field allowlisting; private notes, contact details, source conversations, and attachment metadata are not accepted as request fields.
- Structured response validation for approach, evidence references, availability, pricing basis, assumptions/exclusions, question answers, and explicit confirmed/unknown requirement claims. A confirmed claim needs an evidence reference; the code does not infer qualifications or calculate scores.
- Pure lifecycle predicates, request-version acknowledgment checks, single-selection checks, response-capacity preflight, and retry/provider uniqueness checks.

These TypeScript helpers are not persistence or authorization. In particular, the preflight cannot serialize concurrent submissions; only a database transaction can guarantee final-slot allocation, idempotency, database-clock closing, or immutable published versions. The helpers are not currently called by a live request or response UI.

## Integration gates and migration coordination

This integration branch contains the work from PRs #43–#49. The migrations that were advertised with conflicting numbers by their PRs have been renumbered into one sequence (see `docs/integration-status.md`):

| PR  | Related existing work                                            | Migration in the integration branch                                      |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| #43 | Need/Offer/Proof-of-work feed posts                              | `0057_business_posts.sql`                                                |
| #44 | Authenticated deal workspaces and buyer/provider role amendments | `0058_deal_workspaces.sql`, `0059_deal_workspace_business_roles.sql`     |
| #45 | Private Library/Rolodex                                          | `0060_private_contact_library.sql`, `0061_contact_export_denial.sql`     |
| #46 | Project blueprint/proposal workbench                             | `0062_business_execution_workbench.sql`                                  |

The reverse marketplace itself has no migration, no persistence and no UI; it remains **blocked**. Any future marketplace migration must take a new unique number after `0062` and add its isolated-database migration suite. Supabase migrations are frozen history. No migration or live database write is included here.

The base already has private DMs and a generic `asks` feed. The `ProfessionalOpportunity`, `MarketplaceListing`, and `DealRoom` surfaces in `src/aetheris/domain/` are part of the local Pro layer; `createLocalProLayer()` seeds demo collections in showcase mode and otherwise uses member-local state with generic workspace sync. They are not the authenticated, procurement-scoped request/response/deal APIs required by this feature. The current `DealRoomsPage` also reads the Pro store. Reusing those as a production procurement backend would grant no verified access model.

Member eligibility must use the current approved-and-verified gate (`isLiveMember`); company/admin status is not procurement authorization. Contact export remains prohibited by `docs/CONTACT_EXPORT_POLICY.md`. No response submission should open a DM or expose contact data; use only a confirmed conversation/deal-workspace contract after the related backend is available.

## First-release requirements not implemented here

| Requirement                                                                                                                     | Status                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Guided buyer composer, draft preservation, management/discovery/detail UI                                                       | Not implemented; requires a persisted request API and must integrate with the Need post work rather than replace its composer |
| Immutable published request versions, private invitation acceptance/preview, audience/search-count redaction                    | Not implemented; requires database/RLS and invite-specific reads                                                              |
| Buyer/provider parties, approved-member checks, authorized company representation, no buyer self-application                    | Not enforced; TypeScript types are not an identity or role boundary                                                           |
| Private responses, one active response per provider, transactional capacity allocation, database-clock close, idempotent writes | Not implemented; preflight helper is advisory only                                                                            |
| Changed-version acknowledgment and exact-version selection                                                                      | Predicate only; no persisted versions, approvals, or selection event                                                          |
| Buyer comparison/shortlist/decline/reopen UI; request-scoped clarification                                                      | Not implemented                                                                                                               |
| Restricted file grants, bounded private uploads, blocking/reporting, rate limits, append-only private-payload-free history      | Not implemented                                                                                                               |
| Buyer-authorized conversation opening and handoff to an accepted-role/versioned deal workspace                                  | Blocked on confirmed #44 interfaces; no handoff is made                                                                       |
| Backend no-export controls, distinct-user database tests, real Supabase/browser tests                                           | Not implemented or run                                                                                                        |

## Validation status

The added Vitest suite covers the pure contract and transition helpers only. It cannot establish RLS, grants, database-clock behavior, transaction races, persistence, cross-user isolation, revocation, upload grants, or browser integration. The GitHub Checks run for this branch reported `action_required` with zero jobs; the log endpoint reported no failed jobs. This is not a passing CI run.

After migration sequencing and backend integration, run the repository's unit/build/lint checks and `node scripts/migration-checks/run.mjs <marketplace-suite>` on the isolated PGlite harness, then run distinct-user checks against an isolated Supabase environment and authenticated browser journeys. Never run these migrations or test writes against production.
