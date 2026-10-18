# Private library integration review

Source PR: #45

The library repository, PrivateLibrary UI and import module on main are identical to PR #45. The old PR is conflicting because surrounding files evolved. Do not merge its entire branch or duplicate library tables. Next verification: member-scoped imports, export denial policy, attachment privacy and navigation entry points.

Integration rules: current main is authoritative; do not overwrite newer modules or change member permissions to make old code compile. Only port missing behavior with regression tests, then merge after all CI workflows pass.
