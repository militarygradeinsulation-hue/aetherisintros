# Extend ambient animation across Ask Intros

## Scope
- Add one shared, low-contrast animated relationship field behind the authenticated workspace so every signed-in and demo page has motion beyond a flat dark background.
- Reuse the existing native canvas effects and Ask Intros palette; keep public Home’s current hero, quote, sign-in, and footer animations intact.
- Place page content, navigation, menus, dialogs, and the Ask Intros dock above the background with no interaction blocking.
- Reduce density and opacity so text remains readable, and disable motion when the visitor requests reduced motion.
- Verify representative desktop and mobile pages for readability, overflow, animation visibility, and runtime errors.

## Technical details
- Mount a single shared `ConstellationField` at the app-shell level rather than one canvas per page.
- Add isolated background/content stacking rules in the existing stylesheet.
- Record and complete the visual task in the project roadmap.
