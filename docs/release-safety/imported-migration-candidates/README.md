# Unregistered migration candidates

These files arrived on main outside the canonical Drizzle migration journal. CI
correctly rejected them as journal drift. They are preserved here byte for byte,
with original paths and SHA-256 hashes in `provenance.json`; no journaled migration
or live database has been modified.

The legacy business-post scripts overlap the registered `0062_business_posts`.
The legacy workbench script overlaps registered `0067_business_execution_workbench`.
The peer-group feed and agenda scripts were never registered for execution and
remain candidates for an independently reviewed forward migration. Their old
0045/0046 numbers already belong to provider and impact-report migrations.
The accompanying 0058 schema snapshot belongs to the unregistered candidate,
not the canonical migration chain.

Do not add these historical numbers to the end of the journal or apply these
files directly to production. If additional functionality is needed, prepare an
additive migration after the current journal head, verify it against the actual
schema, and review its access controls. Existing CI continues to enforce exact
agreement between the active migration folder and journal.
