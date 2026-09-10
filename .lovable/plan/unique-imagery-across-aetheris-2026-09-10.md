# Unique imagery across Aetheris

## Goal
Ensure no portrait or editorial image is reused for different people or repeated decorative placements.

## Changes
- Create a distinct monochrome editorial portrait for every member who currently shares an image.
- Keep each professional’s portrait consistent wherever that same person appears, while preventing reuse across different professionals.
- Reserve the editorial masthead and world-network imagery for their own single-purpose placements.
- Verify Home, Discover, Memory, Intros, Messages, Needs, Insights, and profiles at desktop and mobile widths.

## Technical details
- Replace the five-image fallback pool with a complete member-to-portrait mapping.
- Store new binary portraits through the project asset flow and import their asset pointers.
- Check for duplicate image assignments and visible overflow after implementation.
