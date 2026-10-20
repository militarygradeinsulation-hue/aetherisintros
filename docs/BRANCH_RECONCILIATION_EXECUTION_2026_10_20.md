# Branch reconciliation — execution record (October 20, 2026)

Companion to `docs/BRANCH_RECONCILIATION_2026_10_20.md` (baseline main `b651b40d`). This pass ran on
`reconcile/oct-2026-all-tracks`, branched from main `8db1cf8d`, against freshly fetched `origin/*` refs.

**No branch was merged.** Every commit was evaluated individually; only five small commits were
cherry-picked with `git cherry-pick -x`, so each carries a `(cherry picked from commit …)` trailer.

## Method

For each of the 107 branches the baseline marks "review remaining changes":

1. `git cherry origin/main origin/<branch>` lists commits that are not patch-equivalent to main.
2. Each such commit was classified on a disposable worktree at this branch's Track 3 head:
   - **Migration-touching** — changes `drizzle/migrations/`, `supabase/migrations/` or `routeTree.gen.ts`.
     These are never picked. Re-landing old migration files would duplicate journal numbers
     (see `docs/release-safety/MIGRATION_NORMALIZATION_2026_10_20.md`) and could re-apply 0058–0077/0093.
   - **Empty on main** — `cherry-pick --no-commit` produces no change, so the content is already
     on main (usually squash-merged).
   - **Conflict** — main has since rewritten the same code. Forcing the old version would regress newer work.
   - **Clean-apply** — applies without conflict. These were reviewed by hand (see below).
3. The nine lowest-behind branches (13–38 behind) were also compared file by file. In every one,
   the branch intent is already on main: the hero headline, light-first appearance, independent RPC
   failures, responsive guard, the `.security-verify-link` entry and styles, the session-revocation audit,
   the waitlist error propagation and `normalizeFoundingStats`, and the `my_intro_allowance` display.
   The remaining textual differences are places where main is *newer* than the branch.

Totals across those 107 branches (counts include commits shared between branches):
356 conflict · 158 empty on main · 118 migration-touching · 87 clean-apply.

## Cherry-picked (5)

All five apply cleanly, contain no migrations, pass `tsc --noEmit`, and serve the
truthful-instrumentation rule:

| New commit | Source | Why |
| --- | --- | --- |
| `ac5d2390` | `24f31cb4` · `fix/live-network-reliability-access-20261015` | Legacy `9999`-day sentinel is "unknown", never "dormant". |
| `f5a70d61` | `b27a5fa3` · same branch | Missing history timestamps are no longer counted as elapsed days in CEO insights. |
| `68acdfb9` | `36f82142` · same branch | Request-intro modal can no longer show an earlier member's success for a different member. |
| `331e3128` | `75bb6f77` · `fix/read-aloud-selection-audio-activation-20261017` | Unlock audio on an explicit reader tap (`unlockAudio` exists on main). |
| `aacfb5b2` | `3b2b506d` · `fix/signup-and-live-intro-messaging-reliability` | An empty message throws instead of resolving, so callers no longer clear the draft as if it had been sent. |

## Clean-apply commits that were reviewed and rejected

- `e019a570` (intro-consent regression test): it was picked, then its 3 tests failed against current main. The pick was
  dropped locally before any push, and no pushed history was rewritten.
- `ed610ddb` (`as never` cast on the warm-referrals route): not needed, because `tsc --noEmit` already passes on main.
- `7d350ab3` (`.executive-allowance` CSS): main renders `.executive-upgrade-allowance`, so this would be dead CSS.
- `0fe3caf0` (news landing page): part of a feature branch that also carries a migration commit, so it is not picked in isolation.
- `b3dd2ee7`, `d6c87930` (workspace-sync hardening, 860 behind): `workspace-sync.ts` has been substantially
  rewritten on main since then. Needs an owner-led port, not a cherry-pick.
- Regression or architect tests and docs written against older markup or fixtures
  (`zz-basic-executive`, `architect-check`, homepage brand-strip tests, migration fixture corrections,
  `integration/*-reconcile` parity docs): they describe states main has moved past. Picking them
  would either fail or record stale claims.

## Not done / still requires a human

- No branch was deleted.
- Migration-touching commits (118) were not evaluated for production state. Use the ledger handoff in
  `docs/release-safety/` with authoritative `drizzle.__drizzle_migrations` evidence.
- Conflicting commits (356) were not hand-ported. Ancestry or "clean-apply" is not evidence of deployed behaviour.

## Per-branch disposition

| Branch | Ahead | Behind | Unique | Empty on main | Conflict | Migration-touching | Clean-apply | Disposition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `fix/founding-launch-mode-validate-20261020` | 0 | 13 | 0 | 0 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `copy/hero-only-social-platform-20261020` | 2 | 20 | 2 | 2 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `feature/light-first-appearance-preserve-user-choice-20261019` | 10 | 30 | 10 | 7 | 3 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/waitlist-rpc-error-propagation-20261019` | 2 | 31 | 2 | 2 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/security-session-revocation-audit-20261019` | 2 | 32 | 2 | 2 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/security-business-verification-entry-20261019` | 3 | 33 | 3 | 2 | 1 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/executive-upgrade-independent-rpc-failures-20261019` | 3 | 35 | 3 | 3 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/responsive-content-guard-isolated-20261019` | 2 | 35 | 2 | 2 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/allowance-ui-existing-rpc-no-migration-20261019` | 1 | 38 | 0 | 0 | 0 | 0 | 0 | already on main by content (squash/rebased merge); nothing to pick |
| `fix/public-news-match-member-editorial-20261019` | 4 | 94 | 4 | 4 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feature/public-news-deep-links-20261019` | 16 | 98 | 16 | 6 | 8 | 1 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `design/cleaner-executive-home-inbox-20261019` | 10 | 103 | 10 | 8 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `docs/safe-innovation-release-plan-20261019` | 1 | 105 | 0 | 0 | 0 | 0 | 0 | no non-patch-equivalent commits; nothing to pick |
| `feature/basic-intro-usage-transparency-20261019` | 7 | 106 | 7 | 0 | 2 | 3 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `feature/network-connection-recovery-banner-20261019` | 6 | 106 | 6 | 4 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feature/onboarding-progress-clarity-20261019` | 4 | 106 | 4 | 4 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/integration-audit-three-targeted-repairs-20261019` | 3 | 109 | 3 | 3 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/more-menu-readable-contrast-port-20261019` | 2 | 109 | 2 | 2 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feature/open-basic-executive-applications-20261019` | 21 | 116 | 21 | 10 | 5 | 6 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/desktop-more-menu-mainline-20261019` | 2 | 116 | 2 | 2 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/more-dropdown-clean-20261019` | 1 | 116 | 1 | 1 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feature/sitewide-ambient-parallax` | 4 | 118 | 4 | 3 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feature/interactive-timeline-option-wheel-20261018` | 2 | 127 | 2 | 0 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feat/opportunity-wheel-navigation-20261018` | 5 | 134 | 5 | 4 | 0 | 1 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/more-dropdown-width-195` | 6 | 134 | 5 | 2 | 1 | 1 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `integration/deal-workspaces-reconcile` | 2 | 134 | 2 | 1 | 0 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `integration/executive-modules-reconcile` | 2 | 134 | 2 | 1 | 0 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `integration/private-library-reconcile` | 2 | 134 | 2 | 1 | 0 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/salesforce-homepage-logo-local` | 8 | 135 | 7 | 4 | 0 | 2 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `claude/peer-groups` | 12 | 136 | 8 | 1 | 1 | 6 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `claude/warm-referral-engine` | 10 | 137 | 8 | 1 | 1 | 6 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/confirmed-manual-founding-claim-20261018` | 7 | 143 | 7 | 4 | 1 | 2 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/executive-workbench-contrast-rebased-20261018` | 3 | 148 | 0 | 0 | 0 | 0 | 0 | no non-patch-equivalent commits; nothing to pick |
| `fix/linkedin-homepage-thumbnail-local-20261018` | 4 | 153 | 4 | 0 | 3 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `feat/home-platform-logo-thumbnails-20261018` | 5 | 174 | 5 | 0 | 4 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `feat/homepage-unified-platform-brand-strip-20261018` | 4 | 174 | 4 | 0 | 3 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/confirmed-early-access-navigation` | 1 | 189 | 0 | 0 | 0 | 0 | 0 | no non-patch-equivalent commits; nothing to pick |
| `fix/confirmed-member-invite-retention` | 2 | 193 | 2 | 0 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feat/admin-connection-preflight-20261018` | 1 | 194 | 0 | 0 | 0 | 0 | 0 | no non-patch-equivalent commits; nothing to pick |
| `fix/message-thread-tiles-contrast-20261018` | 5 | 211 | 5 | 0 | 1 | 0 | 4 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/outcome-modal-contrast-wireup-20261017` | 2 | 212 | 2 | 2 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/access-confirmation-and-rpc-failure-20261017` | 2 | 214 | 2 | 0 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feat/premeeting-briefs-secure-messages-20261017` | 1 | 219 | 0 | 0 | 0 | 0 | 0 | no non-patch-equivalent commits; nothing to pick |
| `feat/release-member-intelligence-panels-20261017` | 5 | 223 | 5 | 3 | 1 | 1 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/read-aloud-selection-audio-activation-20261017` | 1 | 223 | 1 | 0 | 0 | 0 | 1 | cherry-picked (-x): 75bb6f77 → 331e3128; remaining commits skipped (see counts) |
| `fix/member-portrait-readability-release-20261017` | 4 | 225 | 4 | 2 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/member-portraits-contrast-20261017` | 1 | 232 | 1 | 1 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/live-network-signal-freshness-20261017` | 3 | 237 | 3 | 3 | 0 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/grid-csv-import-preflight-20261017` | 4 | 289 | 4 | 0 | 2 | 0 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/admin-error-report-truthful-20261017` | 2 | 328 | 2 | 0 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/inbox-selected-contrast-20261017` | 1 | 328 | 1 | 0 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feat/owner-admin-overview-20261017` | 9 | 329 | 9 | 1 | 3 | 4 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/confirmed-onboarded-live-member-gate-20261017` | 13 | 330 | 13 | 4 | 7 | 2 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/verified-member-activation-reconciled` | 3 | 330 | 3 | 0 | 2 | 1 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `feat/ask-intros-public-onboarding-release-20261017` | 3 | 352 | 3 | 0 | 2 | 1 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/ask-intros-final-readability-and-live-qa-20261017` | 10 | 352 | 7 | 0 | 5 | 0 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/ask-intros-member-activation-and-messages-20261017` | 21 | 352 | 20 | 0 | 13 | 2 | 5 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/live-member-onboarding-20261017` | 15 | 352 | 15 | 0 | 11 | 2 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/self-serve-member-readability-20261017` | 19 | 352 | 18 | 0 | 12 | 2 | 4 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `feat/self-serve-signup-live-network-20261017` | 16 | 355 | 16 | 1 | 13 | 1 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `feat/self-service-member-onboarding-20261017` | 12 | 355 | 12 | 0 | 8 | 2 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/inbox-light-mode-contrast-20261017` | 20 | 355 | 19 | 0 | 15 | 2 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/live-chat-consistency-and-recency` | 5 | 355 | 5 | 0 | 5 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/open-onboarding-responsive-theme-20261017` | 7 | 355 | 6 | 0 | 3 | 1 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/live-signup-intros-and-messages-20261017` | 11 | 356 | 11 | 7 | 3 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/signup-and-live-intro-messaging-reliability` | 3 | 356 | 3 | 0 | 2 | 0 | 1 | cherry-picked (-x): 3b2b506d → aacfb5b2; remaining commits skipped (see counts) |
| `fix/dark-mode-default` | 2 | 362 | 2 | 1 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/elevenlabs-verified-personal-voice` | 13 | 367 | 11 | 3 | 8 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/elevenlabs-owner-voice-status` | 12 | 369 | 11 | 3 | 8 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/read-aloud-page-and-mobile-playback` | 11 | 369 | 11 | 3 | 8 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/messages-thread-name-contrast-after-bridge-port` | 8 | 370 | 7 | 0 | 6 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `design/port-bridge-contrast-stencil-feed` | 9 | 372 | 9 | 2 | 7 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/ask-intros-orange-bot-logo-contrast` | 2 | 373 | 2 | 1 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/live-network-permissions-honest-errors-20261015` | 17 | 419 | 17 | 8 | 5 | 4 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/live-network-reliability-access-20261015` | 5 | 419 | 5 | 0 | 0 | 1 | 4 | cherry-picked (-x): 24f31cb4 → ac5d2390, b27a5fa3 → f5a70d61, 36f82142 → 68acdfb9; remaining commits skipped (see counts) |
| `design/messages-inspired-light-system-20261015` | 10 | 420 | 10 | 0 | 7 | 0 | 3 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/mobile-site-tour-and-nav-20261015` | 11 | 422 | 11 | 5 | 5 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/readable-messages-light-surfaces-20261015` | 13 | 423 | 13 | 3 | 10 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `claude/ai-business-analyst` | 10 | 427 | 8 | 2 | 1 | 4 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `claude/pre-meeting-brief` | 4 | 427 | 3 | 0 | 1 | 2 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `claude/storefront` | 6 | 427 | 5 | 1 | 0 | 4 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `claude/syndication-rooms` | 7 | 427 | 5 | 0 | 1 | 4 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `claude/track-record` | 11 | 427 | 9 | 1 | 4 | 4 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/compact-homepage-mobile-qa-20261015` | 3 | 436 | 3 | 0 | 3 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `design/shorter-homepage-2026-10-15` | 2 | 437 | 2 | 0 | 2 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `design/architectural-blueprint-2026-10-15` | 10 | 439 | 10 | 4 | 6 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `lovable-sync-1792085338` | 1 | 495 | 1 | 0 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `fix/intro-dialog-verified-consent-20261015` | 2 | 506 | 2 | 0 | 1 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `wire/linkedin-profile-enrichment` | 4 | 731 | 4 | 0 | 2 | 0 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `feature/wire-recovered-executive-modules` | 17 | 768 | 13 | 0 | 12 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `fix/syndication-room-creator-read-20261011` | 3 | 772 | 1 | 0 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `copilot/fix-modal-text-contrast` | 4 | 837 | 2 | 1 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `copilot/pr-50-pr-60-integration` | 54 | 855 | 28 | 2 | 12 | 10 | 4 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `lovable-sync` | 13 | 855 | 4 | 0 | 3 | 0 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `claude/record-live-db-objects` | 50 | 860 | 31 | 2 | 16 | 7 | 6 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/claude-record-live-db-objects-integration` | 52 | 860 | 28 | 2 | 12 | 10 | 4 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/feature-business-social-platform` | 13 | 860 | 5 | 0 | 3 | 1 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/implement-business-execution-upgrades` | 21 | 860 | 12 | 2 | 6 | 1 | 3 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/implement-connected-business-workflow` | 17 | 860 | 9 | 0 | 4 | 4 | 1 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/implement-first-release-reverse-marketplace` | 17 | 860 | 8 | 0 | 6 | 0 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/implement-member-marketplace-pilot-interest-form` | 17 | 860 | 8 | 0 | 6 | 0 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/implement-private-library-rolodex` | 20 | 860 | 11 | 0 | 6 | 3 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/implement-profile-import-ux` | 17 | 860 | 8 | 0 | 6 | 0 | 2 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `copilot/improve-profile-autofill` | 54 | 860 | 29 | 2 | 13 | 10 | 4 | skipped: clean-applying commits are tests/docs/CSS written against an older main, or depend on the branch's own migration/conflicting commits; needs owner review |
| `claude/ask-intros-name` | 1 | 902 | 0 | 0 | 0 | 0 | 0 | no non-patch-equivalent commits; nothing to pick |
| `claude/yellow-tile-hover` | 1 | 952 | 1 | 0 | 1 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
| `claude/demo-live-account-fixes` | 3 | 1263 | 3 | 0 | 3 | 0 | 0 | skipped: every remaining commit is empty on main, conflicts with newer main code, or touches migrations |
