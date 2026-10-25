# Membership update — preparation, not activation

The homepage signup button is larger and above the pictures. Basic signup requires no LinkedIn account. Membership screens describe the requested levels and explicitly report that the transition is pending.

## Checked
- 29 focused tests: signup/activation, LinkedIn flow, card layout, entitlement contracts.
- 20 synthetic isolated entitlement checks: Basic denial, LinkedIn networking, paid features/card eligibility, preserved legacy access, denied self-grants, anonymous denial, subscription status/expiry, suspension and unlinking.
- Automatic preview compilation passed.

## Not active
`docs/release-safety/member-entitlements.candidate.sql` is not applied or journaled. It is a preparation-only resolver and explicit guard, not a full security migration. Existing RLS, membership tiers, verification cards and paid subscription records remain unchanged.

Before applying: cover every direct feature write/read, SECURITY DEFINER entry, service-role handler, attachments and business workspace state. Preserve owner/participant restrictions and founder/admin gates. UI gating is not a security boundary.

## Decisions and dependencies
- LinkedIn ownership must come from the managed Auth identity, not a URL, profile field or user metadata. Confirm hosted identity schema/provider binding and enable the currently unavailable provider.
- Candidate conservatively treats active, positive-price, nonexpired Stripe subscriptions as paid; trials do not imply payment. Confirm billing lifecycle handling before activation.
- Existing black identity cards certify verification. Preserve codes/status/history; paid eligibility must not falsely claim verified identity or revoke existing cards. A compatible issuance policy remains required.
- One-time legacy snapshot preserves approved existing network access and Executive business access. Do not rerun snapshot insertion after new Basic registrations.
- Verify all three levels with legitimate accounts before publication. No live database changes or publication occurred.