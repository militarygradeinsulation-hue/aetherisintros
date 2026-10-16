# Ask Intros — Guidelines

## Components

The design system exports these components — import them from `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9` and compose them before building anything from scratch:

`AetherisAppSurface`, `AetherisAssistantSurface`, `AetherisAssistant`, `App`, `BusinessAnalystPanel`, `ConstellationField`, `CrmPage`, `FullCrm`, `GridPage`, `HalftoneWordmarkFooter`, `Landing`, `MetroHero`, `ParticleDrift`, `SerenityAmbient`, `SheetImport`, `SimpleViewPage`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9/styles.css` (source — preferred import)
- `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)


## Screenshot-approved option and workspace styling (current)

**Mandatory for every option, tile, dropdown, form, filter, menu, and workspace page.** The source of truth is `src/aetheris/executive-options.css` and the implementation guide is `docs/EXECUTIVE_WORKSPACE_STYLE.md`. In light mode the product uses warm ivory `#F5F2EC`, cream card `#FBF9F4`, slate typography `#2E3438`, muted blue action `#2F5F87`, and pale powder-blue selected options `#DCE8F3`; not navy-on-navy controls or gold-background filters. The existing light/dark switch is the only appearance chooser. Dark mode uses readable inverse tokens; Messages remains intentionally readable with light panels. Apply this through real member pages and legacy classic tools, and to portal-rendered dropdowns. Do not replace the approved logo, modify product behavior, or recolor red/green statuses.
