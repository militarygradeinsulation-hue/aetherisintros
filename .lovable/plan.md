# Simplify the signed-in Ask Intros product

## Goal
Turn the signed-in product into five obvious destinations—Home, Network, Work, Messages, and Me—while preserving every existing capability, record, permission, verification rule, and deep-linkable internal page.

## Navigation and routing
- Make `pageMeta` the single source of truth for exactly five primary destinations: Home, Network, Work, Messages, and Me.
- Add internal `work` and `me` hub IDs while retaining all existing page IDs and renderers for global search, Ask Intros actions, saved state, and direct internal links.
- Remove Social View as a visible destination and concept; legacy `simple` state opens Home instead.
- Replace the current feature directory with a small utility menu containing only Security & Privacy, Connected Apps, Preferences, Help, Founder Story, and Sign Out.
- Keep global search capable of finding advanced tools and opening their existing pages, without exposing them in persistent navigation.
- Use the same five destinations in the desktop rail and mobile bottom bar.

## Five product hubs
- **Home:** replace the long signed-in dashboard with a concise executive brief: What matters now, changing signals, people who matter, Active Memory/open loops, pipeline movement, meetings/tasks, and a compact in-app news section. Keep one clear action for posting a need/signal and Ask Intros always available.
- **Network:** create one hub with People, Intros, Companies, Circles, and Events tabs. Reuse the existing member, intro, company, circle, and event components and actions. Surface discovery filters, directory search, expertise, talent, Ask Network, serendipity, gaps, and passport context inside relevant tabs through compact contextual panels and advanced actions. Preserve WHY ME / WHY THEM / WHY NOW on decisions.
- **Work:** create one operating hub with CRM, Pipeline, Grid, Calendar, and Forecast tabs. Reuse `OpsProvider`, CRM records, linked Grid sheets, calendar state, opportunities, tasks, rooms, and outcomes directly so no data is copied. The opening composition will show how the same people, opportunities, tasks, sheets, and calendar commitments connect.
- **Messages:** retain private threads and outbound safeguards, then organize intro context, meeting context, relationship context, drafts, and open commitments within the existing conversation surface instead of separate navigation.
- **Me:** combine profile, verified identity/passport, privacy and permissions, security/session controls, preferences, connected apps, and vault/export into a small set of clear grouped tabs or tiles. Verification and account security stay prominent.

## Shared visual system
- Add reusable signed-in primitives for hub headers and `TileShell` / `FeatureTile` compositions with hero, wide, tall, compact, data, graph, and action variants.
- Standardize the signed-in palette and geometry around near-black backgrounds, graphite tiles, 1px hairlines, 8–10px radii, ivory type, cobalt actions/verification, and restrained amber signals.
- Give each hub a distinct composition and mini-visual language: daily signal timeline for Home, radar/paths for Network, pipeline/grid/calendar linkage for Work, conversation/context split for Messages, and identity/lock stacks for Me.
- Remove redundant page-within-page navigation and excessive explanatory blocks from the five hub openings while leaving advanced standalone pages intact.

## Preservation and safety
- Do not change database schema, RLS, authentication, membership verification, evidence storage, or account gating.
- Keep live mode restricted to real approved and verified member data; keep demo data isolated under `/demo`.
- Preserve CRM/Grid canonical writes, linked-sheet write-through, messages, memory, opportunities, introductions, calendars, exports, and integrations.
- Preserve old page IDs and advanced renderers; map obsolete stored values safely to their parent hub where appropriate.
- Keep Ask Intros navigation/actions working, remapping common requests to the five hubs while allowing explicit advanced-tool requests.

## Verification
- Check desktop and mobile layouts for Home, Network, Work, Messages, and Me.
- Confirm persistent navigation shows only the five destinations and the utility menu stays small.
- Verify key interactions in demo mode: member/profile/introduction actions, conversation opening, CRM creation, Grid workbook access, opportunity/pipeline view, calendar view, profile/preferences/security surfaces, global search, and Ask Intros access.
- Confirm legacy advanced pages remain reachable through global search or contextual actions.
- Confirm the preview builds cleanly, has no horizontal overflow, and remains unpublished.

## Assumptions
- “Deep links” inside the current single `/app` shell means preserving page IDs, saved state, global search targets, and Ask Intros navigation rather than creating dozens of new public URL routes.
- The existing backend and security policies remain untouched because this is an information-architecture and presentation consolidation.
