# PR268 mobile finishing QA — 2026-10-22

## Version and scope

This existing project started at GitHub merge `25ef80511bfa3c731dc398ef02b61fcce5ee0daf`. No pull/reset/rebase or manual Git sync operation was performed: the requested merge was already present. PR264 density imports, results-list and insights-disclosure markup remain. Subsequent edits use Lovable-managed history; GitHub outbound sync/CI is not observable from this agent.

Scoped repairs restore visible orange Menu lettering/icons, notification icons and the Butler mark; prevent a duplicate desktop Menu; make drawer background controls inert and restore focus; keep mobile Dashboard and Network outer panes fixed with their content accessible through bounded inner regions. Specter help is available on mobile. No database, secrets, migration, auth guards, member data or fake-content changes. Missing social metadata on five existing content routes was filled without changing route behavior.

## Verification

- Real localhost `/demo`: 320×700, 390×844, 430×932, 760×900 and 1440×900.
- Menu open/close, close icon, outside scrim tap, Escape focus return, forward/reverse Tab wrap, inert background, scroll to Settings and active Member Network highlight passed.
- Menu → Messages → Member Network → Dashboard → Specter passed. Shared/mobile search for an existing demo member returned the correct single result. No synthetic live member data was introduced.
- Dashboard composer draft survived Tools → Social feed; demo posting read back through the UI. Tools remain reachable. Feed and Network inner regions scroll; outer document and both Dashboard/Network panes stay within `clientHeight + 2`. No horizontal overflow was found in the five-size route measurements.
- Butler opened/closed at all sizes and disappears behind the navigation modal, returning after dismissal. Specter help and lower evidence/actions remain reachable; its page content scrolls at phone/tablet sizes without document scrolling. Real remote capture and signed-in saved-case persistence were not tested.
- Screenshots reviewed: phone Dashboard, Network results, Menu top/bottom, Butler, Specter lower pane; tablet and desktop Tools. Temporary evidence is under `/tmp/browser/mobile-finishing`.
- Behavioral regression retained at `scripts/mobile-workspace-check/run.py`; runs against the existing localhost preview and writes screenshots only under `/tmp`.
- 21 focused Vitest tests passed, including `mobile-workspace-navigation.test.ts`, burnt-orange, recovered polish and Dashboard/Network cleanup.
- Complete Vitest: 138 suites passed, 857 tests passed; two recovery suites fail to load because `@electric-sql/pglite` is missing. No test was skipped or weakened to claim full success.
- Automatic harness compilation reports `build OK`; a separate manual build/typecheck was not run because this environment runs compilation automatically.
- Basic security scan found no issues; it does not include deep code analysis.

## Release limitations

The requesting-account session mint failed: no auth user matches the requesting user's email. `/app` with real authenticated member data is therefore unverified; no other user's account or fake credentials were used.

Publishing was not requested because the full test suite is not green. `https://askintros.vip` is the existing production URL, not proof that these source changes are live. No served-release-to-Git-SHA claim is made.