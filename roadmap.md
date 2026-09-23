# Aetheris specification completion

## Public Ask Intros brand lockup (Sep 23)
- [x] Replace the old public header image-and-text brand with the approved reusable SVG lockup.
- [x] Add a responsive hero lockup above the existing Founding 1,000 copy without changing page functionality.
- [x] Update the site icon from the same mark and verify desktop/mobile overflow and duplicate branding.

## Complete mobile fit pass (Sep 23)
- [x] Make the shared shell, navigation, overlays, Ask Intros, and voice controls safe across phone widths and safe areas.
- [x] Reflow content, actions, forms, Home widgets, and settings without clipping or removing information.
- [x] Preserve message context and relationship context through mobile disclosures instead of hide-only rules.
- [x] Give CRM, pipeline, Grid, Calendar, and other wide tools bounded horizontal-scroll behavior.
- [x] Verify public and signed-in/demo journeys at 360px, 390px, and tablet widths without publishing.

## Five-hub signed-in redesign (Sep 23)
- [x] Replace persistent navigation with Home, Network, Work, Messages, and Me only.
- [x] Consolidate existing functionality into five distinct hub compositions without changing data or security contracts.
- [x] Replace the feature directory with a small utility menu while preserving advanced search/deep access.
- [x] Verify all five hubs, legacy destinations, core CRM/Grid/opportunity interactions, and desktop/mobile layouts.
- [x] Rebalance Home tiles into full-width rows without unused grid space and promote News to persistent navigation.

## Customizable Home (Sep 23)
- [x] Add an edit mode for reordering, resizing, hiding, and restoring Home widgets.
- [x] Persist each member’s Home layout without changing shared network, CRM, or security data.
- [x] Verify customization, reset behavior, desktop layout, and mobile layout.

## Supplied interaction style integration (Sep 22)
- [x] Refine the public Home entrance while preserving Ask Intros identity, portrait, copy, and actions.
- [x] Add an animated asymmetric capability grid grounded in real Ask Intros functions.
- [x] Add a fifth Calendar Timeline view with persistent drag, keyboard movement, zoom, and existing event editing.
- [x] Verify Home and Calendar across desktop/mobile, interactions, and runtime health.

- [x] Keep the public Aetheris landing page at the root URL for signed-in and signed-out visitors; remove the rejected access-screen portrait.
- [x] Reflow the complete Founder Story manuscript into a consistent, literal book-reading layout without changing its wording.

- [x] Add a complete Events network with persistent save and registration actions.
- [x] Add Preferences & Customization with persistent profile, recommendation, privacy, and memory controls.
- [x] Add global people/company/topic search to the authenticated frame.
- [x] Verify every destination and core interaction across desktop and mobile.
- [x] Replace prominent portraits with unique candid photography and fictionalize the demo cast.

# Relationship Operating System upgrades

- [x] Opportunity Rooms as a first-class workspace with stage, people, systems, loops, timeline and outcome.
- [x] Relationship Twins on member profiles with explicit inference labelling and privacy guard.
- [x] Network Simulation in qualitative bands with save, strategy and room conversion.
- [x] Opportunity Collisions with timing windows, room conversion and Insights surfacing.
- [x] Invisible network layer with direct / warm / contextual paths in Discover and on profiles.
- [x] Trust Budget guidance inside the intro flow and connector cautions.
- [x] Intro Quality Review gating sends that are not ready.
- [x] Relationship Inbox with lanes, reasons and completion.
- [x] Evidence Ledger and Evidence Drawer behind every claim.
- [x] Voice-to-memory capture with per-item approval.
- [x] Approval-gated Autopilot queue.
- [x] Personal network strategy with progress, gaps and next moves.
- [x] Home attention strip wiring the OS into the daily surface.
- [x] Postgres schema for all OS tables with ownership, privacy scope and RLS enabled.
- [x] Desktop and mobile QA across every new destination and workflow; build and typecheck clean.

# Visual clarity and navigation cleanup

- [x] Restore the earlier Aetheris Home masthead treatment without the newly introduced person image.
- [x] Prevent popovers, drawers, and dropdown content from overlapping surrounding copy.
- [x] Strengthen section separation and visual flow without adding dashboard noise.
- [x] Make top tab rows horizontally scrollable with no clipped destinations.
- [x] Verify portrait uniqueness and the visual cleanup across desktop and mobile.

## Home + Ask Network pass (Sep 10)
- [x] Ask Network page styled (composer, audience chips, routed rows, replies)
- [x] Shared dialog/overlay/chip/meter styles for previously unstyled blocks
- [x] Removed Active Memory Graph from the Home page
- [x] Restored original Ask Intros home wording, kept the picture

- [x] IA pass: 7 primary destinations + More index drawer, central page metadata, global Briefing mode, mobile Home/Discover/Intros/Messages/More

## Live early-access network (Sep 11)
- [x] Launch settings, early-access members, whitelist, invitations, waitlist, roles + RLS
- [x] Atomic founding-place claim (1-1000) and waitlist overflow
- [x] Live-only data layer (src/aetheris/live.ts); demo catalogue quarantined to /demo
- [x] Public landing, /early-access, /auth, real /onboarding, admin launch control
- [x] Auth required again; /app gated on approved + onboarded
- [x] First account to sign up becomes the launch administrator
- [x] docs/LIVE_NETWORK_AUDIT.md route/data-source audit
- [x] Typecheck + build clean; public routes verified with no errors or overflow
- [ ] Signed-in end-to-end pass (needs the first real confirmed account)

# Live network honesty + starter directory

- [x] Remove all manufactured records, example lists and invented statistics from the signed-in network.
- [x] Import the uploaded company and contact lists as a real lookup directory members can search.
- [x] Add every new signup to that directory automatically.
- [x] Add a Directory page with search by name, company, industry and location.

# Profile identity + share metadata (Sep 13)
- [x] Finish editable profile name/photo and verify persistence.
- [x] Set /onboarding social/search image to Ask Intros instead of the default thumbnail.
- [x] Verify Messages sends, threads and persistence across demo/live paths.

# Navigation and visual simplification (Sep 13)
- [x] Keep only four primary destinations plus More in persistent navigation.
- [x] Consolidate create, profile, preferences, Briefing, and context controls into one Actions menu.
- [x] Remove duplicate related-tools navigation strips.
- [x] Reduce Network and Opportunities hubs to four primary sections each.
- [x] Make the context rail optional and hidden by default.
- [x] Verify desktop and mobile journeys, overlays, and overflow.

# Editorial Home redesign (Sep 14)

- [x] Replace only Home with the ivory/black editorial relationship-intelligence composition.
- [x] Connect Home metrics, priority relationships, filters, sorting, search, and actions to current state.
- [x] Verify desktop and mobile Home rendering, interactions, and overflow.
- [x] Restore the editorial photographic portrait to the Home masthead.

# Home connections + theme (Sep 14)

- [x] Replace connection initials with recognizable platform logos.
- [x] Make Home dark below its light top bar by default and add a persistent light/dark switch.
- [x] Verify the updated Home at desktop and mobile sizes.

# Social View ledger fidelity (Sep 14)
- [x] Recompose Social View to match the supplied Intro Ledger.
- [x] Verify connected actions, desktop/mobile layout, and build health.
- [x] Replace the Social View navy and blue palette with the site's black, white, and amber system.
- [x] Align Simple Mode typography, surfaces, controls, and accent roles with the signed-in Aetheris interface.

# Memory readability + member directory (Sep 14)

- [x] Rework “What Intros learned recently” so long context and metadata fit cleanly.
- [x] Default the Directory to real signed-up members and retain reference records as an optional view.
- [x] Add direct profile access for every member who has completed profile setup.

# Compact page imagery (Sep 14)

- [x] Reduce page-top imagery everywhere except Home.
- [x] Verify visual balance and flow on desktop and mobile.

# Mobile menu visibility (Sep 15)

- [x] Keep mobile header actions visible without clipping or wrapping below the fixed bar.
- [x] Keep the navigation and Create panels inside the viewport with independent scrolling.

# CEO positioning (Sep 16)

- [x] Position Ask Intros as “The Relationship Network for CEOs.” across the public homepage and signed-in Home.
- [x] Use “Who matters. Why they matter. Why now.” consistently in search and social metadata.

# Founder Story micro-book (Sep 16)

- [x] Build the 19-chapter founder micro-book at `/founder-story` without adding facts beyond Joseph’s source material.
- [x] Add restrained entry points on public Home, signed-in Home, and Joseph’s founder profile surfaces.
- [x] Add page metadata and sitemap inclusion, then verify desktop/mobile layout and navigation.

# Aetheris CRM + Aetheris Grid (Sep 16)

- [x] Private, account-scoped record layer: people, companies, pipelines/stages, opportunities, activities, tasks, notes, tags, custom fields, change ledger, entity links — every table owner-locked.
- [x] Grid schema: workbooks, sheets (linked/freeform), columns, rows, saved views.
- [x] Safe formula engine (SUM/AVERAGE/COUNT/MIN/MAX/ROUND/IF/CONCAT/TODAY/NOW, cell refs, ranges) with visible errors instead of code execution.
- [x] CRM module: Overview, People, Companies, Opportunities (table + pipeline board), Activities, Tasks, Analytics, record detail with timeline, notes and network intelligence.
- [x] Grid module: linked sheets over canonical records, freeform sheets, keyboard navigation, paste, CSV import/export, column types, freeze, sort/filter, templates.
- [x] Once-and-done: linked cell edits write the canonical record; new linked rows create canonical records.
- [x] Navigation: CRM and Grid in the rail, cross-links between modules, “Add to CRM” / “Open in CRM” on member profiles.
- [x] Global search across network people, CRM records and Grid sheets, plus quick-create commands.
- [ ] Signed-in end-to-end verification (create/edit records, linked-sheet write-through) — blocked: no preview session could be minted for authenticated checks.

## Membership verification + security layer (Sep 16)
- [x] Verification schema, RLS, private proof bucket, audit + security event tables
- [x] Business-role checking engine (provider-neutral adapter, no fabricated results)
- [x] Member verification portal at /verify, gated network access
- [x] Reviewer console at /admin/verification (role-gated, audited)
- [x] Security & Privacy settings: verification, MFA status, sessions, events, export, deletion, proof retention
- [x] Editorial verified badges (CEO / FOUNDER / OWNER / MANAGING PARTNER)
- [x] Showcase the "One Connected System for CEOs" panel on the logged-out home page (uploaded reference)
- [ ] Real third-party identity/KYC provider still requires an external service + credentials

## Cinematic footer (Sep 22)
- [x] Public Home closes with a GSAP cinematic footer: scrolling marquee (Know Who Matters / Why They Matter / Why Now / Verified Members / Double Opt-In / Private by Default), blueprint grid + cobalt aurora glow, giant parallax INTROS backdrop, glowing "The Relationship Network for CEOs." heading, magnetic glass pills (Create an account, Log in, Read My Story, Join the whitelist, back-to-top), legal strip; reduced-motion safe, mobile verified.

## Ambient relationship field (Sep 22)
- [x] Extend restrained, interactive constellation motion behind every authenticated and demo workspace while preserving readability and reduced-motion preferences.

## News thumbnail resilience (Sep 22)
- [x] Decode malformed publisher image addresses and provide a branded editorial thumbnail whenever a story has no image or its publisher blocks loading.

## Voice
- [x] Read aloud anywhere (top-bar speaker, per-page and per-reply speakers, reading bar with pause/next/speed, read-on-tap) plus Ask Intros voice control and conversation mode, with Settings → Display → Voice controls.

## Unified Executive Page and relationship doorway (Sep 23)
- [x] Add minimal persisted executive identity, Open To, scheduling, and recommendation data with strict access controls.
- [x] Replace member detail with the unified Executive Page and private viewer context over canonical CRM data.
- [x] Make Network lead with “Who do you need?” and top-five evidence-based matching.
- [x] Make Me editing mirror the Executive Page with a live preview and read-only verification status.
- [x] Validate identity, CTA, signals, private context, responsive fit, and policy boundaries; authenticated write-through remains sign-in dependent.

## Opportunity Graph OS (Sep 23)
- [x] Data foundation: missions, intent columns + private-safe Signal policy, capsules, relationship rooms, intro feedback, delegates, passports, Digital You rules.
- [x] Deterministic graph engine: mission fit, weather, trust dimensions, routing, reverse discovery, brief/debrief, rules, insights.
- [x] Home tiles, Network rerank + reverse discovery, Executive Page panels, CRM weather, Needs Intent Exchange, Autopilot rules, Organization delegates, Passport manager + public link, Ask Intros offline answers.
- [ ] Cross-account checks (capsule approval, room, shared feedback, network passport, delegate sign-in) — needs a second verified account.

## CEO Operating System (Sep 23)
- [x] Home CEO Now tiles (What Changed, Company Pulse, Chief of Staff, Approvals), Who Can Change This, Decision Room, Commitments on canonical CRM tasks, Relationship Health, Prepare me / Close the meeting, Forecast confidence + delta, Network ROI, Executive/Board/Investor brief, Approval queue, Ask Intros offline commands, Trust Passport.
- [ ] Signed-in write-through checks (decisions, approvals, commitments, meeting close) — needs a signed-in verified account in the preview.
