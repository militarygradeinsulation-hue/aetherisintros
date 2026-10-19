# Ask Intros: every GitHub branch and upgrade — reconciliation tracker

Snapshot 2026-10-19. 216 GitHub branches including `main`. Checked means verified merged or zero commits ahead of `main`; unchecked means audit and disposition needed, **not** necessarily that the feature is absent. Never bulk-merge old migrations or delete a publishing branch.

## Required order of work

- [x] PR #206: documentation-only release safety checklist merged to `main` (`e3da792`).
- [x] PR #208: seven-screen copy/readability cleanup merged to `main` (`adcb552`).
- [ ] Verify Lovable editor SHA and separately verify the published site's deployment SHA.
- [ ] Verify exact production DB, obtain read-only migration ledger and restorable backup.
- [ ] Reconcile missing live schema from migrations 0058–0077, collisions 0082/0090/0092 and reused 0093 in disposable DB first.
- [ ] Test each restored RPC/table with anon, member A, member B, admin, consent, and revoked access.
- [ ] Restore and smoke-test deal rooms, workspaces, library, referrals, meetings, track record, storefront, syndication and peer groups.
- [ ] Review current unique UI improvements: news deep links, onboarding progress, offline banner, parallax and ElevenLabs; rebase and test separately.
- [ ] Resolve all older open PRs and mark superseded ones; avoid duplicate signup, LinkedIn and CRM implementations.
- [ ] Review every branch below; preserve unique useful code and remove only safely superseded refs.

## All branches

### claude (50)
- [ ] `claude/activation` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/agent-gateway` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/ai-business-analyst` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/ask-intros-name` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/ask-response-count` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/company-continuity` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/deal-rooms` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/demo-live-account-fixes` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/events` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/foundation` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/founding-cohorts` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/gmail-sms` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/google-calendar` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/growth` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/impact-report` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/leak-check` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/linkedin-import` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/linkedin-scan` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/live-notifications` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/meeting-calendar` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/meeting-outcomes` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/meeting-recording` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/membership-card` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/menu-contrast` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/messaging` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/migration-checks` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/outcome-spine-diagnose-route` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/peer-groups` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/pre-meeting-brief` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/providers` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/quick-menu` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/quick-menu-assistant` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/reciprocity` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/record-live-db-objects` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/reliability-admin` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/revenue` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/staging` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/stale-intro-requests` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/storefront` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/syndication-rooms` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/this-week` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/track-record` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/track-record-agent-capsules` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/video-meetings` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/voice-control` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/warm-paths` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/warm-referral-engine` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/weekly-digest` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/workspace-sync` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/yellow-tile-hover` — classify: integrated / unique / superseded / unsafe

### copilot (13)
- [ ] `copilot/claude-record-live-db-objects-integration` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/feature-business-social-platform` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/fix-modal-text-contrast` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/implement-business-execution-upgrades` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/implement-connected-business-workflow` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/implement-first-release-reverse-marketplace` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/implement-member-marketplace-pilot-interest-form` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/implement-private-library-rolodex` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/implement-profile-import-ux` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/improve-profile-autofill` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/pr-50-pr-60-integration` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/update-modal-styles` — classify: integrated / unique / superseded / unsafe
- [ ] `copilot/update-savepost-handling` — classify: integrated / unique / superseded / unsafe

### design (6)
- [ ] `design/architectural-blueprint-2026-10-15` — classify: integrated / unique / superseded / unsafe
- [x] `design/cleaner-executive-home-inbox-20261019` — merged via PR
- [ ] `design/editorial-luxury-ask-intros-20261014` — classify: integrated / unique / superseded / unsafe
- [ ] `design/messages-inspired-light-system-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `design/port-bridge-contrast-stencil-feed` — classify: integrated / unique / superseded / unsafe
- [ ] `design/shorter-homepage-2026-10-15` — classify: integrated / unique / superseded / unsafe

### docs (3)
- [ ] `docs/ask-intros-unified-roadmap-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `docs/phase1-activation-reconciliation-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `docs/safe-innovation-release-plan-20261019` — merged via PR

### feat (16)
- [ ] `feat/admin-connection-preflight-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/ask-intros-public-onboarding-release-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/evidence-aware-opportunity-readiness-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/home-platform-brand-strip-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/home-platform-logo-thumbnails-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/homepage-unified-platform-brand-strip-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/opportunity-evidence-transparency-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/opportunity-focus-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/opportunity-signal-evidence-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/opportunity-wheel-navigation-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/owner-admin-overview-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/premeeting-briefs-secure-messages-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/release-member-intelligence-panels-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/self-serve-signup-live-network-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/self-service-member-onboarding-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/shared-opportunity-exchange-20261018` — classify: integrated / unique / superseded / unsafe

### feature (14)
- [ ] `feature/accepted-intro-workspace-trackrecord-20261011` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/basic-intro-usage-transparency-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/business-lobby-consented-meetings-20261013` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/interactive-relationship-journey-20261013` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/interactive-timeline-option-wheel-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/marketplace-pilot-qualified-demand-20261012` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/network-connection-recovery-banner-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/onboarding-progress-clarity-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/open-basic-executive-applications-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/peer-accountability-navigation-20261011` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/public-news-deep-links-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/sitewide-ambient-parallax` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/system-scroll-caliper-20261013` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/wire-recovered-executive-modules` — classify: integrated / unique / superseded / unsafe

### fix (96)
- [ ] `fix/access-confirmation-and-rpc-failure-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/access-fetch-fail-closed-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/access-query-error-recovery-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/admin-error-report-truthful-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/admin-launch-write-receipts-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/admin-network-health-contract-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/admin-overview-error-recovery-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/admin-overview-request-race-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/approved-unconfirmed-member-status-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/ask-dock-mobile-suggestion-wrapping-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/ask-intros-final-readability-and-live-qa-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/ask-intros-member-activation-and-messages-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/ask-intros-orange-bot-logo-contrast` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/askintros-productwide-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/auth-verified-member-entry-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/compact-homepage-mobile-qa-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-early-access-navigation` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-manual-founding-claim-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-member-invite-retention` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-onboarded-live-member-gate-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/crm-import-recovery-validation-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/dark-mode-default` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/deal-room-browser-check-syntax-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/desktop-more-menu-clean-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/desktop-more-menu-mainline-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/desktop-more-width-clean-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/elevenlabs-owner-voice-status` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/elevenlabs-verified-personal-voice` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/executive-workbench-contrast-rebased-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/executive-workbench-intelligence-contrast-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/extract-member-mobile-overflow-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/grid-clipboard-row-recovery-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/grid-confirmed-writes-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/grid-contact-export-policy-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/grid-csv-import-preflight-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/grid-freeform-csv-preflight-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/handled-server-error-telemetry` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/home-platform-strip-above-headline-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/inbox-light-mode-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/inbox-selected-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/integration-audit-three-targeted-repairs-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/intent-exchange-confirmed-writes-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/intro-dialog-verified-consent-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/intro-inbox-two-member-contract-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/linked-grid-csv-import-guard-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/linkedin-homepage-thumbnail-local-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-chat-consistency-and-recency` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-directory-truth` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-intros-network-permissions-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-member-onboarding-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-network-gate-routing` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-network-permissions-honest-errors-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-network-reliability-access-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-network-signal-freshness-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-signup-intros-and-messages-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/matching-verified-path-evidence-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/member-directory-intro-read-contract-20261012` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/member-portrait-readability-release-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/member-portraits-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/message-thread-tiles-contrast-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/messages-selected-row-semantic-contrast-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/messages-thread-name-contrast-after-bridge-port` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/messages-thread-theme-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/mobile-ceo-command-panels` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/mobile-site-tour-and-nav-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/more-dropdown-clean-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/more-dropdown-width-195` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/more-menu-main-rebase-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/more-menu-readable-contrast-port-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/network-post-ask-save-receipts-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/onboarding-save-recovery-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/onboarding-social-count-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/open-onboarding-responsive-theme-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/outcome-modal-contrast-wireup-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/outcome-notes-hints-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/production-delivery-directory-relationship-20261013` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/public-news-match-member-editorial-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/read-aloud-page-and-mobile-playback` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/read-aloud-selection-audio-activation-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/readable-messages-light-surfaces-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/reconcile-live-write-acknowledgement-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/recovered-ui-polish` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/recovery-ci-and-syndication-20261011` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/recovery-ci-green` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/relationship-tier-collisions-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/restore-editorial-home-and-runtime-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/restore-truncated-app-20261013` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/salesforce-homepage-logo-local` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/secondary-message-and-capsule-acks-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/selection-reader-scroll-lifecycle-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/self-host-linkedin-hero-thumbnail-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/self-serve-member-readability-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/signup-and-live-intro-messaging-reliability` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/syndication-room-creator-read-20261011` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/verified-member-activation-reconciled` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/verify-portal-network-link-gate-20261018` — classify: integrated / unique / superseded / unsafe

### integration (4)
- [ ] `integration/deal-workspaces-reconcile` — classify: integrated / unique / superseded / unsafe
- [ ] `integration/executive-modules-reconcile` — classify: integrated / unique / superseded / unsafe
- [ ] `integration/private-library-reconcile` — classify: integrated / unique / superseded / unsafe
- [x] `integration/recover-unmerged-work` — verified zero commits ahead; no merge needed

### lovable-sync (1)
- [ ] `lovable-sync` — classify: integrated / unique / superseded / unsafe

### lovable-sync-1792085338 (1)
- [ ] `lovable-sync-1792085338` — classify: integrated / unique / superseded / unsafe

### main (1)
- [x] `main` — canonical target

### refactor (3)
- [ ] `refactor/intros-core-ui-types` — classify: integrated / unique / superseded / unsafe
- [ ] `refactor/intros-shell-types` — classify: integrated / unique / superseded / unsafe
- [ ] `refactor/live-directory-pagination` — classify: integrated / unique / superseded / unsafe

### release (1)
- [x] `release/rebase-cleanup-208-20261019` — verified zero commits ahead; no merge needed

### security (2)
- [ ] `security/fix-avatar-profile-privilege-20261012` — classify: integrated / unique / superseded / unsafe
- [ ] `security/lovable-scan-exposure-20261012` — classify: integrated / unique / superseded / unsafe

### test (1)
- [ ] `test/admin-analytics-payload-contract-20261017` — classify: integrated / unique / superseded / unsafe

### wire (4)
- [ ] `wire/business-feed-workspaces` — classify: integrated / unique / superseded / unsafe
- [ ] `wire/linkedin-profile-enrichment` — classify: integrated / unique / superseded / unsafe
- [x] `wire/linkedin-profile-enrichment-v2` — verified zero commits ahead; no merge needed
- [ ] `wire/recovered-executive-work-v2` — classify: integrated / unique / superseded / unsafe

## Open pull requests requiring disposition

- [ ] #203 allowance: 0093 migration number collision, do not merge yet.
- [ ] #125, #123, #117: overlapping signup migrations and activation changes.
- [ ] #104 design; #80/#60 LinkedIn; #74 executive modules; #63/#50 integration; #45 library; #44 workspaces; #12 hover; #1 demo identity: compare with `main`, security, and CI before merge or close.

See issue #211 for live database blockers. Do not confuse a green branch check or Lovable `is_published` with a verified live deployment.