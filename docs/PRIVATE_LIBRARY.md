# Private Library and Rolodex

The Pocket workspace contains the private Library. It uses separate `private_library_*`
tables and does not add imported people to `crm_people`, member search, introductions,
messaging, directory, feed, or assistant context. Imported records are labeled as private
imports and are always `unverified`.

## Privacy and sharing

`drizzle/migrations/0058_private_contact_library.sql` creates a private default workspace
for the signed-in member. Migration `0059_contact_export_denial.sql` removes direct reads of
contact and suggestion tables, including by `service_role`, and exposes only a bounded search
(maximum 50 summary rows per page) and single-record detail/suggestion RPCs. Import, sharing,
and suggestion changes use owner-checked RPCs. A separate backend RPC always denies contact
export for authenticated callers. An owner can explicitly grant an authenticated account
`read` or `edit` access to a workspace and revoke
that access. No access is shared automatically. Do not enable provider lookups that transmit
private emails or phone numbers; the current automatic enrichment provider is unavailable.
The manual suggestion form accepts a public HTTPS source without credentials, query strings,
or fragments and requires field-level URL and valid timestamp evidence. Suggestions are stored
separately and update only the selected fields after explicit acceptance.

## CSV and XLSX upload

From **Pocket → Private Library**, select a CSV or XLSX workbook. Workbooks show each
non-empty sheet separately, preserve original column labels and values, and report the
source sheet and row. Use the mapping controls to correct automatic matches, review all
warnings/errors, and explicitly choose to keep or skip duplicate candidates before import.
Rows with validation or persistence errors are not silently dropped; a private batch report
retains their source sheet, row and recoverable error. Re-uploading an identical file into
the same workspace is idempotent by SHA-256 file hash and source-row key.

Mapped records retain the following normalized fields; original source cells are also
retained in `original_columns`:

```text
record_type,name,phone,email,business,title,location,website,industry,
raw_contact_person,source_file,source_sheet,source_row,source_reference,
dnc_status,verification_status,duplicate_candidate
```

The importer recognizes common variations including `Company`, `Company Nmae`,
`Organization Name`, `Account Name`, `Full Name`, first/last name, title/job title,
phone/phone number/phone #, email/email address, web URL/website, physical address,
source/content/lead source, and DNC check/status. Company-only/account rows remain
organizations; `Assigned To` is never treated as a contact. Generic company/contact text is
not split into a person or title. Review the raw contact-person value and warnings instead.
CSV/TSV/text files with a header and rows are accepted. If a malformed or unsupported XLSX
cannot be read, save/export it as normalized CSV and retry.

Duplicate candidates are review flags, not merge/delete operations. An identical source
row is flagged; same-name records require corroborating company/email/phone (people) or
website/industry-and-location (organizations). A shared phone/email alone or name alone
never establishes identity. DNC text is retained; missing status stays `unknown`, and
importing is not consent for outreach.

## Contact export enforcement and coverage

`docs/CONTACT_EXPORT_POLICY.md` is the policy source; the document alone is not enforcement.
The backend denial RPC is called by supported contact-bearing downloads: network CSV/print
reports, CRM contact/lead/account/opportunity/activity/sales CSVs, the account JSON export,
linked or contact-shaped Grid CSVs, relationship/opportunity Vault previews and downloads,
attendee CSVs, and cohort invite CSVs. Contact export grants are not a supported workspace
permission. Direct reads of Library contact/suggestion tables fail even if a caller bypasses
those controls.

Original upload bytes are parsed in the browser and are not retained in Library object storage;
there is no Library original-file download endpoint. A repository audit found no Library export
endpoint, contact-list attachment generator, scheduled Library export job, or configured bulk
CRM/provider transfer path. The existing direct-message file channel did support spreadsheet
attachments; migration `0059` now rejects CSV/TSV/XLS/XLSX/XLSM/ODS storage uploads and denies
downloads of those already stored extensions for all DM participants. Other authorized document
attachments still work. This extension-based block does not inspect arbitrary file contents.
Pocket idea JSON and membership-card image downloads remain unrelated individual deliverables,
not Library contact exports.

The current Library schema supports personal owners and explicit `read`/`edit` workspace
shares; it has no separate company-admin or AI-agent permission role. Export denial is
unconditional and is not affected by broader application roles. `service_role` no longer has
direct record/suggestion table privileges, and authenticated functions do not grant contact
export.

The migration regression suite tests direct-table denial, the always-deny RPC across owner,
admin, viewer/guest and outsider principals, forged permission grants, paginated search,
single-record details, suggestions, imports, cross-user isolation, and DM spreadsheet upload
and download restrictions while retaining PDF attachment access. Unit tests exercise the CRM
CSV and network-report helper guards. There is no runtime browser integration test for every
legacy route, and no external job/provider integration exists here to execute; those paths are
explicitly not claimed as runtime-tested. Manual copying, screenshots, file renaming, and
browser printing outside the application's supported actions cannot be prevented by these
controls.

## Migration and checks

Do not apply migrations in production from this task. Migrations `0058` and `0059` follow the
concurrently reviewed deal-workspace migration `0057`; deploy pending migrations in journal
order after that migration is present, then verify the schema in an isolated environment
before any authorized data import. No user contact workbooks are included, read, or committed
here.

The migration authorization regression suite is:

```sh
node scripts/migration-checks/run.mjs private-library
```

It runs on the existing in-memory PGlite migration harness, not on a live database. The
synthetic client-side parser/normalization tests are:

```sh
npx vitest run src/aetheris/library/__tests__/import.test.ts src/lib/__tests__/contact-export.test.ts
```

The private Library currently supports paginated searching the selected workspace, viewing
provenance, explicit record-sharing permissions, and manually saving evidence-backed
enrichment suggestions. No licensed/approved automatic business or professional provider
is configured, so automatic enrichment must remain unavailable until that integration is
approved and privacy-reviewed.
