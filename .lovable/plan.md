# Public Ask Intros brand lockup

## Scope
- Replace only the public landing page’s old image-plus-text header brand with a reusable Ask Intros SVG lockup.
- Add a larger, responsive instance above the existing Founding 1,000 hero copy.
- Preserve the portrait, whitelist wording and form, calls to action, Founder Story, capabilities, authentication, and demo behavior.
- Leave every signed-in screen unchanged and keep the project unpublished.

## Visual implementation
- Build the mark on a transparent SVG canvas so the landing page’s near-black background remains the ground.
- Use three warm gold/orange circular nodes, one slim diagonal ivory/gold link, an ivory editorial “ASK INTROS” wordmark, a cobalt rule ending in a gold dot, and “WHY ME | WHY THEM | WHY NOW” beneath it.
- Provide compact and hero size variants from one component, with accessible labeling and responsive sizing that cannot crop or overflow.

## Verification
- Confirm the old landing header asset and separate brand text are removed.
- Check the public homepage at desktop and phone widths for overflow, clipping, duplicated branding, and unchanged actions/sections.
- Confirm the preview build succeeds; do not publish.

## Technical details
- Add one public-facing React/SVG brand component and landing-specific CSS.
- Update only the public Landing imports and two placement points.
- Do not alter shared signed-in branding, application state, routes, backend, or database.
