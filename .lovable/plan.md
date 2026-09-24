# Social-first signed-in experience

## Goal
Make Ask Intros immediately familiar as a professional social network while preserving the complete CEO Operating System beneath it. The permanent navigation becomes Home, Network, Messages, Work, and Me; News and advanced capabilities remain available through the feed, search, contextual actions, and More. Preview only.

## What will change
1. Replace the signed-in desktop side rail with a sticky top social header: compact brand, large “Search people, companies, or ask Intros…” control, Home/Network/Messages/Work, real notifications, Me, and More. Keep the mobile bottom bar exactly Home/Network/Messages/Work/Me, with notifications and Ask/search in the mobile header.
2. Rebuild Home around two modes: **Feed** by default and **Executive Brief** second. Preserve the current customizable Executive Home intact inside Executive Brief.
3. Build the Feed as a centered three-column social layout: real identity and active-Mission summary on the left; Signal composer and unified feed in the center; concise real people, meetings, opportunities, changes, and news on the right. On smaller screens, supporting modules move inline without duplication.
4. Reuse the existing post, ask/intent, attachment, privacy, reaction, comment, save, message, intro, and response flows. Normalize visible social copy to “Signal,” add supported Signal-type selection, and connect “I can help” choices to existing ask response, message, warm-path, and introduction actions. Never show invented counts or unsupported actions.
5. Insert evidence-backed CEO intelligence as occasional compact feed cards with one action, using existing relationship, commitment, meeting, approval, customer-risk, capital-path, and change engines. Empty data produces honest empty states.
6. Simplify Network’s default into familiar people discovery with search, compact filters, profile-first cards, and a small set of actions. Preserve Intros, Companies, Circles, Events, Directory, and every advanced destination as secondary tabs or deep links.
7. Recompose Executive profiles as one social identity with at most five tabs: About, Activity, Relationship, Business, and Memory. Public-safe identity/activity remains separate from owner-only CRM, relationship, opportunity, meeting, and memory context.
8. Refine Messages into a familiar conversation list, thread, and relationship-context layout; use a context drawer on mobile while preserving messaging and permission gates.
9. Add a notification drawer derived from existing messages, introductions, commitments, meetings, relationship changes, opportunities, decisions, approvals, customer-risk findings, and office-hour requests. Every item links to its real source; no fabricated engagement events.
10. Upgrade universal search so names and companies stay searchable while question-like input opens Ask Intros and deterministic commands. Keep existing deep capability search and creation shortcuts.
11. Keep Work as the business-software area with a clean CRM, Pipeline, Grid, Calendar, and Forecast tab row. Keep all advanced CEO tools contextual and reachable without adding permanent navigation.

## Technical approach
- Refactor the signed-in shell and social surfaces within the existing React/TanStack structure; do not introduce a parallel router, feed store, CRM, or social database.
- Add small focused presentation modules for the social Home, notification drawer, and shared social cards; reuse current providers and action functions.
- Extend the existing post method only as needed to persist supported Signal types through the current `posts.kind` field. No database migration is expected.
- Preserve RLS, verification gates, private visibility rules, canonical CRM/Grid identity, deterministic fallbacks, and the unique-portrait rule.
- Keep the current deep page IDs intact so stored navigation and existing links continue to work.

## Verification
- Confirm the preview build and focused TypeScript checks are clean.
- Exercise Feed/Executive Brief, composer and Signal actions, Network, Executive profile tabs, Messages/context, notifications, universal search/Ask, Work tabs, and representative deep destinations.
- Check 1440px, 1280px, tablet, 390px, and 360px layouts for readable text, usable tap targets, non-overlapping overlays, unique portraits, and no horizontal overflow.
- Confirm live mode shows only real records, private context remains owner-only, no fake engagement appears, and CRM/Grid/CEO OS workflows still open correctly.
- Do not publish production.

## Assumptions
- Existing persisted likes/comments/reposts are retained because they are already supported; no aggregate or third-party engagement numbers will be invented.
- Signal types map to the current post kinds where possible; “Looking For,” “Offering,” “Opportunity,” and “Acquisition” remain structured Signal presentation while using the current post/ask persistence rather than new tables.
- Notification read state remains session-derived unless the existing notification record exposes it; this redesign will not add a database solely for presentation state.
