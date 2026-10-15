# Ask Intros / Architectural Editorial Design System

## Concept
Architecture as a metaphor for intentional relationships. Photographic sculptural buildings, parchment gallery-white grounds, extremely light engineering guides, bronze craftsmanship and purposeful whitespace. It should feel like a premium design publication, not an architecture agency.

## Tokens
Paper #F3F0E9, gallery #FDFBF7, stone #DDD7CC, ink #202420, graphite #111719, elevated #1A2223, copper #A36B43, antique bronze #B59A74. Lines remain below 20% opacity. Cormorant Garamond display serif; Inter body; Space Grotesk micro labels and folios.

## Scope
Public home: warm timber architecture behind large editorial copy; blueprint dimensions; restrained illustration throughout scene photography and system graphic; dark cinematic pause and membership close. Member experience: neutral ceramic/dark graphite backgrounds, drafting grid, fine borders, elevated tiles, refined navigation and signature copper/champagne gradient buttons. Apply to feed, messages, meetings, directory, profiles, CRM and all classic tools through their shared shell and tokens. Auth screens inherit warm grid styling. No changes to SQL, API calls, permissions, member data, route destinations or modal behavior.

## Sources and implementation
Free-to-use Unsplash architecture: Andreas Kruszakin-Liboska (wooden facade), Sebastien Devocelle (sweeping roof), Federico Chionetti (Paris facade), Auroom Wellness (warm glass/timber buildings). Images remain editorial, never testimonials or member identity. Image fallback remains from the original code. Technical overlay is the original blueprint-grid.svg and is noninteractive.

## QA
Check public and member routes in light and dark, desktop/tablet/mobile, hover/focus and reduced motion, dialogs, top/bottom navigation, auth, and print. Keep controls accessible and image annotations away from readable text. Changes are isolated in architectural-system.css for straightforward rollback. Production deployment requires existing verification/publish procedure.
