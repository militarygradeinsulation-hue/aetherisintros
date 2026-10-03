# Verify professional info (LinkedIn enrichment) — plan

## What exists today
- `crm_people` is the canonical person record (owner-scoped RLS, `owner_id = auth.uid()`). It already has `title`, `company_name`, `company_id`, `location`, `linkedin_url`, `source`, `custom` jsonb, `member_id`/`profile_id` links.
- Capabilities are registered in `src/aetheris/capabilities/registry.ts` (outcome-language IDs, max 4 verbs per subject), run through `capability_runs` / `capability_proposals` / `approval_queue` (Level 1: reads free, writes need approval), and open in the single Capability Workspace.
- Drizzle forward-only migrations; latest is `0013`.
- Lovable's LinkedIn connector covers only the **signed-in member's own identity** (`/v2/userinfo`) and posting. It has **no people search**. So Lovable has no direct way to look up other people on LinkedIn at runtime today.

## Recommendation: two small tables, no copy of people

```text
crm_people (canonical, unchanged shape)
   1 ── n  person_external_profiles   (one row per person + provider + external id: "this is their LinkedIn")
   1 ── n  person_enrichment_snapshots (append-only: what the provider said, when)
```

Simpler setups don't hold up. Putting everything in `crm_people.custom` loses history and can't enforce dedupe. A full copy of people would create duplicates.

### person_external_profiles (the confirmed link)
- `id`, `owner_id` (cannot be changed), `person_id` → crm_people (cascade), `provider` ('linkedin'), `external_url` (normalised `linkedin.com/in/<slug>`), `external_handle` (slug)
- `status`: candidate | confirmed | rejected | conflict
- `confirmed_by`, `confirmed_at`, `last_checked_at`, `last_changed_at`, `latest_snapshot_id`
- Unique `(owner_id, provider, external_handle)`. One LinkedIn profile maps to at most one person per account, which blocks silent duplicates. Partial unique `(person_id, provider) WHERE status='confirmed'`.

### person_enrichment_snapshots (append-only history)
- `id`, `owner_id`, `person_id`, `external_profile_id` (nullable while still a candidate), `provider`, `source_channel` ('assistant_connector' | 'direct_api' later), `run_id` → capability_runs
- `query` jsonb (the name/company/title/location used), `normalized` jsonb (name, title, company, location, follower_count, profile_url), `content_hash`, `checked_at`, `match_confidence` (0–1), `match_reasons` text[]
- No UPDATE or DELETE grants for authenticated users. Rows come in only through a server function. Rows with the same `content_hash` for the same profile are not inserted again; only `last_checked_at` is bumped.

RLS on both tables: owner-only SELECT. All writes go through security-definer RPCs. Minimum grants, with no TRUNCATE, REFERENCES or TRIGGER, matching the existing capability tables.

## Capability `enrich.person.professional`
- Label: **Verify professional info**. Contextual variants: "Find on LinkedIn" (no link yet), "Refresh professional info" (link confirmed), "Verify role/company" (confirmed but stale, or CRM fields differ).
- Subject: person. Impact: read plus proposed writes. Cost: Light. External: yes, so the workspace shows "Checks LinkedIn for: <name>, <company>" before it runs. It only runs when the user starts it.
- Output: candidates → selected profile → field-level proposals → provenance ("LinkedIn · checked <date>").
- Lifecycle (existing): REQUESTED → CONTEXT_BUILT → NEEDS_INPUT (pick a candidate) → PROPOSALS_READY → NEEDS_APPROVAL → APPLIED. UNAVAILABLE when no provider is connected.
- Entry points: Person profile "Do more", the CRM contact drawer, warm-path rows and intro suggestion cards. Each opens the same workspace.

## Match and dedupe rules
- Score each candidate on: exact or near name match (required), company match to `company_name` or a linked company, title similarity, location, and an existing `linkedin_url` slug match (strongest signal).
- High confidence means: name match, plus a slug match or both company and title match, plus exactly one candidate above the threshold. Anything else is ambiguous, and the user must pick.
- If the selected profile is already confirmed on a **different** person, there is no import. Instead the user gets a "Possible duplicate — merge?" proposal. Merging is never automatic.
- The user can mark a candidate "Not this person", which stores a rejected row so it isn't suggested again.

## Conflict handling (per field: title, company, location, linkedin_url)
- CRM field is empty and confidence is high: a "fill" proposal, pre-ticked but still applied only on approval. Level 1 allows auto-apply only if the user later raises autonomy.
- CRM field differs: a "conflict" proposal showing both values side by side (Keep mine / Use LinkedIn). The snapshot is always saved. The CRM field changes only after approval.
- Company changes propose updating `company_name` only. Linking or creating a `crm_companies` row is a separate proposal.
- Every change applied writes an `entity_events` provenance event (field, old, new, source snapshot id).

## Identity and relationship intelligence
- LinkedIn verification is a **contact-data** signal and never a **member identity** signal. It does not change a member's verified executive status, approval, or Passport. If the person is linked to a member (`member_id`/`profile_id`), the member's self-declared profile wins. Differences show as "Profile differs from public LinkedIn" to the owner only.
- Relationship strength, warm paths, memory and Digital You are never overwritten. Enrichment feeds them as evidence:
  - a role or company change creates a "Role change" signal for Home and Insights and a memory event ("Mara moved to COO at X")
  - freshness adds a small boost or penalty to match confidence in intros
  - a stale profile (older than 90 days) adds a gentle "Refresh?" chip, at most 2 chips

## Privacy, rate limits, storage
- Every lookup is started by the user. There is no background or bulk enrichment, and private notes or emails are never sent in a query.
- Limits use the existing `capability_limits` / `capability_usage`: for example 1 refresh per person per 24h, and a daily account cap (admin-configurable). A refresh inside the window returns the cached snapshot plus a "Checked 3h ago" message.
- **Stored long-term:** normalised public professional fields, profile URL, follower count, query, timestamps, confidence and hash.
- **Not stored:** raw provider payloads beyond the normalised fields, posts, photos (link only), other people seen in results that the user did not select (candidates live only on the run and are purged when it closes or after 7 days), and any data from contacts the user didn't ask about.
- Deleting a person cascades and removes their profiles and snapshots.

## UI
- **Person card:** a small "LinkedIn · verified Sep 12" line or "Not verified", plus an amber dot only when a change was detected.
- **Profile page / CRM drawer:** a "Professional info" module with current title, company and location (with source), a link to the profile, last verified date, the change history timeline (from snapshots), any open conflicts, and the Refresh action.
- **Workspace:** candidate list (name, title, company, location, followers, link, confidence reasons), then a select step, then a field-by-field diff with approve or keep options.

## A) Can be wired now (with the ChatGPT-side connector)
1. Migration `0014`: both tables, RLS, grants, append-only trigger, unique indexes, and RPCs `ingest_enrichment_candidates`, `confirm_external_profile`, `reject_external_profile`.
2. Provider adapter interface `ProfessionalProfileProvider { search(query) → NormalizedCandidate[] }` with Zod-validated `NormalizedCandidate`. First adapter: `assistant_connector`.
3. **Handoff ingestion:** the workspace shows "Waiting for lookup" with a one-time run token (bound to owner, run and person, single-use, expires after 30 min). ChatGPT-side runs the LinkedIn lookup and posts normalised results to `POST /api/public/enrichment/ingest`. The handler checks the HMAC-signed token, validates the schema, caps at 10 candidates, and limits fields to the allowed list. Results land on the run, and the user picks one in Intros. A manual path also works: paste a LinkedIn URL plus fields, saved as `source_channel='manual'`, lower confidence.
4. Capability registration, Do more and chip ranking, the workspace steps, field proposals through the existing approval flow, entity_events, the role-change signal, and the profile and card UI.
5. Tests: isolation (owner A cannot see B's snapshots or ingest into B's run), token replay and expiry, dedupe hash, duplicate-person proposal, no change without approval, phrase routing ("find Mara on LinkedIn", "is her title still right?").

## B) Needs a direct runtime provider later
- One-click lookup fully inside Intros, with no ChatGPT step. This needs a licensed people-search API (LinkedIn partner access or a compliant enrichment vendor) added as a second adapter (`direct_api`). The contract, tables and UI stay the same.
- Scheduled freshness checks and automatic role-change alerts.
- Company-page enrichment, post or activity signals, and photos. Each of these is out of scope until a provider supports them under its terms.
- The current Lovable LinkedIn connector could later be used only to verify the **member's own** LinkedIn identity at sign-up (userinfo). That would be a separate, optional identity badge, not contact enrichment.

## Open decision to confirm
- The ingestion endpoint assumes ChatGPT can call a URL with a token. If your ChatGPT setup can only return text, I'll make the paste-in path the primary handoff instead: paste the lookup result, and Intros parses and validates it.
