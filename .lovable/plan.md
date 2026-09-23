# Unified Executive Page and relationship doorway

## Outcome
- Replace the current member detail with one clean Executive Page that combines verified identity, relationship reasoning, current signals, factual proof, and one context-aware next action.
- Make Network lead with “Who do you need?” and return a short ranked set using the existing matching engine.
- Reshape Me around editing the same executive identity members see, with a live preview and persisted availability choices.
- Preserve the six current destinations, verified-member gate, double opt-in introductions, private account boundaries, CRM/Grid canonical records, messaging, calendar, memory, and all existing advanced tools.

## Build
- Extend the existing profile record minimally with `what_i_do`, `building`, `open_to`, and `scheduling_enabled`; hydrate these into the current member/profile model and save through the existing profile write path.
- Add a small recommendations table with author ownership, recipient display approval, verified-member reads only for approved recommendations, strict grants/RLS, and no access to private notes or evidence.
- Recompose member detail into:
  - essential executive identity and verified status;
  - one primary action chosen from Signal response, Message, Request Introduction, or Request Connection;
  - optional Find a Time only when scheduling is enabled;
  - Why Them / Why You / Why Now using current matching and relationship data;
  - Open To, Building, Looking For, Can Help With, current asks/posts/signals, and recorded proof;
  - a clearly private relationship drawer backed by the viewer’s existing CRM person, company, opportunities, tasks, activities, notes, memory, intros, messages, and calendar context.
- Keep one canonical CRM person by matching `member_id`; Add to CRM will reuse the existing deduplicating path. Person actions will create linked opportunities, notes, messages, and meetings against that same identity.
- Recompose Network’s first tab around a natural-language search, score results with current `rankMatches`, and show only the top five with evidence and one action. Existing People, Intros, Companies, Circles, and Events remain reachable in the hub.
- Recompose Me so editing mirrors the Executive Page and saves the existing profile fields plus Open To/scheduling fields; verification remains read-only and sourced from the current verification system.

## Privacy and security
- Keep the entire experience under the existing authenticated and verified-member route gates.
- Profile extensions are network-safe only under the existing profile visibility policy.
- Recommendations expose only approved display records to verified members; authors manage their own text and recipients control display.
- Private CRM data, notes, memory, meetings, messages, opportunity values, Grid data, verification evidence, and security events stay owner-scoped and appear only in the viewer’s private context area.

## Validation
- Verify profile entry from Network, ranked search, CTA changes, messaging/intro routing, CRM deduplication and linked opportunity/note actions, Signal response context, profile/Open To persistence, scheduling visibility, and verification display.
- Confirm existing Home, Work/CRM/Grid/Calendar, Messages, News, and Me remain reachable.
- Test desktop, 390px mobile, and 360px mobile for overflow and action accessibility.
- Confirm signed-out/unverified access remains blocked and do not publish.

## Technical details
- Add one database migration with explicit grants before RLS policies for every new public table.
- Update generated database types through the supported type-generation path after migration.
- Keep changes inside the current TanStack Start, shared stores, and existing navigation/action APIs; add no new top-level route or parallel feed/CRM model.
