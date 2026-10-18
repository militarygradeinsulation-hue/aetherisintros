# Aetheris Intros — System Rules

This library is the visual and product system for **Ask Intros**, a premium
relationship-intelligence network. Its house style is
**Editorial Noir × Intelligence OS × Architectural Minimalism**. Every screen a
consumer project builds with this library must read as part of that one system.

## Required setup before any UI renders

**Mount `<BrandFonts />` exactly once in the document head.** The shipped
stylesheet references the brand typefaces by name only and declares no
`@font-face` of its own, so a project that imports the theme CSS but never
mounts this component silently falls back to system fonts and loses the entire
editorial identity.

```tsx
import { BrandFonts } from "@/design-system/aetheris/BrandFonts";

<html>
  <head>
    <BrandFonts />
  </head>
</html>
```

`BrandFonts` emits the `preconnect` hints and the single Google Fonts stylesheet
for Cormorant Garamond, Libre Baskerville, Inter and Space Grotesk. Do not
duplicate those `<link>` tags by hand, and do not move the font loading into a
CSS `@import` — remote stylesheets must load as a `<link>` so the build's CSS
pipeline can resolve local imports.

Import the theme entry (`src/styles.css` plus `src/aetheris/styles.css`) for the
token and utility layer. Keep the shared `:root` custom-property block intact:
the UI primitives are wired to those variables and removing the block leaves
menus, popovers and side panels unstyled.

## Two coordinated modes

**Editorial Light** — landing, signup, onboarding, explanatory pages and
selected profile or story moments. Soft ivory and stone paper backgrounds, huge
editorial serif headlines, black and graphite ink, cobalt as the primary
interaction accent, ultra-thin blueprint grid lines, generous whitespace and
asymmetric magazine layouts. Subtle paper grain, never noisy.

**Intelligence Dark** — the authenticated network, intros, active memory,
messaging, match reasoning, radar and relationship intelligence. Deep near-black
charcoal, graphite elevated panels, thin 1px hairline borders, cobalt for active
and selected states, soft ivory text instead of pure white, restrained glass
depth. Amber is a signal, never a theme: use it only for live intelligence,
memory signals, network nodes, urgency or a detected opportunity.

Both modes must be visibly the same system. Keep authenticated surfaces primarily
dark and public or onboarding surfaces primarily editorial light, with deliberate
crossovers rather than a random mix.

## Typography

High-contrast editorial serif for giant brand statements and selected names or
headlines. Space Grotesk and Inter for interface, navigation, metadata and
controls. Small tracked uppercase labels for intelligence taxonomy. Large
editorial text should feel like a premium magazine masthead, not a tech startup
hero.

## Geometry

Avoid endless rounded rectangles. Most cards use 8–12px radii, thin borders and
disciplined spacing. Buttons use 6–8px radii, not pills. Chips are pills only
when semantically useful. Mix full-bleed editorial sections, hard grid columns,
inset intelligence panels and occasional square data modules.

## Layout rule

Each screen needs one clear visual focal point. Do not fill every square inch
with cards. Use scale, silence, whitespace and typography. Prefer 3–5 strong
modules over 12 equal-weight widgets.

## Accessibility

Build on the semantic element — a `button` for actions, an `a` for navigation, a
`label` wired to its input. Every interactive state stays keyboard-reachable with
a visible focus style, and icon-only controls carry an accessible name. Respect
`prefers-reduced-motion`: ambient layers pause rather than loop.

## Voice and product framing

Direct, intelligent, human, observant. Every authenticated page teaches the
member what they can do there and why it matters, in a 6–12 word headline, one or
two explanatory sentences, one proof point, and a clear next action.

Approved phrasing: *Know who matters. Know why now.* · *People × Context ×
Opportunity.* · *More context. Better intros. Stronger outcomes.*

Never use: *unlock*, *revolutionize*, *supercharge*, *synergy*, or vague
"AI-powered solutions" copy.

## Hard constraints

- Cobalt is the primary action color. Amber is an intelligence signal only and
  must not become the general interface accent.
- People-first social layouts, not dashboard layouts. Home is a professional
  feed, People is a network, Messages is person-to-person chat, Needs is an asks
  marketplace, Intros is a double-opt-in relationship workflow.
- Do not regress to a conventional CRM or a LinkedIn clone.
- Never display the same person's portrait more than once on a visible page —
  use initials for repeat appearances.
- Exactly one assistant control per screen.
- Mobile navigation belongs at the bottom of the viewport for thumb access.
- Never fabricate findings, financial values, or professional profiles. Absent
  evidence renders as unavailable, not as a guess.

## Cliché blacklist

No generic sparkle or star AI branding, gradient blobs, purple neon, AI brains,
robots, floating assistants, excessive progress donuts, card-wall dashboards,
glassmorphism everywhere, stock handshakes, smiling office-team photography, or
neon cyberpunk. Use the proprietary Aetheris intelligence mark when an
intelligence indicator is required.
