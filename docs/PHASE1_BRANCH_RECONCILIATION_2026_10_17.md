# Phase 1: member activation branch reconciliation

Current canonical baseline: main after PR #157 and PR #158. Do not merge overlapping activation branches wholesale.

## Existing canonical code
- src/aetheris/access.ts defines isLiveMember: signed in, confirmed email, approved status, onboarding complete, not suspended/rejected.
- src/aetheris/activation.ts already contains the first-week activation checklist.
- main has 0086_restore_launch_mode_signup.sql, 0087_confirmed_member_onboarding.sql, 0088_admin_platform_overview.sql, and 0089_verified_owner_admin_provision.sql.

## Open conflicting alternatives
- #117 adds 0086_open_member_signup.sql; conflicts with main migration number 0086.
- #123 adds 0087_confirmed_founding_signup_activation.sql; conflicts with canonical 0087.
- #125 adds 0087_open_member_onboarding.sql; conflicts with canonical 0087.
- #126 and #127 add 0087_confirmed_email_live_member.sql; conflicts with canonical 0087 and each other. #127 is currently merge-conflicted.
- All five alter auth.tsx, early-access.tsx and access.ts in overlapping ways. No safe bulk merge.
- #104/#108 are legacy appearance changes; extract any missing selectors instead of replacing newer contrast repairs.

## Safe integration plan
1. Diff each alternative RPC/permission behavior against canonical 0086/0087 and current access.ts. Preserve one migration history; new required SQL goes into the next available numbered migration, never a second 0087.
2. Build one signup E2E test: anonymous -> registration -> email confirmed -> founding access claim -> onboarding -> member gate -> live directory -> intro request -> message -> CRM write.
3. Test separate cases: email unconfirmed, invite-only, waitlisted, denied, suspended, rejected role verification, expired session, network/RPC failure, duplicate registration, and role revocation.
4. Verify database grants and RLS with two distinct authenticated members and an anonymous user; prove that demo identities cannot be contacted.
5. Confirm Lovable deploy SHA equals main SHA and production migrations are applied. GitHub CI is not production evidence.
6. Only then close or supersede redundant activation PRs with links to the canonical tested replacement.

## Integration backlog
- #157 pre-meeting briefs merged: verify real member sessions and AI-provider response.
- #53 old brief branch must not replace request-scoped Supabase server access.
- #44/#45/#50 remain dirty against their non-main base; resolve dependencies and extract features, not wholesale merge.
- #54/#56 track record and analyst: audit existing foundation and permissions before integration.
- Read aloud: verify signed-in ElevenLabs service, iOS user-gesture audio unlock, and visible error recovery.

## Release gate
Never claim full self-service onboarding or connected tool functionality based solely on a merged PR. Require a successful production signup journey and owner dashboard verification.
