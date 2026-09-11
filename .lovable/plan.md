# Live Early-Access Network for Aetheris Intros

Turn the signed-in side of Aetheris Intros into a real, multi-member network for the Founding 1,000 — with no fictional people, photos, posts, messages or history anywhere behind sign-in. The current fictional cast stays alive only on a clearly labelled public demo page.

## What changes for people using the site

**Public (`/`)** — stays the editorial landing page, now leading with the Founding 1,000 invitation: real explanation, remaining spots counted from actual approved members, sign-up / sign-in, invite-code field when needed, waitlist form when full. No invented counters.

**`/demo`** — the current showcase experience with today's fictional cast, carrying a persistent "Demo data" marker. Nothing here can reach the live network.

**Sign-in becomes required again** for the network itself (`/app` and everything inside it).

**After signing up**, a person lands in one of four honest states:
- Approved → real onboarding, then Home.
- Waitlisted (capacity reached) → a composed Early Access status screen with their position.
- Pending / invite needed → status screen with an invite-code entry field.
- Suspended or denied → status screen, no network access.

**Onboarding** collects name, title, company, location, industry, focus, what they're looking for, how they can help, expertise, availability/boundaries, optional real photo, and privacy settings — then creates their profile and lands them on Home.

**Approved members see only real activity.** Where nothing exists yet, pages teach the next step:
- Home: "Your network starts here. Follow people, post what you're building, or share a need."
- Discover: "The Founding 1,000 are forming. Search by expertise, industry, company or what people are open to."
- Messages: "No conversations yet. Start from a member profile or an accepted introduction."
- Memory: "No relationship context yet."

**Founding members** get one restrained line — `Founding Member 037 / 1000` — on their profile and in account areas. No badges elsewhere.

**Admin Early Access panel** (hidden from ordinary members): approved count out of 1000, remaining spots, mode switch between First 1,000 / Invite only / Closed, whitelist emails, invite codes, approve/deny, waitlist count, suspend/reactivate, CSV export.

## Technical approach

### Access & identity (new migrations)
- `launch_settings` (single row: mode, capacity, updated_by) — readable by authenticated, writable by admin only.
- `early_access_members` (user_id, email, founding_member_number unique, status enum, approved_at, source, invite_id).
- `whitelist_entries`, `invitations` (token, optional email, max_uses, uses, expires_at), `waitlist_entries`.
- `app_role` enum + `user_roles` table + `has_role()` security-definer function (roles never on profiles).
- `claim_early_access(...)` security-definer function: locks the settings row, resolves mode, validates whitelist/invite, assigns the next founding number atomically (unique constraint as backstop), else inserts a waitlist row. Returns the resulting status + number.
- `is_live_member()` SQL helper: approved/active early-access member. Every live table's RLS requires it, so an unapproved account can read nothing.
- GRANTs on every new public table; whitelist/waitlist/invitations/settings-write restricted to admin role only.

### Demo quarantine
Add `is_demo boolean default false` to `members`, `companies`, `posts`, `asks`, and mark existing rows true; `seed_threads` / `seed_learnings` become demo-only. Live SELECT policies require `is_demo = false AND is_live_member()`. Demo reads move behind a public server function used only by `/demo`.

### Live network tables
Add where missing: `follows`, `post_comments`, `post_reactions`, `saves`, `notifications`, `circle_memberships`, `thread_participants`, `intro_participants`, `avatars` metadata; a private `avatars` storage bucket with owner-scoped policies. Messages/threads readable only by participants; posts/comments editable only by author; memory owner-only.

### App wiring
- `src/aetheris/access.ts` — `useAccess()` / `isLiveMember()` central guard; `_authenticated/route.tsx` re-enables the real gate (`AUTH_REQUIRED = true`) and redirects unapproved users to `/early-access`.
- `src/aetheris/db.ts` — remove the fictional `catalogueMembers` fallbacks and the `fictionalize()` aliasing from live paths; a single `liveQuery` layer so no page can accidentally read seed rows. Empty arrays instead of demo fallbacks.
- `store.tsx` keeps localStorage only for genuinely private intelligence layers (Relationship OS / Moat / Pro layers); every surface implying shared activity moves to database reads/writes: profiles, directory, follow/connect/save, posts, comments, reactions, needs/asks + responses, threads/messages (with Supabase Realtime), intro requests + double opt-in, circles, shared rooms, notifications.
- New routes: `/early-access` (status + invite/waitlist), `/onboarding`, `/admin/early-access` (role-gated), `/demo`.
- Avatars: upload to storage, initials monogram fallback — never a substitute human photo.

### Audit doc
`docs/LIVE_NETWORK_AUDIT.md` lists every authenticated route with its data source marked LIVE DB / PRIVATE LOCAL / DEMO ONLY, calling out the advanced layers that remain private-local so they aren't mistaken for shared state.

### Verification before finishing
Two real test accounts through the whole flow: claim founding slots 1 and 2, capacity-full waitlist, invite-only reject/admit, closed mode, onboarding, real post/need/message/intro persistence across reload, participant-only message access, admin panel blocked for a normal member, RLS spot-checks, no fictional name or photo anywhere behind sign-in, 360/390 mobile, typecheck and build. Nothing is published this turn.

### Assumptions
- Capacity is 1,000 and default mode is First 1,000.
- Joseph's account is granted the admin role so the panel is reachable.
- Existing fictional data is preserved, not deleted — only quarantined to `/demo`.
