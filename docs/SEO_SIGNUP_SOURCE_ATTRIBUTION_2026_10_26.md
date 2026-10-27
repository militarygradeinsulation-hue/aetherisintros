# First-party acquisition hints for Ask Intros email signups

## Purpose

Tie a new email signup to its **broad, first public page and traffic category**, without a third-party analytics tracker. This is a narrow first step toward understanding which public SEO pages lead people to register.

## Implementation

- Root client startup calls `captureInitialAcquisition()` once per tab session. If session storage is blocked, the app continues normally.
- Only eligible public paths (including the demo and sign-in) can become a landing page. Private routes, arbitrary URLs, search parameters, email addresses and member data are never stored in this record.
- A query parameter such as `utm_source=linkedin&utm_medium=social&utm_campaign=founder_launch` is normalized to allowlisted, bounded values. Unrecognized sources become `other-campaign`. Referrer classification only uses a short allowlist of search/social hostnames and never saves a full referring URL.
- On a new **email signup only**, the signup request may include `acquisition_source`, `acquisition_medium`, `acquisition_landing_page`, and optional `acquisition_campaign` in user metadata. This extends the existing `name` and `invite_code` metadata; it does not touch the membership approval gate or roles.
- These metadata fields are **client-supplied hints**, not authenticated evidence. They must never grant access, modify verification, assign billing, or be reported as proven sales attribution. Storage lasts for the browser tab session, but signup metadata persists with the account when the provider accepts the signup.
- OAuth signups, conversion counts, verified Google Search Console integration, and aggregate admin analytics are **not** implemented by this release. A future server-side, admin-only summary must verify the signup receipt and privacy controls before describing totals as confirmed registrations.

## Tests

`npx vitest run src/aetheris/__tests__/acquisition-source.test.ts`

Covers first-touch retention, known search referrers, lookalike domains, private path exclusions, unknown UTM normalization, blocked storage, and rejection of tampered stored hints. The dedicated SEO PR CI runs these tests.

## Verification

- Test a new email signup through `/executive-networking?utm_source=linkedin&utm_medium=social&utm_campaign=founder_launch`, and check that the account's user metadata has only the bounded attribution fields.
- Confirm that visiting private routes or switching between Social and Business views never rewrites the initial source.
- A signup through Google or LinkedIn must not be counted as a tracked source registration unless a separately verified flow handles it.
- Confirm the production merge commit syncs and publishes in Lovable; commit sync alone is not definitive proof of live deployment.
- Keep Search Console clicks, Lovable referral counts, and signup metadata distinct until a verified, consent-aware aggregate pipeline is implemented.
