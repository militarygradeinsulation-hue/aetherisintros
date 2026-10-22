# Fixed-screen Dashboard and compact workspace headings — QA

## Source changes
- `src/aetheris/App.tsx`: shared EditorialHero is now text-only, with no image prop, figure, caption panel or blueprint cross. Discover, Introductions, Needs and Insights have literal concise headings; Memory and Work reuse the same heading. Duplicate Intros/Needs/Insights headings consolidated; membership and social APIs unchanged.
- `src/aetheris/editorial-media.css`: compact heading layout and scoped legacy typography repairs; real images are not globally hidden.
- `src/intros-ui/views/HomeFeedView.tsx`: network overview moved into a selectable panel, outside the sequential feed stack. Feed and composer stay mounted.
- `src/intros-ui/components/home/FeedSidebarLayout.tsx`: selectable Social feed / Tools & activity / Overview regions; existing widget customization and saved layouts retained.
- `src/intros-ui/components/layout/AetherisWorkspaceShell.tsx`: Home receives a fixed-height viewport class, other pages keep existing scrolling behavior.
- `src/intros-ui/home-feed-layout.css`: fixed-height Dashboard layout, internal regions, readable panel buttons and compact demo introduction header.
- `src/intros-ui/views/IntrosHubView.tsx`: compact text-only demo introduction heading; New introduction keeps its existing workflow.
- `scripts/dashboard-viewport-check/run.py`: retained four-viewport browser regression.
- `AGENTS.md` and `roadmap.md`: updated architecture rules and checklist.

## Verified
- 35 focused Vitest tests passed across feed-window, member-media, avatar-sources, dashboard-network-cleanup and workspace-lifecycle.
- Specter isolated browser harness: 40 assertions passed, including iframe interaction/evidence, Executive modal and unobstructed Butler at 390/320. This uses stubs and is not a live capture verification.
- Preview automatic compilation reports `build OK` at 2026-10-22T02:40:54Z (typecheck + production build harness). No manual npm build or typecheck was run, per environment requirements.
- Four-size Dashboard browser regression passed: feed/tools/overview switching, keyboard Enter, draft retention, Share action, demo posting, likes, bookmarks, additional-feed access, Butler open/close, New introduction open/cancel, Network navigation. Zero page errors.
- Existing photo browser audit passed landing, Dashboard, Network, Introductions, Memory, Work and Insights at 1440/390/320; no stock hero images or horizontal overflow.
- Screenshots reviewed: Dashboard desktop/phone, tools desktop, compact Introductions desktop/phone and Memory phone.

| Viewport | Document client / scroll height | Dashboard right-pane client / scroll height |
|---|---:|---:|
| 1440×900 | 900 / 900 | 832 / 832 |
| 1280×800 | 800 / 800 | 732 / 732 |
| 390×844 | 844 / 844 | 708 / 708 |
| 320×700 | 700 / 700 | 564 / 564 |

All feed, tools and overview states kept those outer dimensions; only selected internal regions scroll. Document/right-pane widths equal their scroll widths. Prior pass measured outer right-pane scroll heights 1397 at 1440×900 and 1909 at 390×844; current heights are 832 and 708 respectively. These prior values are recorded measurements, not rerun against an old branch.

## Limits and release status
- Authenticated /app and the exact screenshot-specific live Intro view remain unverified: requesting-account session mint returned no matching auth user. No alternate account was selected and no auth bypass used. Shared live source is updated, but demo checks do not establish live posting/persistence.
- GitHub main/CI sync cannot be confirmed by this sandbox; changes remain in the existing Lovable-managed project, with no manual git operations or history rewriting.
- No database, migrations, secrets, public landing source or auth/RLS logic changed. Genuine member avatars, attachment/news/journal media, logos and Specter evidence remain supported.
- News/Home/Presence/Profile were audited for media in the preceding pass; this slice does not broadly redesign their remaining information architecture or the Memory graph.
- No publication performed in this pass: signed-in validation remains pending.
