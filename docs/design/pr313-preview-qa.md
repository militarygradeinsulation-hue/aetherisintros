# PR #313 preview verification

Imported PR head `737bc40689bd808400ee502c98987150d3ee6b03` onto preview base `23cef788`. All 57 imported files initially matched their GitHub blob hashes. No provider merge or publication was performed.

## Integration repairs

- Preserve all 29 hash-pinned original source files and generated styles.
- Resolve the original logo through a host-owned pointer to a served public copy. The reference asset endpoint returned 404 in this preview; the repaired logo decodes and renders in screenshots.
- Release inherited page and shell height/overflow locks only in Social mode. Real wheel scrolling now reaches the composer and lower modules; Business keeps its fixed shell.
- Business and Social demo drafts persist separately, matching the original components. They no longer mirror between presentations. The canonical feed node stays mounted across view changes.

## Checks

- Source and generated-style checks pass.
- Initial full Vitest run: 161 files / 948 tests passed. Final repeat: 947 passed; one unrelated offline catalog-replay test exceeded its 5-second timeout. Isolated rerun recorded in chat tool output.
- Preview compilation reports `build OK` after changes.
- Real preview checks at 1440×900, 1280×800, 390×844 and 320×700: Social/Business switching, separate draft retention, desktop People filter and message draft retention, theme switching, no horizontal overflow and no uncaught browser errors.
- Additional checks at 1280×1800 and phone sizes: canonical feed DOM identity, full wheel scroll, reachable composer, saved Social preference after reload, mobile People navigation and filter input.
- Screenshots inspected for desktop/phone Social, Business, messages, and light mode.

## Release limitations

GitHub design-parity UI and CodeQL checks pass, but the broader Checks workflow fails at “Architect across member pages (light and dark browser).” Later contrast checks were skipped. The failure has not been resolved by this preview-only import.

Checks use `/demo`; authenticated member writes and production persistence are not verified. No database, migration, secrets or authentication configuration changed. Reference demo imagery/copy and cobalt/glass styling remain as supplied, rather than claiming identical whole-app parity or live statistics.