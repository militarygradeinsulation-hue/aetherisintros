# Customizable Home widgets

## Goal
Let each member shape Home around what matters to them while preserving the current executive brief, actions, live data, and security model.

## Experience
- Add a clear **Customize Home** control beside the daily brief.
- In edit mode, let members move widgets up or down, choose compact/standard/wide sizing, and hide widgets.
- Add an **Add widgets** area for restoring hidden widgets and a **Reset layout** action for returning to the default composition.
- Keep the editor simple on mobile with explicit move controls rather than fragile drag gestures.

## Persistence and safety
- Save widget order, visibility, and size per signed-in account using the existing private member preference document; use isolated browser persistence in Demo.
- Preserve all current widget content, navigation, news reading, CRM/Grid data, membership checks, and row-level security.
- Treat unknown or older saved widget settings defensively so new widgets automatically remain available.

## Verification
- Confirm reorder, resize, hide, restore, reset, and persistence after reload.
- Check desktop and mobile layouts for gaps, overflow, readable controls, and normal widget actions after leaving edit mode.
- Confirm the preview builds cleanly and remains unpublished.