# Social and Business views

Branch base: `aetherisintros/main` at `61b500c8571b09aa5eda880f8dbed6565bcb7fb4`.
Latest main reconciled without replacing either view: `840d6a713956f4a9b25c7ec62256784ce1e5995a` (branding, cinematic landing, expanding tabs, desktop dock and CRM Finance Bento).
Social visual reference: `aetheris-bridge/design/absolute-ledger-bridge-20261023` at `2d20c664f51e4777c8bb8750ee36ede141d8a75f`.

The member shell offers Social and Business presentation choices. Business remains the default for existing visitors. The device preference is stored in `ask-intros.experience.v1`; the separate light/dark preference remains unchanged (dark by default).

Both views render the same IntrosApp, page components, data providers, action callbacks and modal instances. Switching updates presentation attributes and navigation chrome, never a React key or a second application tree. This preserves the current page, selected record, mounted drafts, search filters and board configuration.

Social uses the Bridge blue/navy and ivory palettes, Inter/Bricolage fonts, rounded glass cards, horizontal desktop navigation, and portrait cards for People. Business retains the existing sidebar and table/dashboard layout. Social styles live in the `social-experience` layer and require `html[data-experience="social"]`, including body portals. Leaving the member shell removes this attribute. Semantic destructive/error colors remain distinct.

Both navigation styles use `workspace-navigation.ts`. Ask Intros groups Introductions, Live Signal Radar (the retained `bubbles` page), Memory and Referral Engine. Existing page/tool IDs remain valid. CRM & Pipeline remains restricted to those tools. Mobile retains the existing drawer and bottom navigation.

The 11 Bridge showcase portraits and two fonts are copied into public assets, with the font licenses. Demo portrait assignments live only in the explicit network fixtures. Live data, missing-photo fallbacks, private storage and account permissions remain unchanged. No Bridge project configuration, database migrations or credentials are copied.

## Validation

Run the preference and canonical-navigation tests along with member-media, mobile-navigation, appearance, board-layout and feed-window tests. Build with `npm run build`. Browser checks should cover Social/Business in both themes and mobile/desktop, draft retention, directory filters, all navigation targets, modal styling and missing-photo behavior. Authenticated persistence requires a permitted test account; demo tests do not prove production database readiness.
