# Profile import ("Fill from LinkedIn")

Scope: **own-member onboarding** on the Executive identity page (`LinkedInImportPanel`). It fills the signed-in member's own profile draft. It is not a contact/Rolodex import: it never enrolls another person, creates a public member identity, or unlocks messaging, and it never reads app contacts, documents or conversations. Private contact import (Rolodex) is separate work and is untouched, and `CONTACT_EXPORT_POLICY.md` still applies (nothing here exports contact data).

## What works
- Paste profile text or add LinkedIn's own "Save to PDF" export, press **Scan**. The text is read by the built-in parser and, when `ROUTELLM_API_KEY` or `LOVABLE_API_KEY` is configured, by the existing AI gateway (extraction only).
- Only the member-supplied text is sent to the AI processor. It is delimited as untrusted data, the structured answer is validated (`parseAiProfile`), and any AI value not literally present in the supplied text is dropped (`groundProfile`). Each field shows its provenance (AI or built-in reader). The AI is not trusted to grant fields, consent or contact details.
- Supported fields: name, headline, current title/company, location, about, experience, education, skills (mapped to the existing profile fields), plus the LinkedIn URL if the member typed one. Email, phone, qualifications, missing dates and consent are never inferred; missing values stay blank and do not block saving.
- Scan only fills a **review draft**. Nothing is saved until the member presses Apply, which writes through the existing `updateIdentity` / `updateExecutiveProfile` and re-checks the signed-in user matches the scanning user. Drafts live in component state only (no localStorage, no payload logging).
- Rescans keep edited fields and offer the scanned value ("Use scanned value"); stale scan results and duplicate scan/apply clicks are ignored.

## Blocked: scanning from a URL alone
No authorized LinkedIn data source/licence is connected, and installed scraping tools are not assumed authorized. `scanLinkedInProfileUrl` validates the link (only `linkedin.com/in/<handle>`; no credentials, ports, other hosts or IP/network targets) and returns `blocked`. It performs no network fetch (so no redirect/SSRF surface), and the UI says a link alone cannot be scanned. To enable it, implement `LinkedInUrlProvider` (`src/aetheris/linkedin-import.ts`) for a licensed provider, set `available: true`, and pass it from the server function; the adapter result must then go through the same review draft.

## Limits
Authenticated server functions (`requireAuthContract`), 60k-character text cap, 10 scans per member per 10 minutes (in-memory per instance), 25 s AI timeout with parser fallback.

## Verification
`npx vitest run`, `npx tsc --noEmit`, `npx vite build` pass. `npm run lint` reports only pre-existing prettier style errors repo-wide. Not verified: real AI provider calls and the live save path (need credentials and a Supabase session); no real LinkedIn provider exists to test.

## Linked identity and public search review

A signed-in member can connect LinkedIn, then explicitly select available provider name, verified contact email, and allowlisted photo fields. Loading or linking never automatically applies them. Profile contact email does not change the authentication email. Each save targets the same authenticated member, protects selected fields against concurrent edits, and requires a matching saved-row receipt. Account changes clear consent and discard in-flight review results. Unselected fields stay unchanged.

Own-profile public search also requires consent and field-by-field review. Saving protects the saved name and headline used for searching, plus selected destination fields, with one optimistic write. Unsupported building suggestions remain review-only. A stale account, changed profile, or missing receipt requires a new review. Existing text/PDF scanning remains available; LinkedIn URL-only extraction still requires a licensed provider.

The identity browser harness exercises failed-save retries, per-field consent, account changes, concurrent edits and stale receipts at mobile/desktop sizes in light/dark themes. Real LinkedIn provider configuration and live OAuth completion require separate verification.
