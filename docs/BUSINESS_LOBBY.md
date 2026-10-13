# Business Lobby — consented, private drop-in conversations

## Why this belongs in Ask Intros
Roam's strongest interaction pattern is lowering the friction to a useful, short conversation. Ask Intros applies that to **people who have independently accepted an introduction**, not an organization's always-visible floor map. A live status is volunteered for a maximum of two hours; it is never inferred from app use, webcam, location, calendar, or background activity.

## User flow
1. Approved member opens Meetings > Business Lobby, chooses 15/30/60/120 minutes and optionally states the topics they are open to. Closed is the default.
2. Only an approved member who has a mutually accepted introduction with the host can discover that open window. Others see no record, not an online/offline indicator.
3. The counterpart adds optional context (maximum 240 characters) and presses **Knock**. This produces a private, 10-minute request and a normal application notification. There is no automatic call or camera activation.
4. Recipient presses **Accept & meet** or **Not now**. Only the recipient can decide. A successful acceptance creates the existing protected two-person video room, and both may join it.
5. The meeting references the accepted introduction. The pre-existing meeting notes are per-participant opt-in; successful attendance can create a recorded `met` outcome through the introduction outcome spine.
6. A member may close their window immediately. No one can knock after the window expires or closes. Repeated pending knocks are idempotent and throttled.

## Connections
- **Professional relationships** — eligibility comes from two-sided introduction consent, not follows or paid access.
- **Meetings** — uses `create_meeting(..., p_intro)`, existing WebRTC, front/back mobile camera selection, participant access checks, invitation notifications, and notes privacy. No duplicate media stack.
- **Pre-meeting intelligence** — existing meeting panel can use the associated introduction ID to prepare context, without treating a lobby note as a transcript.
- **Outcomes** — the meeting's original `intro_request_id` remains available to `mark_meeting_joined` and later attributable outcomes.
- **Quick Menu** — “Business Lobby” opens the Meetings page with the new panel.
- **Mobile** — no forced camera activation; the responsive panel stacks vertically on narrow viewports.

## Privacy and threat model
- `business_lobby_windows`: owner-only direct reads. A SECURITY DEFINER RPC reveals only active availability to a mutually accepted, approved counterpart. The presence list contains only the counterpart's member display name, headline and expiration.
- `business_lobby_knocks`: both participants can directly read a request, but arbitrary inserts/updates/deletes are never granted to authenticated clients. All writes require guarded RPCs.
- Pending/unapproved accounts and anonymous users cannot enable windows, enumerate availability, knock, or answer.
- Knocks expire after 10 minutes; repeat pending requests return the same ID; at most three new knocks per requester in 10 minutes. Approving twice does not create duplicate meetings.
- The recipient must still have an active availability window, and both sides' introduction consent must remain valid on acceptance.
- Keep accessibility and privacy independent of realtime sockets: a short foreground polling interval is a delivery enhancement, not continuous activity surveillance.

## Migration and release gate
- SQL: `0082_business_lobby.sql`. It relies on the existing meeting, notification, and consented-introduction schema.
- CI: `business-lobby.check.mjs` tests membership, opt-in, direct RLS, forbidden outsiders, duplicate knocks, double approval, active window expiry, and meeting lineage.
- Do not present Lobby as working in production until migration 0080/0081 dependencies and 0082 are applied in order, browser checks pass, and a two-real-account device acceptance test confirms notifications, mobile video and join links.
- Publishing is a separate release action; a GitHub merge is not a database deployment.

## Future slices (not part of this change)
- Member-owned **Business Lobby page/link** with qualification fields and booking routes, protected against cold unsolicited visits.
- Optional ephemeral availability subscriptions to replace polling while maintaining privacy.
- Office-hours scheduling, calendar integration, and meeting reminder preferences.
- Interactive **Business Network Map** based on permission-safe graph data, not a replica of Roam's floor map.
- Fictional public interactive tour: Need → Qualified Match → Warm Intro → Lobby → Workspace → Verified Outcome.
- AI Butler follow-through: pre-meeting brief, suggested next actions, speaker-consented summary, CRM tasks and attribution. Confirm every external action with the user.
