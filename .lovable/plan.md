# Founder Story micro-book

## What will be built

- Add a public `/founder-story` page titled **“The Architect Behind the Operator”**, presented as a premium Aetheris micro-book rather than a standard About page.
- Preserve the current Home composition and functionality, adding only a restrained founder-story entry point near the public hero and a dedicated editorial band on signed-in Home.
- Add a **Founder Context** link on Joseph Toney’s profile surface so members can read the story without leaving Aetheris.
- Keep the story accessible to both visitors and signed-in members, with clear paths back to Home or the member network.

## Reading experience

- Build a high-contrast cover using the supplied title, subtitle, tagline, founder line, CEO-network positioning, and existing Joseph portrait.
- Add an accessible, responsive chapter navigator for all 19 chapters, with chapter numbers and direct anchors.
- Use a restrained ivory reading field, black case-file bands, cobalt actions, warm-orange evidence markers, serif chapter typography, grid lines, generous whitespace, and a comfortable long-form measure.
- Organize the supplied narrative into 19 faithful chapters without adding biographical claims or sensationalizing service, health, family, or loss.
- Close with the exact supplied statement: “Aetheris is not here to decorate chaos…”

## Integration points

- Public Home: add “Read My Story” beside the existing primary actions and retain the current hero, portrait, platform section, and account/demo flows.
- Signed-in Home: add a quiet founder-evidence section after the “WHY ME / WHY THEM / WHY NOW” band.
- Founder profile: show Founder Context only when the viewed profile is Joseph Toney, plus the same link on Joseph’s own profile.
- Add route-specific title, description, social metadata, canonical URL, and sitemap inclusion for `https://intros.today/founder-story`.

## Technical details

- Create the story content as structured chapter data and render it in a dedicated TanStack route.
- Use native document links and anchored navigation with visible focus states and semantic `article`, `nav`, and section headings.
- Add only scoped founder-story styles to the existing Aetheris stylesheet and reuse current color/type tokens.
- Verify the route, Home entry points, profile entry point, chapter navigation, layout, overflow, and readability on desktop and mobile.
- Keep the project unpublished; the live site will receive the page only after the next publish.
