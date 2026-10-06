# Ask Intros — Guidelines

## Components

The design system exports these components — import them from `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9` and compose them before building anything from scratch:

`AetherisAssistant`, `App`, `ConstellationField`, `CrmPage`, `FullCrm`, `GridPage`, `Landing`, `MetroHero`, `ParticleDrift`, `SerenityAmbient`, `SheetImport`, `SimpleViewPage`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9/styles.css` (source — preferred import)
- `@ws-gmhcx8w6bqvecbtkycud/c1248cd8-77de-4eaa-8d9d-e7da71e70ae9/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

