# Marketplace pilot-interest form

Status: authenticated research capture implemented by migration `0081_marketplace_pilot_research_intent.sql`.
The form is surfaced in Expertise Exchange > Trusted providers for signed-in members. The
response is kept private (owner and administrator SELECT only); an authenticated server RPC
validates and upserts one response per approved member. The respondent's explicit research opt-ins
remain separate from introductions, messaging, listings, and contact sharing.

**Production readiness:** The UI requires migration 0081. Do not publish as a working
save flow until the migration has passed CI and been applied to the intended database.
`PilotInterestExample` remains a deliberately blocked demo fixture and does not write data.


The original blocked-form stage has been superseded by the authenticated research-persistence contract. This pilot is **not** a public procurement marketplace: publishing requests, approving providers and contacting buyers remain separate future workflows.

## Files (`src/aetheris/marketplace-pilot/`)
- `pilot-interest.ts` — typed values/payload, validation, `buildPayload` (drops inactive conditional sections and empty optional fields), `runSubmit` (single-flight guard).
- `PilotInterestForm.tsx` — accessible form (fieldsets/labels), review step with Back/edit, pending state, error shown with values preserved, reset to a success screen only after `onSubmit` resolves.
- `PilotInterestExample.tsx` — deliberately blocked demo fixture; it never reports a saved submission.
- `persistence.ts` — authenticated RPC client that resolves only after the database confirms persistence.
- `0081_marketplace_pilot_research_intent.sql` — private table, RLS and server-side validation.

## Contract
`onSubmit(payload: PilotInterestPayload): Promise<void>` — resolve only after the response is confirmed saved; reject otherwise. Pass `profile` (already-authorized values) to prefill organization details.

## Privacy
Opt-ins (pilot contact, feedback interview, real pilot project) default to unchecked and are research preferences only — not access grants or publication consent. No phone numbers, contact uploads, banking details or exact addresses are requested. Drafts are not stored in localStorage and payloads are not logged. Responses stay out of public profiles and the Rolodex (see `CONTACT_EXPORT_POLICY.md`).

## Checks
`npx vitest run` (tests in `marketplace-pilot/__tests__`), `npx eslint src/aetheris/marketplace-pilot`, `npx tsc --noEmit -p .`, `npx vite build`.
