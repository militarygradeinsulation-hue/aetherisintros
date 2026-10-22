# Member Network compact directory QA — October 22, 2026

## Implemented in the existing Ask Intros project
- Replaced the long three-column Network stack with a viewport-fitted search-first directory. Removed illustrative map, featured portrait strip, repeated statistics and fabricated “Looking for now” copy inferred from focus areas.
- Filters start closed on every viewport: narrow desktop panel, dismissible mobile overlay; Escape restores focus and mobile Tab wraps inside the open filter panel. Role, tier, industry, location, reset, sorting and all member actions remain.
- Results are the only scrolling directory region (open filters can scroll independently). Grid, list and functional connection bubbles remain selectable. Geography, industries, supplied current objectives and connectors are in a separately selected context pane, not stacked above results.
- Compact People / Introductions navigation on both destinations replaces the redundant intro heading/copy bar. The actual introduction workflow is unchanged.
- Dashboard fixed-height panels and the earlier text-only shared workspace headings remain. No database, migrations, secrets, public landing or auth-gate edits.

## Verification
- 40 focused unit tests across six files passed, including real selector combination, sorting, input-order preservation, empty-list safety and concrete distribution counts.
- Four-size /demo browser checks passed search, no-results recovery, every filter, sort, grid/list/bubbles switching, Connect state change, intro modal open/cancel, profile navigation, internal last-result access, context switching, keyboard disclosure, mobile focus wrap/Escape, shared sidebar collapse/restore, Butler open/close and Network ↔ Introductions ↔ Dashboard transitions. Zero page errors.
- Repeated Dashboard browser suite passed posting, likes, saves, more updates, draft preservation, panel switching and outer viewport measurements.
- Existing photo-removal audit passed Dashboard, Network, Introductions, Memory, Work, Insights and landing at 1440/390/320. Reviewed final Network desktop and 320 screenshots, mobile filter screenshot and four-size dimensions.
- Automatic preview compilation reports build OK at 02:50:34 UTC. Manual npm build/typecheck were not run because this environment runs those checks automatically.

| Viewport | Right pane client / scroll height | Results client / scroll height |
|---|---:|---:|
| 1440×900 | 832 / 832 | 647 / 1528 |
| 1280×800 | 732 / 732 | 553 / 1528 |
| 390×844 | 708 / 708 | 451 / 2390 |
| 320×700 | 564 / 564 | 307 / 2390 |

Document height equals viewport height at every size; document and right-pane scroll widths equal client widths. At 1440×900 the old right pane measured 832 / 2806; now 832 / 832. Selected result content shrank to 1528px and scrolls internally, while all 11 existing demo members remain reachable. No new demo members were added or mixed into live mode.

## Limitations
- Authenticated /app persistence and real-member actions are not verified. A fresh requesting-account session mint failed: no matching auth account. No alternate user or auth bypass was chosen. Source retains the authorized caller-provided member list and existing live callbacks.
- GitHub synchronization/remote CI remains unconfirmed; no manual Git state changes or publication.
- This slice completes Network and the queued Dashboard/banner changes. It does not claim a new redesign of every other page or exhaustive accessibility certification; prior Work/Memory/Insights progressive disclosure is retained and photo-audited.
