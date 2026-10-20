# Ask Intros branch reconciliation — October 20, 2026

Canonical main checked at `b651b40d80851b65504e8e4629709183953054d9`. 229 remote branches including main; symbolic HEAD excluded.

- 118 branches: integrated ancestry.
- 4 branches: no effective branch changes.
- 107 branches: review remaining changes.

Ancestry proves commit integration, not deployed feature behavior. Nonzero ahead counts can include empty or squash-equivalent commits; they are not a list of missing features. Retained branches are not deleted.

## Completed in this pass

- PR #223 merged using a normal merge commit. Targeted Chromium rendering of the actual ticker markup/CSS passed at 390/1280 px: equal-width tracks and loop distance, no horizontal overflow, scroll, focus pause, reduced motion. Fixture headlines were used; this does not verify live news transport.
- PR #221 corrected on its own branch: actual-number checks precede integer/range validation. Both counters have coercion/invalid-number regression coverage. Five focused tests, all 709 unit tests, and local TypeScript pass; final GitHub workflows remain the merge gate.

## Missing connection recovered from #80/#60

`linkedin-oidc.ts` exists, but main had neither the sign-in button nor a linked-account action. The focused replacement connects the existing Supabase OIDC flow from `/auth` and own-profile import without replacing the modern PDF/text scanner or public-source review. Invite codes are retained; sign-in returns through `/early-access`; an existing member uses `linkIdentity`, not another login. No profile fields or membership are automatically written.

Provider credentials, LinkedIn callback registration, and Supabase LinkedIn/manual-linking settings still determine whether the external authorization completes. Disabled-provider, missing-redirect, and transport failures surface visibly. Real provider authorization is not verified here. The older identity-claim review UI is still separate outstanding work; #80/#60 are not declared complete.

## Runtime blockers kept separate

The source already includes Workspaces, Private Library, the Executive Workbench (analyst/referrals/track record/storefront/syndication), and peer-group accountability. Existing one-line reconciliation fixes for workspace membership read failures, library errors, and workbench panel accessibility are also on main. Merging the old migrations again would not supply evidence that those database objects exist in production.

The existing ledger handoff and recovery documentation require authoritative migration state/schema before schema repair. No live database changes or deployment verification occurred in this pass. See `docs/release-safety/LEDGER_HANDOFF.md` and `docs/ADMIN_CONNECTION_PREFLIGHT.md`.

## Every retained remote branch

| Branch | Ahead | Behind | Disposition |
| --- | ---: | ---: | --- |
| `claude/activation` | 0 | 876 | integrated ancestry |
| `claude/agent-gateway` | 0 | 876 | integrated ancestry |
| `claude/ai-business-analyst` | 10 | 411 | review remaining changes |
| `claude/ask-intros-name` | 1 | 886 | review remaining changes |
| `claude/ask-response-count` | 0 | 908 | integrated ancestry |
| `claude/company-continuity` | 0 | 926 | integrated ancestry |
| `claude/deal-rooms` | 0 | 840 | integrated ancestry |
| `claude/demo-live-account-fixes` | 3 | 1247 | review remaining changes |
| `claude/events` | 0 | 876 | integrated ancestry |
| `claude/foundation` | 0 | 885 | integrated ancestry |
| `claude/founding-cohorts` | 0 | 923 | integrated ancestry |
| `claude/gmail-sms` | 0 | 876 | integrated ancestry |
| `claude/google-calendar` | 0 | 882 | integrated ancestry |
| `claude/growth` | 0 | 884 | integrated ancestry |
| `claude/impact-report` | 0 | 876 | integrated ancestry |
| `claude/leak-check` | 0 | 895 | integrated ancestry |
| `claude/linkedin-import` | 0 | 892 | integrated ancestry |
| `claude/linkedin-scan` | 1 | 843 | no effective branch changes |
| `claude/live-notifications` | 0 | 916 | integrated ancestry |
| `claude/meeting-calendar` | 0 | 903 | integrated ancestry |
| `claude/meeting-outcomes` | 0 | 904 | integrated ancestry |
| `claude/meeting-recording` | 0 | 887 | integrated ancestry |
| `claude/membership-card` | 0 | 893 | integrated ancestry |
| `claude/menu-contrast` | 0 | 845 | integrated ancestry |
| `claude/messaging` | 0 | 876 | integrated ancestry |
| `claude/migration-checks` | 0 | 912 | integrated ancestry |
| `claude/outcome-spine-diagnose-route` | 0 | 932 | integrated ancestry |
| `claude/peer-groups` | 12 | 120 | review remaining changes |
| `claude/pre-meeting-brief` | 4 | 411 | review remaining changes |
| `claude/providers` | 0 | 876 | integrated ancestry |
| `claude/quick-menu` | 0 | 853 | integrated ancestry |
| `claude/quick-menu-assistant` | 0 | 851 | integrated ancestry |
| `claude/reciprocity` | 0 | 876 | integrated ancestry |
| `claude/record-live-db-objects` | 50 | 844 | review remaining changes |
| `claude/reliability-admin` | 0 | 901 | integrated ancestry |
| `claude/revenue` | 0 | 883 | integrated ancestry |
| `claude/staging` | 0 | 855 | integrated ancestry |
| `claude/stale-intro-requests` | 0 | 907 | integrated ancestry |
| `claude/storefront` | 6 | 411 | review remaining changes |
| `claude/syndication-rooms` | 7 | 411 | review remaining changes |
| `claude/this-week` | 0 | 919 | integrated ancestry |
| `claude/track-record` | 11 | 411 | review remaining changes |
| `claude/track-record-agent-capsules` | 0 | 929 | integrated ancestry |
| `claude/video-meetings` | 0 | 905 | integrated ancestry |
| `claude/voice-control` | 0 | 849 | integrated ancestry |
| `claude/warm-paths` | 0 | 876 | integrated ancestry |
| `claude/warm-referral-engine` | 10 | 121 | review remaining changes |
| `claude/weekly-digest` | 0 | 902 | integrated ancestry |
| `claude/workspace-sync` | 0 | 876 | integrated ancestry |
| `claude/yellow-tile-hover` | 1 | 936 | review remaining changes |
| `copilot/claude-record-live-db-objects-integration` | 52 | 844 | review remaining changes |
| `copilot/feature-business-social-platform` | 13 | 844 | review remaining changes |
| `copilot/fix-modal-text-contrast` | 4 | 821 | review remaining changes |
| `copilot/implement-business-execution-upgrades` | 21 | 844 | review remaining changes |
| `copilot/implement-connected-business-workflow` | 17 | 844 | review remaining changes |
| `copilot/implement-first-release-reverse-marketplace` | 17 | 844 | review remaining changes |
| `copilot/implement-member-marketplace-pilot-interest-form` | 17 | 844 | review remaining changes |
| `copilot/implement-private-library-rolodex` | 20 | 844 | review remaining changes |
| `copilot/implement-profile-import-ux` | 17 | 844 | review remaining changes |
| `copilot/improve-profile-autofill` | 54 | 844 | review remaining changes |
| `copilot/pr-50-pr-60-integration` | 54 | 839 | review remaining changes |
| `copilot/update-modal-styles` | 1 | 839 | no effective branch changes |
| `copilot/update-savepost-handling` | 1 | 839 | no effective branch changes |
| `copy/hero-only-social-platform-20261020` | 2 | 4 | review remaining changes |
| `design/architectural-blueprint-2026-10-15` | 10 | 423 | review remaining changes |
| `design/cleaner-executive-home-inbox-20261019` | 10 | 87 | review remaining changes |
| `design/editorial-luxury-ask-intros-20261014` | 0 | 518 | integrated ancestry |
| `design/messages-inspired-light-system-20261015` | 10 | 404 | review remaining changes |
| `design/port-bridge-contrast-stencil-feed` | 9 | 356 | review remaining changes |
| `design/shorter-homepage-2026-10-15` | 2 | 421 | review remaining changes |
| `docs/ask-intros-unified-roadmap-20261017` | 0 | 310 | integrated ancestry |
| `docs/phase1-activation-reconciliation-20261017` | 0 | 199 | integrated ancestry |
| `docs/safe-innovation-release-plan-20261019` | 1 | 89 | review remaining changes |
| `feat/admin-connection-preflight-20261018` | 1 | 178 | review remaining changes |
| `feat/ask-intros-public-onboarding-release-20261017` | 3 | 336 | review remaining changes |
| `feat/evidence-aware-opportunity-readiness-20261018` | 0 | 187 | integrated ancestry |
| `feat/home-platform-brand-strip-20261018` | 0 | 154 | integrated ancestry |
| `feat/home-platform-logo-thumbnails-20261018` | 5 | 158 | review remaining changes |
| `feat/homepage-unified-platform-brand-strip-20261018` | 4 | 158 | review remaining changes |
| `feat/opportunity-evidence-transparency-20261018` | 0 | 187 | integrated ancestry |
| `feat/opportunity-focus-20261018` | 0 | 188 | integrated ancestry |
| `feat/opportunity-signal-evidence-20261017` | 0 | 235 | integrated ancestry |
| `feat/opportunity-wheel-navigation-20261018` | 5 | 118 | review remaining changes |
| `feat/owner-admin-overview-20261017` | 9 | 313 | review remaining changes |
| `feat/premeeting-briefs-secure-messages-20261017` | 1 | 203 | review remaining changes |
| `feat/release-member-intelligence-panels-20261017` | 5 | 207 | review remaining changes |
| `feat/self-serve-signup-live-network-20261017` | 16 | 339 | review remaining changes |
| `feat/self-service-member-onboarding-20261017` | 12 | 339 | review remaining changes |
| `feat/shared-opportunity-exchange-20261018` | 0 | 179 | integrated ancestry |
| `feature/accepted-intro-workspace-trackrecord-20261011` | 0 | 680 | integrated ancestry |
| `feature/basic-intro-usage-transparency-20261019` | 7 | 90 | review remaining changes |
| `feature/business-lobby-consented-meetings-20261013` | 0 | 607 | integrated ancestry |
| `feature/interactive-relationship-journey-20261013` | 0 | 598 | integrated ancestry |
| `feature/interactive-timeline-option-wheel-20261018` | 2 | 111 | review remaining changes |
| `feature/light-first-appearance-preserve-user-choice-20261019` | 10 | 14 | review remaining changes |
| `feature/marketplace-pilot-qualified-demand-20261012` | 0 | 635 | integrated ancestry |
| `feature/network-connection-recovery-banner-20261019` | 6 | 90 | review remaining changes |
| `feature/onboarding-progress-clarity-20261019` | 4 | 90 | review remaining changes |
| `feature/open-basic-executive-applications-20261019` | 21 | 100 | review remaining changes |
| `feature/peer-accountability-navigation-20261011` | 0 | 681 | integrated ancestry |
| `feature/public-news-deep-links-20261019` | 16 | 82 | review remaining changes |
| `feature/sitewide-ambient-parallax` | 4 | 102 | review remaining changes |
| `feature/system-scroll-caliper-20261013` | 0 | 552 | integrated ancestry |
| `feature/wire-recovered-executive-modules` | 17 | 752 | review remaining changes |
| `fix/access-confirmation-and-rpc-failure-20261017` | 2 | 198 | review remaining changes |
| `fix/access-fetch-fail-closed-20261018` | 0 | 193 | integrated ancestry |
| `fix/access-query-error-recovery-20261018` | 0 | 161 | integrated ancestry |
| `fix/admin-error-report-truthful-20261017` | 2 | 312 | review remaining changes |
| `fix/admin-launch-write-receipts-20261017` | 0 | 260 | integrated ancestry |
| `fix/admin-network-health-contract-20261017` | 0 | 232 | integrated ancestry |
| `fix/admin-overview-error-recovery-20261017` | 0 | 310 | integrated ancestry |
| `fix/admin-overview-request-race-20261017` | 0 | 243 | integrated ancestry |
| `fix/allowance-ui-existing-live-rpc-20261019` | 0 | 48 | integrated ancestry |
| `fix/allowance-ui-existing-rpc-no-migration-20261019` | 1 | 22 | review remaining changes |
| `fix/approved-unconfirmed-member-status-20261018` | 0 | 156 | integrated ancestry |
| `fix/ask-dock-mobile-suggestion-wrapping-20261017` | 0 | 205 | integrated ancestry |
| `fix/ask-intros-final-readability-and-live-qa-20261017` | 10 | 336 | review remaining changes |
| `fix/ask-intros-member-activation-and-messages-20261017` | 21 | 336 | review remaining changes |
| `fix/ask-intros-orange-bot-logo-contrast` | 2 | 357 | review remaining changes |
| `fix/askintros-productwide-contrast-20261017` | 0 | 316 | integrated ancestry |
| `fix/auth-verified-member-entry-20261018` | 0 | 166 | integrated ancestry |
| `fix/compact-homepage-mobile-qa-20261015` | 3 | 420 | review remaining changes |
| `fix/confirmed-early-access-navigation` | 1 | 173 | review remaining changes |
| `fix/confirmed-manual-founding-claim-20261018` | 7 | 127 | review remaining changes |
| `fix/confirmed-member-invite-retention` | 2 | 177 | review remaining changes |
| `fix/confirmed-onboarded-live-member-gate-20261017` | 13 | 314 | review remaining changes |
| `fix/crm-import-recovery-validation-20261017` | 0 | 274 | integrated ancestry |
| `fix/dark-mode-default` | 2 | 346 | review remaining changes |
| `fix/deal-room-browser-check-syntax-20261018` | 0 | 112 | integrated ancestry |
| `fix/desktop-more-menu-clean-20261018` | 0 | 105 | integrated ancestry |
| `fix/desktop-more-menu-mainline-20261019` | 2 | 100 | review remaining changes |
| `fix/desktop-more-width-clean-20261019` | 0 | 100 | integrated ancestry |
| `fix/elevenlabs-owner-voice-status` | 12 | 353 | review remaining changes |
| `fix/elevenlabs-verified-personal-voice` | 13 | 351 | review remaining changes |
| `fix/executive-upgrade-independent-rpc-failures-20261019` | 3 | 19 | review remaining changes |
| `fix/executive-workbench-contrast-rebased-20261018` | 3 | 132 | review remaining changes |
| `fix/executive-workbench-intelligence-contrast-20261018` | 0 | 136 | integrated ancestry |
| `fix/extract-member-mobile-overflow-20261018` | 0 | 125 | integrated ancestry |
| `fix/founding-launch-mode-validate-20261020` | 7 | 4 | review remaining changes |
| `fix/grid-clipboard-row-recovery-20261017` | 0 | 284 | integrated ancestry |
| `fix/grid-confirmed-writes-20261017` | 0 | 302 | integrated ancestry |
| `fix/grid-contact-export-policy-20261017` | 0 | 278 | integrated ancestry |
| `fix/grid-csv-import-preflight-20261017` | 4 | 273 | review remaining changes |
| `fix/grid-freeform-csv-preflight-20261017` | 0 | 258 | integrated ancestry |
| `fix/handled-server-error-telemetry` | 0 | 792 | integrated ancestry |
| `fix/home-platform-strip-above-headline-20261018` | 0 | 139 | integrated ancestry |
| `fix/inbox-light-mode-contrast-20261017` | 20 | 339 | review remaining changes |
| `fix/inbox-selected-contrast-20261017` | 1 | 312 | review remaining changes |
| `fix/integration-audit-three-targeted-repairs-20261019` | 3 | 93 | review remaining changes |
| `fix/intent-exchange-confirmed-writes-20261017` | 0 | 244 | integrated ancestry |
| `fix/intro-dialog-verified-consent-20261015` | 2 | 490 | review remaining changes |
| `fix/intro-inbox-two-member-contract-20261017` | 0 | 286 | integrated ancestry |
| `fix/linked-grid-csv-import-guard-20261017` | 0 | 268 | integrated ancestry |
| `fix/linkedin-homepage-thumbnail-local-20261018` | 4 | 137 | review remaining changes |
| `fix/live-chat-consistency-and-recency` | 5 | 339 | review remaining changes |
| `fix/live-directory-truth` | 0 | 808 | integrated ancestry |
| `fix/live-intros-network-permissions-20261015` | 0 | 502 | integrated ancestry |
| `fix/live-member-onboarding-20261017` | 15 | 336 | review remaining changes |
| `fix/live-network-gate-routing` | 0 | 169 | integrated ancestry |
| `fix/live-network-permissions-honest-errors-20261015` | 17 | 403 | review remaining changes |
| `fix/live-network-reliability-access-20261015` | 5 | 403 | review remaining changes |
| `fix/live-network-signal-freshness-20261017` | 3 | 221 | review remaining changes |
| `fix/live-signup-intros-and-messages-20261017` | 11 | 340 | review remaining changes |
| `fix/matching-verified-path-evidence-20261017` | 0 | 233 | integrated ancestry |
| `fix/member-directory-intro-read-contract-20261012` | 0 | 647 | integrated ancestry |
| `fix/member-portrait-readability-release-20261017` | 4 | 209 | review remaining changes |
| `fix/member-portraits-contrast-20261017` | 1 | 216 | review remaining changes |
| `fix/membership-inverse-contrast-20261020` | 0 | 11 | integrated ancestry |
| `fix/message-thread-tiles-contrast-20261018` | 5 | 195 | review remaining changes |
| `fix/messages-selected-row-semantic-contrast-20261018` | 0 | 164 | integrated ancestry |
| `fix/messages-thread-name-contrast-after-bridge-port` | 8 | 354 | review remaining changes |
| `fix/messages-thread-theme-20261018` | 0 | 195 | integrated ancestry |
| `fix/mobile-ceo-command-panels` | 0 | 757 | integrated ancestry |
| `fix/mobile-site-tour-and-nav-20261015` | 11 | 406 | review remaining changes |
| `fix/more-dropdown-clean-20261019` | 1 | 100 | review remaining changes |
| `fix/more-dropdown-width-195` | 6 | 118 | review remaining changes |
| `fix/more-menu-main-rebase-20261018` | 0 | 102 | integrated ancestry |
| `fix/more-menu-readable-contrast-port-20261019` | 2 | 93 | review remaining changes |
| `fix/network-post-ask-save-receipts-20261017` | 0 | 257 | integrated ancestry |
| `fix/news-ticker-scroll-jitter-20261020` | 0 | 1 | integrated ancestry |
| `fix/onboarding-save-recovery-20261017` | 0 | 302 | integrated ancestry |
| `fix/onboarding-social-count-20261019` | 0 | 77 | integrated ancestry |
| `fix/open-onboarding-responsive-theme-20261017` | 7 | 339 | review remaining changes |
| `fix/outcome-modal-contrast-wireup-20261017` | 2 | 196 | review remaining changes |
| `fix/outcome-notes-hints-20261018` | 0 | 193 | integrated ancestry |
| `fix/production-delivery-directory-relationship-20261013` | 0 | 565 | integrated ancestry |
| `fix/public-news-match-member-editorial-20261019` | 4 | 78 | review remaining changes |
| `fix/read-aloud-page-and-mobile-playback` | 11 | 353 | review remaining changes |
| `fix/read-aloud-selection-audio-activation-20261017` | 1 | 207 | review remaining changes |
| `fix/readable-messages-light-surfaces-20261015` | 13 | 407 | review remaining changes |
| `fix/reconcile-live-write-acknowledgement-20261015` | 0 | 487 | integrated ancestry |
| `fix/recovered-ui-polish` | 0 | 717 | integrated ancestry |
| `fix/recovery-ci-and-syndication-20261011` | 0 | 721 | integrated ancestry |
| `fix/recovery-ci-green` | 0 | 723 | integrated ancestry |
| `fix/relationship-tier-collisions-contrast-20261017` | 0 | 215 | integrated ancestry |
| `fix/responsive-content-guard-isolated-20261019` | 2 | 19 | review remaining changes |
| `fix/restore-editorial-home-and-runtime-20261015` | 0 | 497 | integrated ancestry |
| `fix/restore-truncated-app-20261013` | 0 | 618 | integrated ancestry |
| `fix/salesforce-homepage-logo-local` | 8 | 119 | review remaining changes |
| `fix/secondary-message-and-capsule-acks-20261015` | 0 | 483 | integrated ancestry |
| `fix/security-business-verification-entry-20261019` | 3 | 17 | review remaining changes |
| `fix/security-session-revocation-audit-20261019` | 2 | 16 | review remaining changes |
| `fix/selection-reader-scroll-lifecycle-20261017` | 0 | 232 | integrated ancestry |
| `fix/self-host-linkedin-hero-thumbnail-20261018` | 0 | 133 | integrated ancestry |
| `fix/self-serve-member-readability-20261017` | 19 | 336 | review remaining changes |
| `fix/signup-and-live-intro-messaging-reliability` | 3 | 340 | review remaining changes |
| `fix/syndication-room-creator-read-20261011` | 3 | 756 | review remaining changes |
| `fix/verified-member-activation-reconciled` | 3 | 314 | review remaining changes |
| `fix/verify-portal-network-link-gate-20261018` | 0 | 125 | integrated ancestry |
| `fix/waitlist-rpc-error-propagation-20261019` | 2 | 15 | review remaining changes |
| `integration/deal-workspaces-reconcile` | 2 | 118 | review remaining changes |
| `integration/executive-modules-reconcile` | 2 | 118 | review remaining changes |
| `integration/private-library-reconcile` | 2 | 118 | review remaining changes |
| `integration/recover-unmerged-work` | 0 | 761 | integrated ancestry |
| `lovable-sync` | 13 | 839 | review remaining changes |
| `lovable-sync-1792085338` | 1 | 479 | review remaining changes |
| `main` | 0 | 0 | integrated ancestry |
| `reconcile/pr80-reviewed-public-info-20261020` | 0 | 8 | integrated ancestry |
| `refactor/intros-core-ui-types` | 0 | 806 | integrated ancestry |
| `refactor/intros-shell-types` | 0 | 811 | integrated ancestry |
| `refactor/live-directory-pagination` | 0 | 781 | integrated ancestry |
| `release/rebase-cleanup-208-20261019` | 0 | 73 | integrated ancestry |
| `security/fix-avatar-profile-privilege-20261012` | 0 | 661 | integrated ancestry |
| `security/lovable-scan-exposure-20261012` | 0 | 664 | integrated ancestry |
| `test/admin-analytics-payload-contract-20261017` | 0 | 302 | integrated ancestry |
| `wire/business-feed-workspaces` | 0 | 716 | integrated ancestry |
| `wire/linkedin-profile-enrichment` | 4 | 715 | review remaining changes |
| `wire/linkedin-profile-enrichment-v2` | 0 | 684 | integrated ancestry |
| `wire/recovered-executive-work-v2` | 12 | 684 | no effective branch changes |
