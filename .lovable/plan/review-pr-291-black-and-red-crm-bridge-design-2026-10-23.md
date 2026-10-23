# Review PR #291: black-and-red CRM Bridge design

## What it changes (verified on GitHub)
- 16 commits, 19 files, +1813 / -185. It can merge without conflicts, but some checks are still running or failing ("unstable").
- It replaces the workspace frame with a new `LedgerBridgeShell`: a black, graphite and crimson theme, a grouped sidebar, a command search and login/logout controls.
- Adds four new views: Ledger Dashboard (key numbers, live feed), Ledger Directory (contacts table), Ledger Introductions (intro pipeline) and Ledger Workspace.
- Rewrites `IntrosApp.tsx` (47 lines added, 52 removed) and adds a 472-line global theme plus a change to `__root.tsx`.
- Updates three browser check scripts and two tests so they match the new layout.
- The PR says it changes no database, migrations, access rules or sign-in.

## Review steps
1. Pull the branch into a separate copy and run typecheck, build, the unit tests and the dashboard/network, contrast and mobile browser checks.
2. Check the risks in this design:
   - Crimson as the main accent conflicts with the burnt-orange and cobalt design we agreed on. Red is not one of our colors.
   - The compact Dashboard and Network, the mobile bottom menu and Menu drawer, the Executive action and the Butler placement could break.
   - The `__root.tsx` and global theme changes could leak into public pages and the homepage.
   - The PR loosens tests. I'll check whether the guards it removes still protect real behavior.
   - Check for duplicate navigation, overflow at 390 and 320 px, and that demo data never shows up in the live app.
3. Take screenshots of `/demo` at 1440, 390 and 320 px and compare them with current main.
4. Report: safe to merge as-is, safe with specific fixes, or not recommended. Nothing gets merged, pulled into the preview or published without your OK.

## Technical details
- Do the review in /tmp so the preview code stays as it is.
- Compare with main at the #289 merge.
