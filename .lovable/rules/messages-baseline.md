# Ask Intros — Messages Theme Requirement (Owner-approved October 2026)

This rule supersedes the historic "Messages-first blue/cream" baseline.
It governs **both demo and signed-in Messages** and must match the rest of
Ask Intros' black/white stencil system.

## Appearance modes
- **Dark:** black/near-black page, inbox tiles, conversation panels, message
  bubbles, context/AI cards, menus and composer. White primary text and clear
  gray supporting copy. No cream, white, or pale cards.
- **Light:** white/near-white versions of the same surfaces, including inbox
  rows, message bubbles, context panels, inputs and brief. Black primary text
  and dark gray secondary text. No black cards except explicit intentional
  brand contrast on action buttons.
- **Accent:** burnt orange (#B5541F) for primary actions; lighter orange
  (#EF9A69) on dark for emphasized labels, deeper orange (#934016) on light.
  Primary button text is white in both modes.
- Both modes must retain readable selections, hover, focus, placeholders and
  alert contrast. The Ask Intros logo's existing yellow details remain a
  separate brand exception, not a Messages background color.

## Source of truth
The only Messages palette definition is
`src/aetheris/messages-inverse-theme.css`, loaded **after**
`src/aetheris/bridge-experience.css` in `src/routes/__root.tsx`.
`src/intros-ui/messages-readability.css` is typography/interaction-only.
Do not restore the discarded cream-in-both-modes overrides in
`src/aetheris/contrast-orange.css`, or the dark-in-both-modes overrides in
`src/aetheris/bridge-experience.css`.

When editing Messages, validate live and demo routes, the actual computed
background AND text colors in both modes, and mobile scrolling/layout.
`scripts/messages-contrast-check/run.mjs` checks the app's appearance modes.
