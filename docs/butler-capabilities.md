# Butler capabilities

Butler uses the signed in member's request credentials. Conversation turns and approved writing preferences are stored privately in the existing memories table. Conversation history can be reopened and paginated; account switching clears local state. Failed saves are surfaced for retry.

Butler can search the public web with source links, read the member's own profile, CRM contacts, opportunities, tasks, posts and memories, and use uploaded material to answer questions and prepare drafts. Existing navigation commands remain available. Reviewed drafts can publish a network post, create a CRM task or save writing preferences. Email drafts can be copied; sending email requires a separate sending integration. This is not unrestricted control of every application.

Uploads support PNG, JPEG, WebP, PDF text, DOCX text, XLSX, TXT, Markdown, CSV, TSV and JSON. Limit: three files, 8 MB each. Text extracts are limited to 20,000 characters. PDFs include up to 30 pages and exclude scanned content. Workbooks include up to ten sheets and 300 rows per sheet using cached formula results. Images are resized to 1600 pixels. Attachment excerpts are saved with the conversation; original binaries are not retained and images must be attached again for later visual analysis.

Generated data can be downloaded as TXT, Markdown, CSV, JSON or XLSX. Workbook exports contain plain values only. Posts and tasks show editable previews and are written only after the member clicks the corresponding action. Successful writes use database receipts and stable IDs to avoid duplicate submissions.

## Validation

Run `node scripts/butler-check/run.cjs` with project dependencies installed. It exercises private history, account isolation, idempotent writes, read tool ownership predicates and attachment rejection/limits using deterministic mocks.

Changed TypeScript files passed targeted type checking. Full installation/build is currently blocked by a preexisting manifest/lockfile mismatch. Browser verification was unavailable in the execution environment. Production database policies were inspected read only; no production posts or tasks were created during validation.
