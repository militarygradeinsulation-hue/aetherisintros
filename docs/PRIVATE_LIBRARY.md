# Private Library and Rolodex

The Pocket workspace contains the private Library. It uses separate `private_library_*`
tables and does not add imported people to `crm_people`, member search, introductions,
messaging, directory, feed, or assistant context. Imported records are labeled as private
imports and are always `unverified`.

## Privacy and sharing

`drizzle/migrations/0058_private_contact_library.sql` creates a private default workspace
for the signed-in member. RLS denies anonymous reads and writes; authenticated table access
is read-only. Import, sharing, and suggestion changes use owner-checked RPCs. An owner can
explicitly grant an authenticated account `read` or `edit` access to a workspace and revoke
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

## Migration and checks

Do not apply migrations in production from this task. Migration `0058` follows the
concurrently reviewed deal-workspace migration `0057`; deploy the pending migrations in
journal order after that migration is present, then verify the schema in an isolated
environment before any authorized data import. No user contact workbooks are included,
read, or committed here.

The migration authorization regression suite is:

```sh
node scripts/migration-checks/run.mjs private-library
```

It runs on the existing in-memory PGlite migration harness, not on a live database. The
synthetic client-side parser/normalization tests are:

```sh
npx vitest run src/aetheris/library/__tests__/import.test.ts
```

The private Library currently supports searching the selected workspace, viewing
provenance, explicit record-sharing permissions, and manually saving evidence-backed
enrichment suggestions. No licensed/approved automatic business or professional provider
is configured, so automatic enrichment must remain unavailable until that integration is
approved and privacy-reviewed.
