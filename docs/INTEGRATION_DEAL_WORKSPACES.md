# Deal workspace integration review

Source PR: #44

The core workspace repository is already identical to PR #44 on main. WorkspacesPage and lifecycle differ because main includes later changes and renumbered migrations. Do not replace these with older PR #44 versions. Preserve two-party approval, versioned terms, RLS, and read-after-write behavior. Next verification: compare UI flows and migration state before extracting missing behavior.

Integration rules: current main is authoritative; do not overwrite newer modules or change member permissions to make old code compile. Only port missing behavior with regression tests, then merge after all CI workflows pass.
