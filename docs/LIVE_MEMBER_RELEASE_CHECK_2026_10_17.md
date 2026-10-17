# Ask Intros — live member launch check (October 17, 2026)

## Product contract

A new account may enter the real network only after:
1. Its email address is confirmed by Supabase Auth.
2. Its `early_access_members` status is `approved` under the configured launch mode.
3. The account's real `profiles` row has `onboarded=true`.
4. No verification result is `rejected` or `suspended`.

A pending business-role review does **not** invent a CEO/owner badge. The badge is only displayed when the separately reviewed `profiles.verified_role` value is genuinely present.

## GitHub and production are different

- The launch-mode enrollment RPC ships in migration `0086_restore_launch_mode_signup`; do not apply another competing `0086`.
- Apply reviewed migration `0087_confirmed_email_live_member` after `0086` using the established Drizzle migration process.
- Set `launch_settings.mode='first_1000'` if open public enrollment is desired; `invite_only` and `closed` intentionally restrict signup.
- Confirm whether first-1000 capacity is meant to cap *membership* or only founding-number badges. The current `0086` logic waitlists uninvited accounts at capacity; do not advertise unlimited registration until a separate product decision and migration are approved.
- Production Supabase/RLS grants and pending `0080`/`0083`/`0084`/`0085` migrations require separate verification. Local migration tests cannot establish deployment.
- Never expose the Supabase service role key in a browser, repository commit, screenshot or logs.

## Release acceptance

Use two new non-admin accounts with distinct verified email addresses, starting from the public signup link. Confirm both complete profile onboarding and can reload the real directory. Have A create a post and a need, and verify saved records after reload. Have A request a mutual-consent intro to B, and verify one durable server receipt; a repeated request must return the existing receipt. Have A send a DM to B and verify conversation continuity after reload. Confirm Trusted Providers directory/inbox load without permission errors, with RLS preventing cross-member private-data reads. Ensure live errors never silently swap in fictional demo people or posts.

Check both appearance modes at phone widths 320px and 390px and desktop widths 1024px and 1440px. Exercise modal dialogs, menu items, nested tabs, cards, fields, placeholder colors, meeting camera controls and Messages conversation names. Require at least 4.5:1 normal-text contrast and no horizontal overflow.

## External integrations

ElevenLabs owner voice, calendars, Gmail signals, provider enrichment, AI assistants and licensed data sources need their own credentials, scopes, approvals and production smoke tests. A connected UI or mock result is not evidence that a provider is enabled. Mark unavailable dependencies clearly rather than showing sample outputs as real member activity.
