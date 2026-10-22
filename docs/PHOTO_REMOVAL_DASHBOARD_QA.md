# Photo-free banners and focused Dashboard

## Changes
- `src/aetheris/App.tsx`: removed decorative hero photography, including the “A warm path is earned context.” Intros masthead; retained copy/actions and optional-media layout. Live Home still uses the established member feed, now in compact mode.
- `src/aetheris/Landing.tsx`, `editorial-media.css`, `src/routes/index.tsx`: photo-free public compositions, compact banner reflow, removed obsolete stock social-preview image.
- `member-media.ts`, `portraits.ts`, `ui.tsx`, `ExecutivePortrait.tsx`: no identity-matched substitute faces; missing photos use initials. Explicit genuine photo paths remain supported.
- Demo/contact image references removed from networkData, dataStore, tileSummaries, QuickAddContactModal, NetworkGraphView and ConstellationGraphic. Contact slots in WorkspaceModal, command palettes, heatmap, digest, intelligence sidebar and tile previews use initials/explicit portraits instead of stock faces.
- `HomeFeedView.tsx`, `FeedSidebarLayout.tsx`, `SocialExperience.tsx`, `home-feed-layout.css`, `feed-window.ts`: concise header, default Social feed, separate Tools & activity, closed optional overview, first three updates plus Show more. Switching tools preserves the composer draft; Share an update restores the feed. Existing live store, compose/like/bookmark/comment implementations remain in place.
- Network/Introductions filter rows wrap on phones; sort input shrinks within its column.

Genuine uploaded photos, logos, attachments, integral news thumbnails, Specter evidence and diagrams were not globally hidden or removed. No database, migration, secrets, auth or visibility-rule changes.

## Measured Dashboard result
Measurements on `/demo`, same dataset and viewport, default right content pane:

| Viewport | Before scrollHeight | After scrollHeight | Reduction | Composer top before → after |
|---|---:|---:|---:|---:|
| 1440 × 900 | 2262 px | 1397 px | 38.2% | 424 → 299 px |
| 390 × 844 | 2249 px | 1909 px | 15.1% | 593 → 394 px |

The document stayed exactly 900/844 px high. Remaining vertical travel is the three visible posts, not stacked widget rails or an expanded network overview. Authenticated data may have different lengths; these are demo measurements, not claims about the member's private feed.

## Confirmed checks
- 35 focused tests passed: feed window, member media, avatar sources, Dashboard/Network, workspace lifecycle.
- Existing Specter runner passed with matching Playwright 1.56.0 in isolated `/tmp` tooling; capture, history, export, responsive shell, sidebar collapse, Executive modal and unobstructed Butler checks passed. This harness does not establish authenticated member save behavior.
- `scripts/photo-check/run.py` passed public landing plus Dashboard, Network, Introductions, Memory, Work and Insights at 1440, 390 and 320 px: no stock photos/decorative hero slots, no horizontal overflow, viewport lock, Butler visible, zero page errors. Keyboard Enter activates Tools; returning through Share an update preserves the typed draft.
- Screenshots reviewed for public landing, desktop/phone Dashboard, Introductions and Work. Dashboard measured separately at the exact requested shorter viewport sizes.
- Automatic harness compilation/typecheck signal: latest `build OK` at 2026-10-22T02:28:37Z. No separate manual production build/typecheck was run; project rules delegate those to the harness.

## Limits and remaining work
- Signed-in `/app` and the screenshot-specific live Intros banner cannot be browser-verified until a real member session is available. Requesting-account session mint failed; no alternate member was selected and no auth gate bypassed.
- Work's remaining long tool sections were not broadly redesigned in this photo-removal pass; the photo-free layout and mobile fit were checked. Messages, Meetings, Settings and other tool information architecture were not reworked here.
- Changes remain in the existing project and managed edit history. Connected GitHub main/CI completion cannot be established from the internal sandbox remote; no manual Git state operations were performed.
- Nothing published.