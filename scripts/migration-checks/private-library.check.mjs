export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const wsResult = await as(A, `select public.ensure_private_library_workspace() id`);
  const workspaceId = wsResult.rows?.[0]?.id;
  ok(Boolean(workspaceId), "an authenticated member gets their private default workspace");

  const hash = "a".repeat(64);
  const batchResult = await as(
    A,
    `select public.create_private_library_import_batch($1,$2,'csv',$3,1) result`,
    [workspaceId, "synthetic.csv", hash],
  );
  const batch = batchResult.rows?.[0]?.result;
  ok(Boolean(batch?.id), "the owner can start a private import batch");
  const repeated = await as(
    A,
    `select public.create_private_library_import_batch($1,$2,'csv',$3,1) result`,
    [workspaceId, "synthetic.csv", hash],
  );
  ok(
    repeated.rows?.[0]?.result?.id === batch?.id && repeated.rows?.[0]?.result?.existing,
    "the same file hash reuses its batch",
  );

  const entry = {
    import_key: `${hash}:Contacts:2`,
    record: {
      record_type: "person",
      name: "Synthetic Morgan",
      phone: "555-0100",
      email: "private@example.test",
      business: "Example Works",
      title: "",
      location: "Austin, TX",
      website: "",
      industry: "",
      raw_contact_person: "Morgan",
      source_file: "synthetic.csv",
      source_sheet: "Contacts",
      source_row: 2,
      source_reference: "Synthetic referral",
      dnc_status: "unknown",
      verification_status: "unverified",
      duplicate_candidate: false,
      original_columns: { Name: "Synthetic Morgan", Email: "private@example.test" },
    },
  };
  const inserted = await as(
    A,
    `select public.import_private_library_records($1,$2::jsonb) result`,
    [batch.id, JSON.stringify([entry])],
  );
  ok(
    inserted.rows?.[0]?.result?.inserted === 1,
    "the authenticated owner can import a validated contact",
  );
  const replay = await as(A, `select public.import_private_library_records($1,$2::jsonb) result`, [
    batch.id,
    JSON.stringify([entry]),
  ]);
  ok(
    replay.rows?.[0]?.result?.inserted === 0 && replay.rows?.[0]?.result?.existing === 1,
    "replaying a row is idempotent",
  );
  ok(
    (await as(A, `select public.finish_private_library_import($1,'[]'::jsonb)`, [batch.id]))
      .error === undefined,
    "the owner can finalize a row report",
  );

  ok(
    (
      await as(A, `select id from public.search_private_library_records('',50,$1,0)`, [workspaceId])
    ).rows?.length === 1,
    "the owner can search their imported contact",
  );
  const searchResult = await as(
    A,
    `select * from public.search_private_library_records('',50,$1,0)`,
    [workspaceId],
  );
  ok(
    searchResult.rows?.length === 1 &&
      !("email" in searchResult.rows[0]) &&
      !("original_columns" in searchResult.rows[0]),
    "search returns a bounded summary instead of downloadable contact details",
  );
  const imported = (
    await as(
      A,
      `select r.id,r.dnc_status,r.verification_status,r.record_type
       from public.get_private_library_record(
         (select id from public.search_private_library_records('',50,$1,0) limit 1)
       ) r`,
      [workspaceId],
    )
  ).rows?.[0];
  ok(
    imported?.dnc_status === "unknown" &&
      imported?.verification_status === "unverified" &&
      imported?.record_type === "person",
    "unknown do-not-contact and unverified status are preserved",
  );
  const firstDetail = await as(
    A,
    `select r.email,r.original_columns from public.get_private_library_record($1) r`,
    [imported?.id],
  );
  ok(
    firstDetail.rows?.[0]?.email === "private@example.test" &&
      firstDetail.rows?.[0]?.original_columns?.Email === "private@example.test",
    "authorized details and original source cells remain viewable through the one-record RPC",
  );
  ok(
    !!(await as(A, `select id from public.private_library_records`)).error,
    "a personal owner cannot bypass the one-record RPC with direct bulk table reads",
  );
  ok(
    !!(await as(B, `select id from public.private_library_records`)).error,
    "direct table reads cannot bypass the private contact view RPC",
  );
  ok(
    (await as(B, `select * from public.search_private_library_records('private@example.test',100,$1,0)`, [workspaceId]))
      .rows?.length === 0,
    "private contact search is isolated across users",
  );
  ok(
    !!(await as(A, `select public.deny_contact_data_export()`)).error,
    "the backend export guard denies a personal owner",
  );
  ok(
    !!(await as(ADMIN, `select public.deny_contact_data_export()`)).error,
    "the backend export guard denies an administrator",
  );
  ok(
    !!(await as(B, `select public.deny_contact_data_export()`)).error,
    "the backend export guard denies an unshared member",
  );
  ok(
    !!(await as(C, `select public.deny_contact_data_export()`)).error,
    "the backend export guard denies a shared guest",
  );
  ok(
    !!(await as(null, `select public.deny_contact_data_export()`)).error,
    "anonymous callers cannot invoke the export guard",
  );
  ok(
    !!(await as(A, `select public.grant_private_library_access($1,$2,'export')`, [workspaceId, C]))
      .error,
    "forged export grants are rejected by the permission RPC",
  );
  const forgedDirectGrantRejected = await svc(
    `insert into public.private_library_workspace_members(workspace_id,owner_id,member_id,permission)
     values ('${workspaceId}','${A}','${C}','export')`,
  ).then(() => false, () => true);
  ok(
    forgedDirectGrantRejected,
    "legacy or forged export permission rows violate the database constraint",
  );
  ok(
    !(await as(A, `select has_table_privilege('service_role','public.private_library_records','select')`))
      .rows?.[0]?.has_table_privilege,
    "service-role and agent backends cannot directly bulk-read Library contacts",
  );
  ok(
    !!(await as(null, `select * from public.private_library_records`)).error,
    "anonymous users have no table access",
  );
  ok(
    !!(await as(null, `select public.ensure_private_library_workspace()`)).error,
    "anonymous users cannot create a workspace",
  );
  ok(
    !!(await as(B, `select public.grant_private_library_access($1,$2,'read')`, [workspaceId, C]))
      .error,
    "a non-owner cannot grant workspace access",
  );

  ok(
    !(await as(A, `select public.grant_private_library_access($1,$2,'read')`, [workspaceId, C]))
      .error,
    "the owner can grant read-only access explicitly",
  );
  ok(
    (
      await as(C, `select id from public.search_private_library_records('',50,$1,0)`, [workspaceId])
    ).rows?.length === 1,
    "the explicitly shared member can read records",
  );
  ok(
    (await as(C, `select * from public.search_private_library_records('private@example.test',100,$1,0)`, [workspaceId]))
      .rows?.length === 1,
    "the shared member can search the permitted workspace",
  );
  ok(
    !!(await as(C, `select public.deny_contact_data_export()`)).error,
    "an explicitly shared viewer still cannot export contacts",
  );
  ok(
    !!(
      await as(C, `select public.import_private_library_records($1,$2::jsonb)`, [
        batch.id,
        JSON.stringify([entry]),
      ])
    ).error,
    "read-only sharing cannot write imports",
  );
  ok(
    !!(await as(C, `select * from public.private_library_records`)).error,
    "a shared viewer cannot use direct table reads as an export path",
  );

  ok(
    !(await as(A, `select public.grant_private_library_access($1,$2,'edit')`, [workspaceId, C]))
      .error,
    "the owner can upgrade an explicit share to edit",
  );
  const nextEntry = {
    ...entry,
    import_key: `${hash}:Contacts:3`,
    record: { ...entry.record, name: "Synthetic Casey", source_row: 3 },
  };
  const second = await as(C, `select public.import_private_library_records($1,$2::jsonb) result`, [
    batch.id,
    JSON.stringify([nextEntry]),
  ]);
  ok(
    second.rows?.[0]?.result?.inserted === 1,
    "an explicitly shared editor can import into the workspace",
  );
  ok(
    !!(await as(C, `select public.deny_contact_data_export()`)).error,
    "an explicitly shared editor still cannot export contacts",
  );
  const pageOne = await as(A, `select id from public.search_private_library_records('',1,$1,0)`, [workspaceId]);
  const pageTwo = await as(A, `select id from public.search_private_library_records('',1,$1,1)`, [workspaceId]);
  ok(
    pageOne.rows?.length === 1 && pageTwo.rows?.length === 1 &&
      pageOne.rows[0]?.id !== pageTwo.rows[0]?.id,
    "authorized search supports bounded pagination without losing imported rows",
  );
  ok(
    !!(await as(A, `select id from public.get_private_library_record($1)`, [pageOne.rows?.[0]?.id]))
      .rows?.length,
    "an authorized owner can open an individual contact detail",
  );

  const recordId = (
    await as(A, `select id from public.search_private_library_records('',50,$1,0) limit 1`, [workspaceId])
  ).rows?.[0]?.id;
  const sourceUrl = "https://example.test/team/synthetic-morgan";
  const invalidEvidence = await as(
    A,
    `select public.submit_private_library_suggestion(
    $1,'candidate-invalid','Synthetic Morgan',0.9,$2,'manual','2026-10-09T12:00:00Z',
    '{"title":"Director"}'::jsonb,
    '{"title":{"source_url":"https://example.test/team/synthetic-morgan","observed_at":"not-a-timestamp"}}'::jsonb
  ) id`,
    [recordId, sourceUrl],
  );
  ok(!!invalidEvidence.error, "a field suggestion with an invalid evidence timestamp is rejected");
  const suggestionResult = await as(
    A,
    `select public.submit_private_library_suggestion(
    $1,'candidate-1','Synthetic Morgan',0.9,$2,'manual','2026-10-09T12:00:00Z',
    '{"title":"Director"}'::jsonb,
    $3::jsonb
  ) id`,
    [
      recordId,
      sourceUrl,
      JSON.stringify({ title: { source_url: sourceUrl, observed_at: "2026-10-09T12:00:00Z" } }),
    ],
  );
  const suggestionId = suggestionResult.rows?.[0]?.id;
  ok(Boolean(suggestionId), "an evidence-backed public-source candidate can be saved separately");
  ok(
    !!(await as(A, `select id from public.private_library_enrichment_suggestions`)).error,
    "direct suggestion-table reads cannot bypass the authorized detail view",
  );
  ok(
    (
      await as(A, `select id from public.get_private_library_suggestions($1,50)`, [recordId])
    ).rows?.some((row) => row.id === suggestionId),
    "an authorized member can view evidence-backed suggestions",
  );
  const outsiderSuggestionTable = await as(
    B,
    `select id from public.private_library_enrichment_suggestions where id=$1`,
    [suggestionId],
  );
  const outsiderSuggestionRpc = await as(
    B,
    `select id from public.get_private_library_suggestions($1,50)`,
    [recordId],
  );
  ok(
    !!outsiderSuggestionTable.error && outsiderSuggestionRpc.rows?.length === 0,
    "another user cannot read an enrichment candidate through table or detail access",
  );
  ok(
    !!(
      await as(B, `select public.accept_private_library_suggestion($1,array['title'])`, [
        suggestionId,
      ])
    ).error,
    "a non-member cannot accept or apply a suggestion",
  );
  ok(
    !(
      await as(A, `select public.accept_private_library_suggestion($1,array['title'])`, [
        suggestionId,
      ])
    ).error,
    "the owner can explicitly accept a field backed by evidence",
  );
  ok(
    (await as(A, `select title from public.get_private_library_record($1)`, [recordId]))
      .rows?.[0]?.title === "Director",
    "accepted suggestions alone update the private record",
  );

  ok(
    !(await as(A, `select public.revoke_private_library_access($1,$2)`, [workspaceId, C])).error,
    "the owner can revoke an explicit share",
  );
  ok(
    (
      await as(C, `select id from public.search_private_library_records('',50,$1,0)`, [workspaceId])
    ).rows?.length === 0,
    "revoking a share immediately removes access",
  );
  ok(
    (await svc(`select count(*)::int n from public.private_library_records`))[0].n === 2,
    "service role sees both private rows without changing their owner",
  );
  const threadId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  await svc(`insert into public.dm_threads(id,member_a,member_b,created_by)
    values ('${threadId}','${A}','${B}','${A}')`);
  await svc(`insert into storage.objects(bucket_id,name,owner) values
    ('dm-files','${threadId}/legacy.xlsx','${A}'),
    ('dm-files','${threadId}/project.pdf','${A}')`);
  await svc(`create policy "legacy broad attachment read" on storage.objects for select
    to authenticated using (true)`);
  await svc(`create policy "legacy broad attachment upload" on storage.objects for insert
    to authenticated with check (true)`);
  ok(
    !!(await as(A, `insert into storage.objects(bucket_id,name,owner)
      values ('dm-files',$1,$2)`, [`${threadId}/contacts.csv`, A])).error,
    "restrictive backend rules reject CSV contact-list uploads despite broad grants",
  );
  ok(
    !!(await as(A, `insert into storage.objects(bucket_id,name,owner)
      values ('dm-files',$1,$2)`, [`${threadId}/contacts.xlsx`, A])).error,
    "restrictive backend rules reject XLSX imports despite broad grants",
  );
  ok(
    !(await as(A, `insert into storage.objects(bucket_id,name,owner)
      values ('dm-files',$1,$2)`, [`${threadId}/project.pdf`, A])).error,
    "direct-message storage accepts non-contact project file uploads",
  );
  ok(
    (await as(B, `select id from storage.objects where bucket_id='dm-files' and name=$1`,
      [`${threadId}/legacy.xlsx`])).rows?.length === 0,
    "existing spreadsheet attachments cannot be downloaded through participant storage access",
  );
  const projectAttachmentRead = await as(B, `select id from storage.objects where bucket_id='dm-files' and name=$1`,
      [`${threadId}/project.pdf`]);
  ok(
    (projectAttachmentRead.rows?.length ?? 0) >= 1,
    "authorized download of unrelated project attachments remains available",
  );
};
