# Ask Intros — Permanent Messages Theme Baseline

This is the **authoritative design requirement for the full website and member product**, established by the owner. The Messages page screenshot is the visual reference. Do not create a different color language on any newly generated page.

## Light baseline
- Background / canvas: `#F5F2EC`
- Cards and dropdowns: `#FBF9F4`
- Inset tile and neutral options: `#F2EEE8`
- Main text: `#2E3438`
- Supporting text: `#56626A`
- Borders and dividers: `#D7D3CB`
- Functional blue buttons: `#2F5F87` (hover `#244B6B`)
- Selected filter / tile / menu item: `#DCE8F3`, blue border `#B9CBDD`, text `#233E53`

## Scope and behavior
Apply this to Home, People, Introductions, Meetings, Messages, CRM, Deal Rooms, Insights, Workspaces, Profile, Settings, forms, admin, dialogs, dropdowns, tiles, panels and onboarding. User-facing primary actions use muted blue, secondary actions use neutral paper. The site offers only the existing Light/Dark switch; Light is the default for new visitors and saved Dark is respected. Dark keeps the **same blue family** with readable inverse colors.

The implemented master tokens and shared surfaces are in `src/aetheris/messages-master-theme.css`, loaded after `src/aetheris/executive-options.css`. Details in `docs/EXECUTIVE_WORKSPACE_STYLE.md`. Don't add new competing CSS palettes or hardcode old navy / copper / amber onto functional UI. Preserve brand logo, intentional photography, charts and red/green status colors.

Critically: do not force white text based on an old CSS class that *used* to indicate a dark panel. Cards may now be cream. Style each surface and its text together, and test 4.5:1 contrast for ordinary text. The product-wide browser check is `scripts/architect-check/run.mjs`; validate both modes and actual cards, not just the existence of CSS variables.
