# Ask Intros — Feature Completeness Audit

Method: a capability counts as **Working** only when the interaction was exercised in the
running preview (Playwright, desktop 1440 / tablet 768 / mobile 390 and 360) and produced a
real state change that survives a reload. Anything that renders but does not act is marked
**Display only**. Nothing here is marked complete from code reading alone.

Local persistence keys: `aetheris-v1` (network), `aetheris-platform-v1`, `aetheris-os-v1`,
`aetheris-moat-v1`, `aetheris-pro-v1`. Every collection has a Postgres table contract in
`src/aetheris/domain/schema.sql` with owner scoping and RLS, so a database adapter can replace
the local repository without touching any surface.

## 1. Foundation

| Capability | State | Evidence |
| --- | --- | --- |
| Editorial light / intelligence dark system, cobalt actions, amber signals | Working | Applied across every route; no horizontal overflow at 1440/768/390/360 |
| Unique portrait rule (no repeated face on a visible page) | Working | Portrait markers plus duplicate suppression; verified across Home, Discover, Intros, Messages, Needs, Memory, Insights, Profile |
| Home feed, posts, likes, comments, reposts, saves, feed preferences | Working | Persisted in `aetheris-v1` |
| Home **Social / Briefing** switch (Social default) | Working | Tabs at 1440/768/390/360 render the composed briefing and the professional inbox buckets |
| Onboarding into profile + Active Memory | Working | Writes profile, memories, Digital You |
| Global search (⌘K), mobile drawer navigation to every secondary route | Working | Permission page reached at 390 via the drawer |
| Radar / Active Memory Graph with live fits | Working | Ranked matches appear as clickable names |

## 2. Systems, Circles, Intent, Companies

| Capability | State | Evidence |
| --- | --- | --- |
| Systems, Circles, Intents, Outcomes, Loops, Organization | Working | CRUD through the platform repository |
| Golden Fit Report (weighted, with strengths, risks, unknowns, ideas) | Working | Renders per company with confidence and evidence labels |
| **Organization Relationship Passport embedded in the company view** | Working | Owners, open loops, dormant opportunities, departures and scoped chronology render inside the company detail |
| Handshake preparation, intent boards | Working | |

## 3. Relationship OS

| Capability | State | Evidence |
| --- | --- | --- |
| Opportunity Rooms, Relationship Inbox, Evidence Ledger | Working | |
| Relationship Twin, latent/invisible paths, Discover invisible layer | Working | |
| Network Simulation, Opportunity Collisions, Personal Strategy | Working | |
| Trust budget, intro quality review, voice-to-memory | Working | |
| Autopilot (approval-gated, never acts alone) | Working | Every action requires explicit approval |

## 4. Moat layer

| Capability | State | Evidence |
| --- | --- | --- |
| Professional Passport, credibility band | Working | |
| Network Constitution + outbound review on **Messages, intros, Ask Network, Knowledge, and Permission-to-Pitch** | Working | Review modal fired on a commercial message and on a permission request; verdicts Clear / Needs permission / Rewrite / Hold / Block |
| Ask My Network (routing preview, routed audience, logged replies, close) | Working | Routing explains why each member was chosen |
| Serendipity / unexpectedly relevant, with feedback | Working | |
| Consent Ledger with revocation | Working | |
| Network Time Machine (30/90/180/365, recorded vs modeled) | Working | Scrub changes the reconstructed state and labels modeled values |
| Outcome Attribution (direct / influenced / contextual) | Working | Trace renders the contributing edges |
| Event Mode, Gap Map, Portable Identity, Advisory Boards | Working | |

## 5. Professional home layer

| Capability | State | Evidence |
| --- | --- | --- |
| Opportunity Exchange → Opportunity Room → Deal Room | Working | Stage changes, diligence answers, recorded decisions, milestones, signature states all persist |
| Expertise, referrals, talent, capital, acquisition, boards | Working | |
| Intelligence Rooms, councils, briefing, events, travel, availability | Working | |
| **Permission-to-Pitch with real boundary enforcement** | Working | Categories match declared boundaries: one member returns *Permission required*, another returns *Boundary in force*; a demo/pricing message to a protected member is **held** in the composer with a route to a proper request |
| **Do-not-disturb on outbound messages** | Working | Commercial language to a member with a vendor boundary is blocked before sending, with the reason and a referral route |
| **Relationship Vault: real JSON/CSV download** | Working | Download event captured, file `aetheris-everything-<date>.json` |
| **Per-record import review (ImportProposal)** | Working | Six proposals per source with kind, action, provenance and default privacy scope; approve/reject per record; commit button commits only approved records; removing a source withdraws everything that arrived with it; approvals survive a reload |
| **Professional proof and contextual reputation on member profiles** | Working | Verified vs self-stated split, proof-of-work nodes with named evidence, reputation contexts; when nothing is recorded it says so rather than implying credibility |
| Marketplace, knowledge assets, transactions, concierge, Aetheris Standard | Working | |

## 6. Data contracts added or completed in this pass

- `ImportProposal` promoted from a bare type to a persisted collection: `importProposals` in
  `ProCollections`, table `import_proposals`, seeded proposals, and store actions
  `setProposalAccepted`, `commitImport`, `removeImportSource`.
- `AntiSpamReview`, `AskNetworkPost` / `NetworkQuestion`, `SerendipityMatch`,
  `OrganizationRelationshipPassport`, `NetworkSnapshot`, `OpportunityAttribution` were already
  typed, seeded and persisted; verified in the running product rather than assumed.
- Outbound review channel widened to include `pitch-request`.

## 7. Known open items

- A React development-only warning about a state update on an unmounted component appears
  intermittently. It is not reproducible on demand, produces no user-visible failure, and does
  not occur in a production build. Left open rather than claimed fixed.
- Import commits record the approved records and adjust the source state; they do not yet fan
  the approved rows out into individual people, memories and loops, because the target write
  paths for imported records are intentionally gated until a real data source is connected.
- All member, company and outcome data is fictional demo content. No production publish was
  performed.
