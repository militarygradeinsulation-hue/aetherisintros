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

## Link handling
A valid pasted link is never an error: the panel shows a status message ("we can't read a profile from a link alone") with **Upload PDF** and **Paste text** actions. An invalid link shows a validation error. If a licensed provider ever returns a profile, it feeds the same review draft (`extractionFromProfile`); the old throwing placeholder branch is gone.

## Sign in with LinkedIn (OpenID Connect)
Uses the existing Supabase auth stack with provider `linkedin_oidc` and only the `openid profile email` scopes (`src/aetheris/linkedin-oidc.ts`). The sign-in page has **Continue with LinkedIn**; signed-in members can **Connect LinkedIn** in the import panel (`linkIdentity`). Signing in fills nothing: the panel offers the verified name, photo (LinkedIn image host only) and email (only if `email_verified`), each behind its own unticked checkbox, and they go to the review draft. Email is written to `profiles.email` only on Apply.

Setup (done by a project admin, no secrets belong in the repo):
1. Create an app at https://www.linkedin.com/developers/apps and add the product **Sign In with LinkedIn using OpenID Connect**.
2. In the app's Auth tab add the redirect URL shown in Supabase (Authentication → Providers → LinkedIn (OIDC)): `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Enter the Client ID and Client Secret in that Supabase provider screen and enable it.
4. In Supabase Authentication → URL Configuration, allow the site URL(s) used as `redirectTo` (`<origin>/verify` and the Executive page).
5. Enable manual identity linking in Supabase if members should connect LinkedIn to an existing account.

## Find public information (own profile only)
`findPublicInformation` (`src/lib/publicInfo.functions.ts`, rules in `src/aetheris/public-info.ts`):
- Runs only after the member ticks a confirmation, and only when the AI gateway is configured (otherwise it reports unavailable). It uses the existing `searchWeb` integration, which needs no key.
- The searched name and headline are read server-side from the member's own saved profile, never from the request, so it cannot look up other people.
- Reads search-result titles and snippets only (no pages are fetched); LinkedIn, non-https, private-address and credentialed URLs are discarded.
- A source is kept only if it contains the full name with a headline word nearby; namesake pages are discarded, and a member without headline words gets no suggestions.
- Each suggestion (title, company, location, headline, what I do, building) needs a quote copied from its cited source and a value copied from that quote; each shows its source link.
- Limits: 3 searches per member per 10 minutes, name 120 / headline 220 characters, at most 6 sources and 8 suggestions. Payloads are never logged.
- Suggestions go to the review draft only when ticked; edited fields keep the member's text (the suggestion is offered instead), and stale or other-session results are ignored.

Out of scope: scraping LinkedIn, bypassing login walls, personality/behavioral profiling, profiling other people, contact import or enrollment.

## Limits
Authenticated server functions (`requireAuthContract`), 60k-character text cap, 10 scans per member per 10 minutes (in-memory per instance), 25 s AI timeout with parser fallback.

## Verification
`npx vitest run`, `npx tsc --noEmit`, `npx vite build` pass. `npm run lint` reports only pre-existing prettier style errors repo-wide. Not verified: real AI provider calls and the live save path (need credentials and a Supabase session); no real LinkedIn provider exists to test.
