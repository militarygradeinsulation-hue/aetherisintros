# Specter Detect release gates

Current implementation is a **local-only preview**; no production scan service or persistent storage exists.

- [x] Isolated member-authenticated preview route
- [x] Explicit user-supplied evidence, with validation and initial redaction
- [x] Permissioned capture utility (not wired to browser or invoked automatically)
- [ ] Threat-model and harden URL validation (private IP ranges, DNS rebinding, redirect handling) before any server-side fetching
- [ ] Build and unit tests pass in CI
- [ ] Capture reviewed by privacy/security owner; user consent and per-site allowlist
- [ ] Tenant-scoped storage migration via Drizzle ONLY, with grants/RLS/immutability tests
- [ ] Confirm migration journal against production ledger before any migration
- [ ] Connect existing company page and Golden Report adapters
- [ ] Verify real member auth, denial cases, and no cross-tenant access
- [ ] Merge and confirm deployed revision

Do not add files to frozen supabase/migrations history. Do not use a service-role bypass to make member reads work.
