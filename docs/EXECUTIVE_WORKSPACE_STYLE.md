# Ask Intros — Executive Workspace UI

## Source of truth

The screenshot-approved **option and workspace design** is implemented in `src/aetheris/executive-options.css`. It is loaded after prior shared and feature styles in the root route and member application. This is not a homepage redesign. Keep the marketing editorial imagery and the official logo separately.

## Light appearance

| Design token | Value | Used for |
|---|---|---|
| `--ai-ui-canvas` | `#F5F2EC` | Main option page canvas |
| `--ai-ui-surface` | `#FBF9F4` | Cards, tiles, dropdowns, dialogs |
| `--ai-ui-raised` | `#F2EEE8` | Inset cards, neutral selections |
| `--ai-ui-input` | `#FFFEFB` | Search boxes, form inputs |
| `--ai-ui-ink` | `#2E3438` | Main labels and body |
| `--ai-ui-muted` | `#667078` | Supporting copy and metadata |
| `--ai-ui-border` | `#D7D3CB` | Fine architectural borders |
| `--ai-ui-blue` | `#2F5F87` | Functional primary actions |
| `--ai-ui-blue-hover` | `#244B6B` | Functional primary hover |
| `--ai-ui-selected` | `#DCE8F3` | Active options, tabs and rows |
| `--ai-ui-selected-border` | `#B9CBDD` | Active option borders |
| `--ai-ui-selected-ink` | `#233E53` | Text on active options |

The subtle drafting grid is `rgba(120,120,120,.08)` on an 86px rhythm.

## Interaction rules

1. **Option tiles:** cream/paper surface, 1px warm border, 12px radius, modest shadow. Hover strengthens the border. Selected = powder-blue fill and border with dark readable slate text. Do not treat every tile as a call to action.
2. **Dropdowns:** the same paper surface, compact 8px spacing, legible slate labels. Active/keyboard-highlighted options use powder blue. Keep native and Radix keyboard interaction intact.
3. **Filters and tab groups:** neutral baseline, soft-blue active state, visible selected value in both appearances. Keep meaningful red errors and green success states distinct.
4. **Input fields:** nearly white background, clear border, dark placeholder, slate-blue focus indicator. Error fields use an actual error color.
5. **Functional actions:** muted professional blue, white text, 8px corners. **Signature marketing CTAs** may retain their separate rotating gradient; don't spread animation through small utility controls.
6. **Headings:** Cormorant Garamond for editorial section titles; Inter / Space Grotesk for options and micro-labels. Avoid low-contrast decorative copy and excessive letter spacing for functional text.
7. **Light and dark:** light is the reference appearance; dark is an accessible charcoal counterpart. The user controls the two states through the existing toggle. The Messages panels intentionally retain light conversation surfaces for readability even in dark mode.
8. **Page coverage:** Home, People, Ask Intros workspace tools (CRM, Providers, Needs, Deal Rooms, etc.), Messaging, Meetings, Profiles, Settings, dropdown menus and Radix popovers must all inherit this contract.
9. **Privacy and function:** design changes never change real/demo data boundaries, RLS, availability, message/intro behavior, notification state, or authorization.

## Validation

The `scripts/architect-check/run.mjs` browser check tests theme tokens, option selection, the More menu and Messages across light/dark; the existing contrast and overlay check covers key member flows.

If a new feature needs bespoke styling, reuse `--ai-ui-*` tokens instead of inserting old navy or neon hard-coded values.
