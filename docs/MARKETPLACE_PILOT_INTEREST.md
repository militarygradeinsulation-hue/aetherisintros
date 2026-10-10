# Marketplace pilot-interest form

Status: component + tests only. **Production persistence is blocked** — no authorized submission interface or table exists for pilot interest, and no migration was added (needs separate approval). The form is not mounted in any route; marketplace work in PR #47 is untouched.

## Files (`src/aetheris/marketplace-pilot/`)
- `pilot-interest.ts` — typed values/payload, validation, `buildPayload` (drops inactive conditional sections and empty optional fields), `runSubmit` (single-flight guard).
- `PilotInterestForm.tsx` — accessible form (fieldsets/labels), review step with Back/edit, pending state, error shown with values preserved, reset to a success screen only after `onSubmit` resolves.
- `PilotInterestExample.tsx` — integration example whose `onSubmit` always rejects with `PilotPersistenceBlockedError`; it never reports a saved submission.

## Contract
`onSubmit(payload: PilotInterestPayload): Promise<void>` — resolve only after the response is confirmed saved; reject otherwise. Pass `profile` (already-authorized values) to prefill organization details.

## Privacy
Opt-ins (pilot contact, feedback interview, real pilot project) default to unchecked and are research preferences only — not access grants or publication consent. No phone numbers, contact uploads, banking details or exact addresses are requested. Drafts are not stored in localStorage and payloads are not logged. Responses stay out of public profiles and the Rolodex (see `CONTACT_EXPORT_POLICY.md`).

## Checks
`npx vitest run` (tests in `marketplace-pilot/__tests__`), `npx eslint src/aetheris/marketplace-pilot`, `npx tsc --noEmit -p .`, `npx vite build`.
