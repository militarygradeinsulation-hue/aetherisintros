# Ask Intros live activation acceptance checklist (October 17, 2026)

## Account access contract

1. A new person may create an account at `/auth?mode=signup` while `launch_settings.mode = 'first_1000'` and founding capacity remains available. No referral code is needed in this launch mode.
2. The sign-up address must be confirmed by Supabase Auth. Unconfirmed accounts must not see live network records.
3. `claim_early_access` (migration 0086) atomically decides `approved`, `pending`, `waitlisted`, `denied` or `suspended` based on launch settings. The browser cannot approve itself.
4. The member completes the profile form, and the app checks that the update returned a saved profile ID.
5. `is_live_member()` (migration 0087) permits only confirmed-email, approved, onboarded accounts without a reviewer rejection or suspension.
6. Optional executive/business-role verification is a **separate** claim with real evidence. Do not infer a CEO badge from email confirmation, or set `verified_role` during ordinary signup.

## Production evidence already obtained

The connected original Ask Intros Lovable project's live database was read before modification. It had valid authenticated grants for posts/asks and required intros/providers RPCs, plus 9 approved/verified records, but was running an old invite-required `claim_early_access` and `invite_only`. The reviewed GitHub `0086_restore_launch_mode_signup.sql` was applied through its authorized database connection and mode changed to `first_1000`. Read-back showed 1,000 founding capacity, intact privileges and no change to 9 approved/verified counts.

**This does not prove a member has completed end-to-end signup.** Production `is_live_member()` was still the business-verification-only gate when last checked. Apply `0087_confirmed_member_onboarding.sql` only after its PR checks pass, the new code lands in main and the deployment owner confirms the database target.

## Two-person real-world acceptance, mandatory before claiming complete

- Use two new, distinct non-admin test accounts with confirmed addresses.
- Test a visitor who never confirms their email, an approved account without profile onboarding, a completed account without business role verification, and rejected/suspended states.
- Complete profile onboarding and refresh; the new member should enter with *no unearned verification badge*.
- Read People directory: real approved profiles only; no fictional/sample fallback during errors.
- Create a post and an Ask, confirm server saves, refresh and verify both persist.
- Request an introduction A → B. Expect a unique server receipt and a second request returning `existing`, with B's consent still false until B explicitly accepts.
- Send a message, refresh, confirm the persisted conversation/thread opens with no local draft ID.
- Verify Trusted Providers directory/request/inbox RPCs and privacy restrictions from both accounts.
- Test light/dark mode at 320, 390, 768 and 1440 pixel widths for labels, options, menus, modal positioning, no clipped words and no horizontal body overflow.
- Verify Read Aloud and user's owned ElevenLabs voice **only if** private server-side key and voice ID are configured; never insert provider secrets in repository files or claim a live audio test from code alone.

## Limits / operational notes

- Founding capacity remains **1,000**, controlled by the launch configuration; `0086` waitlists uninvited people at capacity. Do not advertise unlimited access.
- GitHub CI tests do not apply production SQL or verify production service secrets.
- Keep two-sided intro consent, account bans, RLS and private fields intact. Do not expose service-role keys, disable RLS, or use sample-profile IDs for live requests.
- Record the exact published Git SHA and monitoring evidence after deployment.
