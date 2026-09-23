# Make every Ask Intros screen fit mobile phones

## Goal
Ensure the current public, demo, and signed-in experience automatically reflows for common phone widths without clipping, overlap, inaccessible actions, or removed functionality.

## Changes
- Strengthen the shared mobile shell so the top bar, six-item bottom navigation, drawers, floating Ask Intros control, voice controls, and page content stay inside the viewport and respect phone safe areas.
- Reflow page headings, action rows, forms, cards, and configurable Home controls into stable single-column mobile layouts with wrapping text and touch-friendly controls.
- Preserve functional information currently hidden on smaller screens by exposing message search, conversation context, and the optional relationship context panel through compact mobile controls rather than removing them.
- Make CRM tables, pipeline lanes, Grid sheets, Calendar views, and other wide workspaces intentionally swipeable inside their own bounded areas while keeping surrounding controls visible and usable.
- Tighten phone layouts for Network, Work, Messages, News, Me, preferences, integrations, verification, auth, public Home, and Founder Story without changing their content, data, permissions, or visual identity.

## Technical details
- Use responsive grid/flex rules with `minmax(0,1fr)`, `min-width:0`, wrapping, and safe-area padding instead of globally clipping overflow.
- Add dedicated scroll containers for true tabular/timeline interfaces; avoid turning tables themselves into block elements.
- Add compact mobile disclosure controls for supporting panels that cannot remain side-by-side.
- Keep all existing routes, interactions, persistence, authentication, verification, and database behavior unchanged.

## Verification
- Test `/`, `/auth`, `/founder-story`, and `/demo` at 360×800, 390×844, and a larger mobile/tablet width.
- Exercise all persistent navigation, Home customization, Network tabs, Work/CRM/Grid/Calendar, Messages, News, Me, Utilities, global search, Ask Intros, and representative dialogs.
- Confirm there is no page-level horizontal overflow, clipped text, overlapping fixed controls, or missing mobile-only functionality.
- Confirm the preview builds cleanly. Do not publish.