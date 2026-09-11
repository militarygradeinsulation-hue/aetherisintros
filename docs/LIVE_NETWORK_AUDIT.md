# Live Network Audit — data source per surface

The rule: **once a member is signed in and approved, every network-facing surface reads
production data only.** No fictional people, portraits, posts, conversations, relationship
history or activity. Empty is preferred over invented.

## Access model

| Piece | Where |
| --- | --- |
| Launch mode + capacity | `public.launch_settings` (`first_1000` / `invite_only` / `closed`, default `first_1000`, capacity 1000) |
| Membership + founding number | `public.early_access_members` (unique `founding_member_number`) |
| Atomic claim | `public.claim_early_access()` — locks the settings row, so two signups cannot take the same place |
| Waitlist | `public.waitlist_entries` + `public.join_waitlist()` |
| Whitelist / invitations | `public.whitelist_entries`, `public.invitations` |
| Roles | `public.user_roles` + `public.has_role()` / `public.is_admin()` — never on a profile row |
| Guard used by the app | `isLiveMember()` in `src/aetheris/access.ts` |

The first account to sign up becomes the launch administrator (bootstrap in `handle_new_user`).

## Routes

| Route | Audience | Data source |
| --- | --- | --- |
| `/` | Public | Static editorial landing (`src/aetheris/Landing.tsx`) |
| `/auth` | Public | Supabase email + Google sign-in |
| `/early-access` | Public / signed-in | `founding_stats()`, `claim_early_access()`, `join_waitlist()` |
| `/onboarding` | Approved member | Writes `profiles` + `memories`; no seeded content |
| `/app` | Approved + onboarded member | **LIVE** — `src/aetheris/live.ts` |
| `/admin/early-access` | Admin only | `launch_settings`, `early_access_members`, `whitelist_entries`, `invitations`, `waitlist_entries` |
| `/demo` | Public, labelled | Illustrative catalogue (`src/aetheris/social.ts`) behind a permanent SHOWCASE banner |

## `/app` surface by surface

| Surface | Live source | Empty behaviour |
| --- | --- | --- |
| Members / Discover / Intros | `profiles` (RLS restricts to approved members) | No members yet → nothing invented |
| Feed | `posts` where `is_demo = false` and `author_id is not null` | Empty feed |
| Reactions / comments | `post_reactions`, `post_comments` | Zero counts |
| Needs marketplace | `asks` (live only), replies in `ask_responses` | Empty marketplace |
| Messages | `dm_threads` + `dm_messages` | No conversations |
| Introductions | `intro_requests` (both requester and target can read) | None |
| Relationships | `relationships` (private) mirrored to `follows` (shared counts) | None |
| Active Memory | `memories` for the signed-in member | Only what their own actions taught it |
| Signals / learned catalogue | **empty in live mode** — the seeded editorial context is demo-only | Empty |
| Identity, needs, preferences | `profiles` + `preferences` | Starts blank, filled by onboarding |

`src/aetheris/live.ts` never falls back to `social.ts`. `src/aetheris/db.ts#loadDirectory`
(which does fall back to the catalogue) is reached **only** in `demo` mode.

## Private intelligence layers

The Relationship OS, Moat and Professional layers (`os-*`, `moat-*`, `pro-*`) remain
local-first per member: they contain that member's own working state, and their seeds are
scoped to the signed-in member rather than presented as other people. They never introduce
another human being into the live network.

## Quarantine

`members`, `companies`, `signals`, `seed_threads`, `seed_learnings` and any `posts`/`asks`
row with `is_demo = true` are showcase data. Live reads filter them out; the showcase is
only reachable at `/demo`, always under its banner.
