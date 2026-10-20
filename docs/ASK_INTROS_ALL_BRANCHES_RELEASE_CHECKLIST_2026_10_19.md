# Ask Intros: every GitHub branch and upgrade — reconciliation tracker

Snapshot 2026-10-19. 216 GitHub branches including `main`. Checked means verified merged or zero commits ahead of `main`; unchecked means audit and disposition needed, **not** necessarily that the feature is absent. Never bulk-merge old migrations or delete a publishing branch.

## Required order of work

- [x] PR #206: documentation-only release safety checklist merged to `main` (`e3da792`).
- [x] PR #208: seven-screen copy/readability cleanup merged to `main` (`adcb552`).
- [x] PR #212: existing-RPC Basic allowance UI merged to `main` (`d29ef68`); no migration or RLS change.
- [x] PR #203: unsafe duplicate migration closed as superseded by #212.
- [ ] Verify Lovable editor SHA and separately verify the published site's deployment SHA.
- [x] #1 legacy demo identity PR reviewed and closed as already integrated/superseded.
- [ ] Verify exact production DB, obtain read-only migration ledger and restorable backup.
- [ ] Reconcile missing live schema from migrations 0058–0077, collisions 0082/0090/0092 and reused 0093 in disposable DB first.
- [ ] Test each restored RPC/table with anon, member A, member B, admin, consent, and revoked access.
- [ ] Restore and smoke-test deal rooms, workspaces, library, referrals, meetings, track record, storefront, syndication and peer groups.
- [ ] Review current unique UI improvements: news deep links, onboarding progress, offline banner, parallax and ElevenLabs; rebase and test separately.
- [ ] Resolve all older open PRs and mark superseded ones; avoid duplicate signup, LinkedIn and CRM implementations.
- [ ] Review every branch below; preserve unique useful code and remove only safely superseded refs.

## All branches

### claude (50)
- [x] `claude/activation` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/agent-gateway` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/ai-business-analyst` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/ask-intros-name` — classify: integrated / unique / superseded / unsafe
- [x] `claude/ask-response-count` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/company-continuity` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/deal-rooms` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/demo-live-account-fixes` — core identity/demo badge integrated; obsolete CTA diff superseded; PR #1 closed
- [x] `claude/events` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/foundation` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/founding-cohorts` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/gmail-sms` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/google-calendar` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/growth` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/impact-report` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/leak-check` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/linkedin-import` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/linkedin-scan` — classify: integrated / unique / superseded / unsafe
- [x] `claude/live-notifications` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/meeting-calendar` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/meeting-outcomes` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/meeting-recording` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/membership-card` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/menu-contrast` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/messaging` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/migration-checks` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/outcome-spine-diagnose-route` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/peer-groups` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/pre-meeting-brief` — classify: integrated / unique / superseded / unsafe
- [x] `claude/providers` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/quick-menu` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/quick-menu-assistant` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/reciprocity` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/record-live-db-objects` — classify: integrated / unique / superseded / unsafe
- [x] `claude/reliability-admin` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/revenue` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/staging` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/stale-intro-requests` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/storefront` — classify: integrated / unique / superseded / unsafe
- [ ] `claude/syndication-rooms` — classify: integrated / unique / superseded / unsafe
- [x] `claude/this-week` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/track-record` — classify: integrated / unique / superseded / unsafe
- [x] `claude/track-record-agent-capsules` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/video-meetings` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/voice-control` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/warm-paths` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `claude/warm-referral-engine` — classify: integrated / unique / superseded / unsafe
- [x] `claude/weekly-digest` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `claude/workspace-sync` — verified ancestor of main at `b651b40d`; no merge needed
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
- [x] `design/editorial-luxury-ask-intros-20261014` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `design/messages-inspired-light-system-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `design/port-bridge-contrast-stencil-feed` — classify: integrated / unique / superseded / unsafe
- [ ] `design/shorter-homepage-2026-10-15` — classify: integrated / unique / superseded / unsafe

### docs (3)
- [x] `docs/ask-intros-unified-roadmap-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `docs/phase1-activation-reconciliation-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `docs/safe-innovation-release-plan-20261019` — merged via PR

### feat (16)
- [ ] `feat/admin-connection-preflight-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/ask-intros-public-onboarding-release-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `feat/evidence-aware-opportunity-readiness-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `feat/home-platform-brand-strip-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feat/home-platform-logo-thumbnails-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/homepage-unified-platform-brand-strip-20261018` — classify: integrated / unique / superseded / unsafe
- [x] `feat/opportunity-evidence-transparency-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `feat/opportunity-focus-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `feat/opportunity-signal-evidence-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feat/opportunity-wheel-navigation-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/owner-admin-overview-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/premeeting-briefs-secure-messages-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/release-member-intelligence-panels-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/self-serve-signup-live-network-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `feat/self-service-member-onboarding-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `feat/shared-opportunity-exchange-20261018` — verified ancestor of main at `b651b40d`; no merge needed

### feature (14)
- [x] `feature/accepted-intro-workspace-trackrecord-20261011` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feature/basic-intro-usage-transparency-20261019` — classify: integrated / unique / superseded / unsafe
- [x] `feature/business-lobby-consented-meetings-20261013` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `feature/interactive-relationship-journey-20261013` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feature/interactive-timeline-option-wheel-20261018` — classify: integrated / unique / superseded / unsafe
- [x] `feature/marketplace-pilot-qualified-demand-20261012` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feature/network-connection-recovery-banner-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/onboarding-progress-clarity-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/open-basic-executive-applications-20261019` — classify: integrated / unique / superseded / unsafe
- [x] `feature/peer-accountability-navigation-20261011` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feature/public-news-deep-links-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `feature/sitewide-ambient-parallax` — classify: integrated / unique / superseded / unsafe
- [x] `feature/system-scroll-caliper-20261013` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `feature/wire-recovered-executive-modules` — classify: integrated / unique / superseded / unsafe

### fix (96)
- [ ] `fix/access-confirmation-and-rpc-failure-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/access-fetch-fail-closed-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/access-query-error-recovery-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/admin-error-report-truthful-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/admin-launch-write-receipts-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/admin-network-health-contract-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/admin-overview-error-recovery-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/admin-overview-request-race-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/approved-unconfirmed-member-status-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/ask-dock-mobile-suggestion-wrapping-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/ask-intros-final-readability-and-live-qa-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/ask-intros-member-activation-and-messages-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/ask-intros-orange-bot-logo-contrast` — classify: integrated / unique / superseded / unsafe
- [x] `fix/askintros-productwide-contrast-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/auth-verified-member-entry-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/compact-homepage-mobile-qa-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-early-access-navigation` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-manual-founding-claim-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-member-invite-retention` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/confirmed-onboarded-live-member-gate-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/crm-import-recovery-validation-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/dark-mode-default` — classify: integrated / unique / superseded / unsafe
- [x] `fix/deal-room-browser-check-syntax-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/desktop-more-menu-clean-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/desktop-more-menu-mainline-20261019` — classify: integrated / unique / superseded / unsafe
- [x] `fix/desktop-more-width-clean-20261019` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/elevenlabs-owner-voice-status` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/elevenlabs-verified-personal-voice` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/executive-workbench-contrast-rebased-20261018` — classify: integrated / unique / superseded / unsafe
- [x] `fix/executive-workbench-intelligence-contrast-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/extract-member-mobile-overflow-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/grid-clipboard-row-recovery-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/grid-confirmed-writes-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/grid-contact-export-policy-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/grid-csv-import-preflight-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/grid-freeform-csv-preflight-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/handled-server-error-telemetry` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/home-platform-strip-above-headline-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/inbox-light-mode-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/inbox-selected-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/integration-audit-three-targeted-repairs-20261019` — classify: integrated / unique / superseded / unsafe
- [x] `fix/intent-exchange-confirmed-writes-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/intro-dialog-verified-consent-20261015` — classify: integrated / unique / superseded / unsafe
- [x] `fix/intro-inbox-two-member-contract-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/linked-grid-csv-import-guard-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/linkedin-homepage-thumbnail-local-20261018` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-chat-consistency-and-recency` — classify: integrated / unique / superseded / unsafe
- [x] `fix/live-directory-truth` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/live-intros-network-permissions-20261015` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/live-member-onboarding-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/live-network-gate-routing` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/live-network-permissions-honest-errors-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-network-reliability-access-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-network-signal-freshness-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/live-signup-intros-and-messages-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/matching-verified-path-evidence-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/member-directory-intro-read-contract-20261012` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/member-portrait-readability-release-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/member-portraits-contrast-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/message-thread-tiles-contrast-20261018` — classify: integrated / unique / superseded / unsafe
- [x] `fix/messages-selected-row-semantic-contrast-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/messages-thread-name-contrast-after-bridge-port` — classify: integrated / unique / superseded / unsafe
- [x] `fix/messages-thread-theme-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/mobile-ceo-command-panels` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/mobile-site-tour-and-nav-20261015` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/more-dropdown-clean-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/more-dropdown-width-195` — classify: integrated / unique / superseded / unsafe
- [x] `fix/more-menu-main-rebase-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/more-menu-readable-contrast-port-20261019` — classify: integrated / unique / superseded / unsafe
- [x] `fix/network-post-ask-save-receipts-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/onboarding-save-recovery-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/onboarding-social-count-20261019` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/open-onboarding-responsive-theme-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/outcome-modal-contrast-wireup-20261017` — classify: integrated / unique / superseded / unsafe
- [x] `fix/outcome-notes-hints-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/production-delivery-directory-relationship-20261013` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/public-news-match-member-editorial-20261019` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/read-aloud-page-and-mobile-playback` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/read-aloud-selection-audio-activation-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/readable-messages-light-surfaces-20261015` — classify: integrated / unique / superseded / unsafe
- [x] `fix/reconcile-live-write-acknowledgement-20261015` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/recovered-ui-polish` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/recovery-ci-and-syndication-20261011` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/recovery-ci-green` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/relationship-tier-collisions-contrast-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/restore-editorial-home-and-runtime-20261015` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/restore-truncated-app-20261013` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/salesforce-homepage-logo-local` — classify: integrated / unique / superseded / unsafe
- [x] `fix/secondary-message-and-capsule-acks-20261015` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/selection-reader-scroll-lifecycle-20261017` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `fix/self-host-linkedin-hero-thumbnail-20261018` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `fix/self-serve-member-readability-20261017` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/signup-and-live-intro-messaging-reliability` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/syndication-room-creator-read-20261011` — classify: integrated / unique / superseded / unsafe
- [ ] `fix/verified-member-activation-reconciled` — classify: integrated / unique / superseded / unsafe
- [x] `fix/verify-portal-network-link-gate-20261018` — verified ancestor of main at `b651b40d`; no merge needed

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
- [x] `refactor/intros-core-ui-types` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `refactor/intros-shell-types` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `refactor/live-directory-pagination` — verified ancestor of main at `b651b40d`; no merge needed

### release (1)
- [x] `release/rebase-cleanup-208-20261019` — verified zero commits ahead; no merge needed

### security (2)
- [x] `security/fix-avatar-profile-privilege-20261012` — verified ancestor of main at `b651b40d`; no merge needed
- [x] `security/lovable-scan-exposure-20261012` — verified ancestor of main at `b651b40d`; no merge needed

### test (1)
- [x] `test/admin-analytics-payload-contract-20261017` — verified ancestor of main at `b651b40d`; no merge needed

### wire (4)
- [x] `wire/business-feed-workspaces` — verified ancestor of main at `b651b40d`; no merge needed
- [ ] `wire/linkedin-profile-enrichment` — classify: integrated / unique / superseded / unsafe
- [x] `wire/linkedin-profile-enrichment-v2` — verified zero commits ahead; no merge needed
- [ ] `wire/recovered-executive-work-v2` — classify: integrated / unique / superseded / unsafe

## Open pull requests requiring disposition

- [x] #203 allowance: closed as superseded by merged #212; conflicting 0093 migration was not applied.
- [ ] #125, #123, #117: overlapping signup migrations and activation changes.
- [x] #1 demo identity: closed as superseded; identity and desktop/mobile demo indicators verified in main; old landing CTA diff obsolete.
- [ ] #104 design; #80/#60 LinkedIn; #74 executive modules; #63/#50 integration; #45 library; #44 workspaces; #12 hover: compare with `main`, security, and CI before merge or close.

See issue #211 for live database blockers. Do not confuse a green branch check or Lovable `is_published` with a verified live deployment.