# Show the social thumbnail image

## Goal
Joseph wants to see the larger social-share image currently used by Aetheris Intros, displayed inline in chat.

## Current state
- `public/aetheris-social.png` exists (1200×630, standalone dark-grid masthead graphic with the Aetheris Intros wordmark and taglines).
- It is referenced in OG/Twitter meta tags as `https://intros.today/aetheris-social.png`.
- It is a project-source file under `public/`, so it cannot be shown inline via the chat artifact gallery directly.

## Plan
1. Copy `public/aetheris-social.png` to `/mnt/documents/aetheris-social.png`.
2. Present it in chat with a `presentation-artifact` tag so it renders in the gallery and Joseph can open/inspect it.

## Notes
- No code, styling, or behavior changes — purely displaying the existing asset.
- The image is a composed graphic, not a photo; no larger photographic source exists behind it.
