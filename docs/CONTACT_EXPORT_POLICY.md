# Permission Model Amendment: Contact Export Disabled

Status: policy requirement. This document does not itself implement or verify enforcement.

## 1. Policy

Contact export is disabled for all users, roles, and AI agents until explicitly enabled through a future reviewed policy change.

This restriction applies to personal Rolodex records, company-owned contacts, shared contacts, and imported organization records in the Rolodex. Importing, searching, viewing, and authorized in-app editing remain available. Sharing a record within the application does not authorize exporting it.

## 2. Contact capability matrix

| Principal | Import | Search/view | Edit | Share in-app | Export |
|---|---|---|---|---|---|
| Personal owner | Into personal scope | Own records | Own records | Explicitly authorized recipients | Denied |
| Company owner/admin | Into authorized company scope | Authorized records only | Where permitted | Where permitted | Denied |
| Workspace manager | Where permitted | Workspace-authorized records | Where permitted | Within approved boundaries | Denied |
| Contributor | Where permitted | Authorized records | Where permitted | Denied by default | Denied |
| Viewer | Denied | Authorized records | Denied | Denied | Denied |
| External guest | Denied | Specifically shared records | Only if explicitly granted | Denied | Denied |
| AI agent | Only through approved workflows | Intersection of user access and delegation | Only through approved workflows | Requires approval | Denied |

Organization ownership or administrative status does not override this restriction.

## 3. Resource grants

For contact and Rolodex organization resources, supported grant capabilities are read, comment, and edit. Do not issue export grants for these resource types. If the generic permission system retains export for other product areas, contact export must remain explicitly denied. Existing contact-export grants must be revoked or rendered ineffective.

## 4. Enforcement

Do not provide contact-data CSV, Excel, JSON, or other downloads; bulk-copy tools; contact-export endpoints; background contact archives; downloadable reports containing Rolodex contact details; AI-generated contact-list files or attachments; or external CRM/provider transfers that act as an export workaround.

Enforce denial in backend authorization and job execution, not merely by hiding buttons. Future exceptions require separate policy review. Normal authenticated, permission-filtered responses needed to display contacts remain allowed. Search/list endpoints must use pagination and request limits rather than unrestricted bulk retrieval.

## 5. AI and integrations

Agent delegations cannot include contact export. Ask Intros may display authorized contact information in the application and assist with approved in-app workflows, but must not package contacts into downloads, bulk responses, or third-party transfers. Enrichment remains separately controlled; disabling export does not authorize sending private phone numbers or email addresses to enrichment providers.

## 6. Scope and original uploads

The restriction covers contact datasets and contact details. It does not automatically prohibit downloading unrelated project deliverables or documents. Import files must not become downloadable through ordinary Library access. Retention of original uploads requires separate authorization and must not create an alternate contact-download route.

## 7. Required tests

1. Personal owners, company owners, administrators, guests, and agents cannot export contacts.
2. Forged or legacy export grants cannot bypass the restriction.
3. Direct endpoint requests are denied even when the UI has no export controls.
4. Reports, attachments, background jobs, and AI file generation cannot expose contact datasets.
5. Search/list responses respect access scope, pagination, and configured limits.
6. Import, authorized viewing, editing, and in-app sharing continue to work.

## 8. Limitation

Disabling export cannot prevent manual transcription or screenshots by users allowed to view a record. The policy blocks supported export mechanisms and bulk extraction paths; it does not make displayed information impossible to copy.
