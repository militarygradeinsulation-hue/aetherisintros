# Three membership access levels

## Member experience
- **Basic:** Free signup without LinkedIn. Members can create/edit their profile and browse people and activity. Posting, messages, introductions, and business tools stay locked with a clear upgrade action.
- **LinkedIn verified:** Ownership verification opens networking features, including posting, messages, and introductions. Business tools remain paid-only. A pasted profile link is not treated as verified ownership or professional-role proof.
- **Paid:** A valid paid membership opens all member features and the black ID card. Administrative and founder-private features retain their separate permissions.

Keep the larger Create free account button above the homepage pictures. Preserve existing signup, onboarding, invitations, live records, and saved drafts.

## Technical implementation
1. Reconcile the existing Basic/Executive permissions, LinkedIn identities, payment records, and card issuance into one server-owned entitlement lookup. Preserve established member grants rather than silently downgrade existing members.
2. Enforce Basic and intermediate restrictions at write endpoints and database boundaries, not merely by hiding buttons. Audit direct writes and privileged RPCs for posting, messaging, introductions, and business tools.
3. Use authenticated LinkedIn ownership evidence only. The current LinkedIn sign-in option is disabled; ownership verification remains unavailable until its provider is configured.
4. Reuse the existing Stripe checkout and subscription updates. Grant paid access only from verified payment records, not browser flags or successful-checkout URLs. Active subscriptions retain access through their paid period; inactive subscriptions lose paid entitlements.
5. Tie the black member ID card to paid eligibility and preserve existing verification/revocation safeguards. Do not invent pricing or activate inactive plans.

## Validation and rollout
- Add concrete tests: Basic can edit its own profile and browse but cannot post, message, request introductions, or use business tools; verified LinkedIn grants networking but not paid tools; paid grants member features but never administrative/private access.
- Test URL-only verification rejection, direct-write bypass attempts, payment cancellation, card eligibility, existing member preservation, and cross-account access.
- Validate forward-only permission changes in an isolated database before any live migration. Never edit historical migrations.
- Check the signup and upgrade journeys on phone and desktop with genuine account states. No publication without approval.

## Setup blocker
LinkedIn ownership verification cannot be exercised until LinkedIn sign-in is configured. Basic signup remains usable throughout.