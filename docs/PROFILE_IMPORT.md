# Profile import ("Fill from LinkedIn")

Scope: **own-member onboarding** on the Executive identity page (`LinkedInImportPanel`). It fills the signed-in member's own profile draft. It is not a contact/Rolodex import: it never enrolls another person, creates a public member identity, or unlocks messaging, and it never reads app contacts, documents or conversations. Private contact import (Rolodex) is separate work and is untouched, and `CONTACT_EXPORT_POLICY.md` still applies (nothing here exports contact data).

## What works
- Paste profile text or add LinkedIn's own "Save to PDF" export, press **Scan**. The text is read by the built-in parser and, when `ROUTELLM_API_KEY` or `LOVABLE_API_KEY` is configured, by the existing AI gateway (extraction only).
- Only the member-supplied text is sent to the AI processor. It is delimited as untrusted data, the structured answer is validated (`parseAiProfile`), and any AI value not literally present in the supplied text is dropped (`groundProfile`). Each field shows its provenance (AI or built-in reader). The AI is not trusted to grant fields, consent or contact details.
- Supported fields: name, headline, current title/company, location, about, experience, education, skills (mapped to the existing profile fields), plus the LinkedIn URL if the member typed one. Email, phone, qualifications, missing dates and consent are never inferred; missing values stay blank and do not block saving.
- Scan only fills a **review draft**. Nothing is saved until the member presses Apply, which writes through the existing `updateIdentity` / `updateExecutiveProfile` and re-checks the signed-in user matches the scanning user. Drafts live in component state only (no localStorage, no payload logging).
- Rescans keep edited fields and offer the scanned value ("Use scanned value"); stale scan results and duplicate scan/apply clicks are ignored.

## Public-index URL autofill (Mindprint source comparison, October 26, 2026)
MINDPRINT's `src/lib/mindprint/autofill.functions.ts` searches public Firecrawl v2 search results and optionally fetches surrounding *public* sources, then sends a bounded corpus to its Lovable AI gateway. This is **not** a LinkedIn authenticated profile API and does not retrieve private profile sections. Mindprint's connector adapter also reports that live LinkedIn partner retrieval is unavailable.

Ask Intros now provides `Scan public link` in the member's own LinkedIn import panel. This optional path:
- Requires an authenticated member, a profile URL, a positive self-ownership/consent checkbox and per-member rate limiting.
- Sends an index-only query to Firecrawl when `FIRECRAWL_API_KEY` is configured on **Ask Intros** (never automatically reuses Mindprint's secrets). Otherwise, or on provider failure, falls back to the existing free public search.
- Retrieves **only search-index titles and snippets**. It never fetches `linkedin.com` pages, signs in with a LinkedIn cookie, collects passwords, bypasses a block or accesses a private profile.
- Requires an indexed result matching the member's **exact LinkedIn URL** and checks the owner's existing profile name and saved URL. Other sources must have public HTTPS URLs and contain the same professional name and headline.
- Extracts a modest title/name/company fallback; when `OPENAI_API_KEY` is configured, a separate OpenAI Responses request can propose additional **verbatim grounded** fields from those snippets. It does **not** use `LOVABLE_API_KEY` or consume Lovable AI editor credits.
- Displays the source URLs, warns the data may be incomplete or outdated, and places every suggestion in the **existing field-by-field review**. Nothing is saved unless the same member selects Apply; owner and concurrent-edit protections still apply.
- Is **not available for CRM contact imports, prospect enrichment, demo profiling, or third-party batch scans**. The manually pasted text and member-exported PDF remain the best sources for complete experience and education.

This makes URL-only autofill possible **where an accurate indexed result exists**, without pretending that LinkedIn OIDC exposes headline, employment history or posts. A private/licensed LinkedIn profile API would be a separate integration requiring partner approval and member consent. API cost, production configuration, index availability and actual authenticated end-to-end acceptance remain deployment gates. Rate limiting is instance-local and must be replaced with durable per-account budgets before high-volume rollout.

`scanLinkedInUrl` with the existing `NO_URL_PROVIDER` intentionally remains blocked: it represents a direct LinkedIn connector, which is still not available. The new public-index action is separate and truthfully labeled.

## Limits
Authenticated server functions (`requireAuthContract`), 60k-character text cap, 10 scans per member per 10 minutes (in-memory per instance), 25 s AI timeout with parser fallback.

## Verification
`npx vitest run`, `npx tsc --noEmit`, `npx vite build` pass. `npm run lint` reports only pre-existing prettier style errors repo-wide. Not verified: real AI provider calls and the live save path (need credentials and a Supabase session); no real LinkedIn provider exists to test.

## Linked identity and public search review

A signed-in member can connect LinkedIn, then explicitly select available provider name, verified contact email, and allowlisted photo fields. Loading or linking never automatically applies them. Profile contact email does not change the authentication email. Each save targets the same authenticated member, protects selected fields against concurrent edits, and requires a matching saved-row receipt. Account changes clear consent and discard in-flight review results. Unselected fields stay unchanged.

Own-profile public search also requires consent and field-by-field review. Saving protects the saved name and headline used for searching, plus selected destination fields, with one optimistic write. Unsupported building suggestions remain review-only. A stale account, changed profile, or missing receipt requires a new review. Existing text/PDF scanning remains available; LinkedIn URL-only extraction still requires a licensed provider.

The identity browser harness exercises failed-save retries, per-field consent, account changes, concurrent edits and stale receipts at mobile/desktop sizes in light/dark themes. Real LinkedIn provider configuration and live OAuth completion require separate verification.

## Authorized professional evidence extension (2026-10-21)

- The shared supplied-text/PDF scan now also reads explicit industries, services, needs, role descriptions and locations, education, projects, credentials, languages, volunteering, achievements and HTTPS website references. Missing sections remain empty. Website references are not fetched.
- Optional additional text requires an authorization checkbox; the server validates consent and bounds (at most three documents, 20,000 characters each). It supplements explicit professional sections, never replaces the primary profile's identity. This text is read locally by the deterministic parser; the existing AI extraction receives only the cleaned primary profile text.
- Every grounded claim carries a source label, evidence quote and confidence. Self-reported evidence is not independently verified. Strengths, introduction opportunities and explicitly stated communication preferences are labeled low-confidence hypotheses, not personality assessments or real member matches. Hypotheses can be edited in the review but are not saved.
- Supported selected own-profile fields use an authenticated owner snapshot and an atomic per-column optimistic update. Account switches, missing baseline fields, concurrent edits and missing write receipts fail closed. Photo and selected profile fields use the same guarded write; local receipt mirroring does not issue a second profile update.
- Full roles, education, projects, credentials, languages, volunteering, achievements, websites, source evidence and hypotheses remain **ephemeral private review only**, because canonical profile storage has no approved private evidence fields. They are not written to public profiles, CRM notes or an invented workspace key. Applying supported fields clears the scan review. No migration was created or applied.
- Both the shared scan and older extraction drop ungrounded AI claims. Caller-supplied PDF name hints must occur in the supplied text. AI cannot replace a profile URL with one missing from the submitted link/text.
- Mindprint's GitHub implementation has now been inspected. The public-index approach is adapted without its Lovable AI gateway or speculative behavioral profiling.

Validation: focused parser/save regressions and the existing scan browser harness pass; the browser harness uses isolated member/store stand-ins, not a real Cloud account. Automatic compilation passes. A real signed-in save and external model/provider calls are unverified; no publication or production database changes occurred. GitHub checks/PR creation are not established by local checks.
