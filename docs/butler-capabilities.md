# Butler capabilities

Butler uses the signed in member's request credentials. Conversation turns and approved writing preferences are stored privately in the existing memories table. Conversation history can be reopened and paginated; account switching clears local state. Failed saves are surfaced for retry.

Butler can search the public web with source links, read the member's own profile, CRM contacts, opportunities, tasks, posts and memories, and use uploaded material to answer questions and prepare drafts. Existing navigation commands remain available. Reviewed drafts can publish a network post, create a CRM task or save writing preferences. Email drafts can be copied; sending email requires a separate sending integration. This is not unrestricted control of every application.

Uploads support PNG, JPEG, WebP, PDF text, DOCX text, XLSX, TXT, Markdown, CSV, TSV and JSON. Limit: three files, 8 MB each. Text extracts are limited to 20,000 characters. PDFs include up to 30 pages and exclude scanned content. Workbooks include up to ten sheets and 300 rows per sheet using cached formula results. Images are resized to 1600 pixels. Attachment excerpts are saved with the conversation; original binaries are not retained and images must be attached again for later visual analysis.

Generated data can be downloaded as TXT, Markdown, CSV, JSON or XLSX. Workbook exports contain plain values only. Posts and tasks show editable previews and are written only after the member clicks the corresponding action. Successful writes use database receipts and stable IDs to avoid duplicate submissions.

## Validation

Run `node scripts/butler-check/run.cjs` with project dependencies installed. It exercises private history, account isolation, idempotent writes, read tool ownership predicates and attachment rejection/limits using deterministic mocks.

Changed TypeScript files passed targeted type checking. Full installation/build is currently blocked by a preexisting manifest/lockfile mismatch. Browser verification was unavailable in the execution environment. Production database policies were inspected read only; no production posts or tasks were created during validation.

## Images and spoken approvals

Members can ask Butler to create an image with a clear request, such as "create an image of a city skyline." It calls the existing server-side OpenAI image configuration, not the Lovable editor, and shows a session-only, labeled image preview. Members may download it or attach it as a reference to a later Butler question. Images are not posted, written into conversation history, or saved to a shared library by generating them. Generated image references sent to Butler use the existing bounded image attachment conversion. Generating or editing from an uploaded source image is not available; Butler must clearly state that limitation.

Members can ask to show source-linked images for a subject. Butler uses a fixed-origin Wikimedia Commons search, presents permitted preview formats with their source and available license label, and links to the original page so the member can review attribution and reuse terms. No arbitrary server-side image fetch is permitted and external reference previews are not automatically downloaded or published. Image providers and Wikimedia may be unavailable or blocked in some environments.

A signed-in member can ask by voice to approve a currently visible, reviewed draft post, task or writing preference. Butler asks for an exact second command ("confirm publish", "confirm save task", or "confirm save style"). Authorization is bound to the signed-in account, immutable draft ID, draft type and text, expires after one minute and is cleared on editing, changing accounts or conversations, or an unrelated command. An exact confirmation executes through the existing authenticated idempotent draft-write endpoint, and the private Butler conversation stores the receipt. Saying "yes", an audio clip on a page, an AI response, a file attachment or an unrelated action never grants approval. No payments, account deletions, arbitrary automations, outbound messages, or third-party posts can be voice approved through this flow.

The per-instance image generation cooldown reduces accidental repeated requests but is not a global cost quota. Configure provider-side rate limits, billing controls and API credentials separately. New UI tests should verify live image returns, blocked provider states, light/dark contrast, microphone permission, speech playback isolation, and cross-account cancellation before asserting production acceptance.
