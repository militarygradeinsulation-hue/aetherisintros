# Ask Intros — Guidelines

## Components

The design system exports these components — import them from `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9` and compose them before building anything from scratch:

`AetherisAppSurface`, `AetherisAssistantSurface`, `AetherisAssistant`, `App`, `BusinessAnalystPanel`, `ConstellationField`, `CrmPage`, `FullCrm`, `GridPage`, `HalftoneWordmarkFooter`, `Landing`, `MetroHero`, `ParticleDrift`, `SerenityAmbient`, `SheetImport`, `SimpleViewPage`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9/styles.css` (source — preferred import)
- `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)



## Non-negotiable product-wide Architect identity

The Ask Intros design is ONE cohesive product, not a themed public homepage plus unrelated internal applications. All newly created and modified screens must follow the same design contract.

- **Canonical UI tokens:** `src/aetheris/architect-everywhere.css` (dark and light variables for canvas, panel, raised surface, text, subtle text, copper, borders, inputs, and grids). It is loaded globally by `src/routes/__root.tsx` after `src/aetheris/architectural-system.css` and `src/styles.css`.
- **Product shell:** `src/intros-ui/IntrosApp.tsx` wraps every authenticated destination in `arch-product-main`, including classic features. Do not remove that wrapper or create a page-specific conflicting palette.
- **Visual language:** architectural restraint; disciplined spacing; cream/limestone in light mode and charcoal/ivory in dark mode; muted copper and thin blueprint drafting lines; editorial Cormorant headings with precise Inter / Space Grotesk UI copy.
- **Interactions:** the existing rounded rotating-gradient treatment belongs on intentional primary CTAs, not every chip, menu, icon, and status label. Respect focus visibility, disabled states, and reduced-motion.
- **Accessibility:** test both appearance settings. Never turn text dark on a dark photo, put pale text on a pale card, or globally recolor red failure/green success indicators copper. Decorative effects cannot block overlays.
- **Imagery:** where editorial images are needed, choose people in credible private discussions, introductions, and focused executive meetings. Building-only/architecture stock must not become the subject of the brand. Keep illustrative-photo disclosures.
- **Scope:** changing colors, components, or layouts means reviewing Home, People, Profile, Intros, Messages, Meetings, CRM, Library, Deals, Workspaces, Settings, demo, authentication, onboarding, verification, mobile drawers, and dialogs; do not stop after landing.
- **Regression:** run `scripts/architect-check/run.mjs` and `scripts/contrast-check/run.mjs` before calling the theme change complete.

If earlier generated palette suggestions or screenshots contradict this contract, prefer these canonical styles and preserve feature behavior.
