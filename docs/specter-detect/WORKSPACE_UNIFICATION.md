# One Aetheris workspace: Ask Intros + Specter

## Direction

Use the clean Specter workspace as the eventual **shared application shell**, not a
second product beside Ask Intros. The supplied design reference sets the tone:
Poppins typography, near-black surfaces, low-contrast gray separators, a fixed
translucent header, restrained white gradients, compact controls and a responsive
mobile navigation menu.

Keep existing Ask Intros data, routes, permissions, messages, introductions and
intelligence flows. Do not replace product functionality with an ornamental
landing-page hero, dummy navigation, sample people or fabricated scan evidence.

## Incremental rollout

1. **Specter workspace foundation (this branch).** Lock the outer viewport,
   scroll the investigation and website panes internally, remove excess vertical
   whitespace, use the black/white visual system and connect the navigation
   destinations to the existing Ask Intros route handlers. A scan opens an
   interactive iframe where the website permits it, with a clear external
   browser fallback.
2. **Extract one reusable shell.** Move the Specter workspace header/sidebar
   into a shared `AetherisWorkspaceShell` that owns header, account menu,
   responsive sidebar, global search and keyboard accessibility. Pass a route
   content node instead of mounting page-specific navigation copies.
3. **Migrate Ask Intros modules.** Bring Dashboard, Member Network, Find
   Introductions, Messages, Meetings, Memory, Work and Insights into this shell
   one by one while retaining the existing TanStack routes, network providers
   and database write semantics. Remove `TopNavigation` only after parity
   checks pass. Provide a deliberate full-width content mode for the network
   graph and meetings.
4. **Consolidate all shells.** Delete duplicate styling/navigation only when
   every page has working direct links, browser history, member permissions,
   mobile layouts, notifications, search and proper failure states.

## Interactive web browsing boundary

The current in-page interactive view uses a sandboxed iframe. Users can scroll,
click and use forms on websites that **allow framing**. It does not have access
to third-party browser history, cookies or cross-origin DOM, and it cannot
override `X-Frame-Options` or CSP `frame-ancestors`. A separate tab remains
the reliable way to use a site that refuses embedding. Evidence from a saved
scan must never be silently updated by unverified iframe navigation.

A true remotely hosted browser (including blocked-to-frame sites) is a
**separate feature**. It requires per-user isolated sessions, authenticated
interaction channels, strict network egress / DNS rebinding protection,
clipboard/download controls, safe credentials handling, audit trails, timeouts
and an explicit decision on whether any activity may become saved evidence.
Do not turn the existing capture-only Specter worker into an unrestricted
browser proxy.

## Acceptance checks

- Specter has one header, one desktop sidebar and one responsive mobile menu.
- On desktop the document height equals the viewport; the website viewport,
  sidebar and investigation pane scroll without dragging the entire page.
- On narrow screens the document stays fixed while the content canvas scrolls,
  all controls remain reachable and no horizontal overflow appears.
- Website scanning still requires the real auth + capture path, and results,
  report export, saved cases, evidence tabs and original-site fallback work.
- The embedded interactive view is never described as a guaranteed full web
  browser, and inaccessible websites are not represented as successful scans.
- Core Ask Intros navigation continues to reach the existing feature routes.
