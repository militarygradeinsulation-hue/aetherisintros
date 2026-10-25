# Ask Intros People & HR

People & HR is an account-owned HR operations workspace integrated with Business Tools, My Work, onboarding guidance and Butler navigation. It builds on the Network Systems branch in PR #333. This implementation supplies eleven working record modules and contextual AI assistance. Production activation is separate from code completion.

## Tailoring

On first load, the server reads only the authenticated member's profile: company, industries, what the business does and location. A field-business description suggests a Field work model; otherwise Office is the editable starting suggestion. Team size is blank unless supplied. The owner reviews and saves the setup before recording personnel or using AI. Profile changes never overwrite reviewed HR context. Company text is context, never an authorization claim.

The saved work model changes onboarding checklist content. The HR Butler uses the saved company, industry, description, work locations, team size, priorities and business practices. Unknown information remains unknown. No example employees, jobs or operational metrics are seeded.

## Working modules

| Module | Implemented behavior |
| --- | --- |
| People | Add, edit, search and delete private employment records; roles, departments, managers, work locations, start dates and employment status. |
| Hiring | Editable role descriptions, work arrangements, compensation text, status and target dates. |
| Candidates | Associate applications with owned roles, track stages and job-related interview evidence. No AI ranking, selection or rejection. |
| Onboarding and exits | Preview a tailored checklist and save the tasks atomically. Assign responsibility, dates and manual completion; includes offboarding handovers and access reviews. |
| Time off | Date and hour requests with explicit status and a named decision maker for approval. No inferred leave entitlement or balances. |
| Policies | Editable policy text, draft/review/approved/retired status, reviewer and dates. Approval is internal owner recording, not a signature or employee acknowledgement. |
| Performance | Goals, observed work, employee feedback, development plans and review dates. No automatic employment decisions. |
| Training | Assigned learning, progress, credential/provider references and renewal dates. Completion is entered by the owner. |
| Benefits | Benefit catalog, provider details, eligibility text and renewal reminders. No provider enrollment or insurance transactions. |
| Payroll preparation | Hours, explicit regular/overtime rates and currency. Approved records export as CSV with gross estimates; no tax, deduction, entitlement or payment calculation. Currency values are not combined. |
| Documents | Save, review, edit, export and delete HR working documents, including AI drafts. |

Overview counts and due dates come from real saved records. Business setup, each record and all changes have optimistic versions; stale writes preserve the form and require review. Employee/job references must be owned by the same account. Referenced records cannot be deleted until dependents are reassigned or removed. Exports are explicit local downloads. CSV values are escaped against spreadsheet formula execution.

## HR Butler

Uses the existing server-only RouteLLM integration and requires `ROUTELLM_API_KEY`. No Lovable AI build messages or gateway fallback are used. The owner explicitly submits a question or chooses job description, interview guide, onboarding, policy, performance, workforce or offboarding drafting. Conversation context is bounded to eight messages; it is session-local until the owner saves an editable answer as a Document.

The server loads the account's confirmed business context. It does not attach employee, applicant, leave, performance or payroll records. The owner can voluntarily include job-related information in the submitted brief, with a visible provider consent control. The system prompt treats all supplied content as untrusted data, supplies no action tools, prohibits individual hiring decisions or invented facts, and distinguishes working drafts from decisions. There is no live legal retrieval tool; it must not invent legal citations or claim jurisdiction-specific compliance. Policy and pay questions need the appropriate current review.

Missing provider configuration disables generation without disabling manual HR operations. Provider failures preserve the question. Generated content remains editable and unsent until the owner saves a draft. No real provider call was made during testing.

## Storage and security

Migration `drizzle/migrations/0097_account_hr_workspace.sql` adds `hr_workspaces`, `hr_records` and `hr_audit`, with RLS and minimum grants. Members have owner-only SELECT when live membership is valid; direct member writes, truncation and reference privileges are revoked. A private authenticated dispatcher performs mutations, validates allowed fields and types, checks record links, serializes account writes and enforces versions. The public wrapper is security-invoker. No service role key is used by member requests. Responses set `Cache-Control: no-store`.

Account changes remount the workspace and stale responses are rejected. HR records are not added to public profiles, the member feed, shared company records or general assistant memory. Access is deliberately account-only: shared HR staff roles and employee self-service are not implemented. Account exports contain private HR information and should be handled accordingly. These fields are not a government-ID, medical-record or bank-detail vault.

The workspace is bounded to 1,000 records; activity shows the latest 50 metadata events. Audit events retain the operation, record ID, kind and timestamp, not previous personnel content. This is an operational audit trail, not a tamper-proof external archive. Deletes remove the record and retain audit metadata. No attachment storage, e-signature integration, payroll execution, tax filing or benefits carrier integration is claimed.

## Activation and verification

1. Merge the Network Systems migration dependency and this HR change in order. Preserve the forward-only Drizzle journal; the Supabase migration folder remains unchanged by this change.
2. Apply migration 0097 using the project's managed migration path described in `docs/MIGRATIONS.md`. Verify grants, RLS and function permissions after application.
3. Confirm two real account sessions cannot read or modify each other's HR records, including direct RPC attempts. Test expired sessions, membership removal, account switching, conflicts and linked-record deletion.
4. Verify the existing RouteLLM secret and explicitly test an anonymized HR question. Review provider handling and organization policy before entering real personnel information.
5. Review the browser screenshots in both themes, then publish the integrated build.

On October 25, read-only live inspection found no HR table or RPC. The project has a Drizzle migration ledger, but the connected Supabase tool returned permission denied for the actual project and no managed migration URL is configured locally. No live DDL, production HR records or migration-ledger changes were performed. The UI reports pending activation instead of pretending a save worked.

Validation completed locally: 1,033 unit tests across 179 files pass, including six role/state-machine SQL tests and five HR domain tests; production build passes. The browser harness covers profile tailoring, record create/edit, conflict-preserved drafts, hiring, seven-task checklist creation, approved payroll export, AI failure/retry and saved drafts, 84 section/viewport/theme combinations, and stale account response rejection. GitHub CI runs browser coverage separately and uploads mobile screenshots. See the PR for the final CI result.
