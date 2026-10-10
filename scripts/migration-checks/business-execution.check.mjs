export default async ({ ok, as, svc, A, B }) => {
  const key = "aetheris.business-execution-v1-live";
  const blueprint = { blueprints: [{ id: "plan-a", title: "Playground", proposals: [] }] };
  const save = (uid, data, version) =>
    as(uid, "select * from public.save_workspace_state($1, $2::jsonb, $3)", [
      key,
      JSON.stringify(data),
      version,
    ]);

  const first = await save(A, blueprint, 0);
  ok(
    first.rows?.[0]?.saved === true && Number(first.rows[0].current_version) === 1,
    "authenticated owner can create a versioned blueprint workspace",
  );
  ok(
    (await as(A, "select data from public.member_workspace_state where store_key = $1", [key]))
      .rows?.[0]?.data?.blueprints?.[0]?.id === "plan-a",
    "owner reads their project data",
  );
  ok(
    (await as(B, "select * from public.member_workspace_state where store_key = $1", [key])).rows
      ?.length === 0,
    "another member cannot read project data",
  );
  ok(
    !!(
      await as(
        B,
        "insert into public.member_workspace_state (user_id, store_key, data) values ($1, $2, $3::jsonb)",
        [A, key, JSON.stringify(blueprint)],
      )
    ).error,
    "another member cannot create data as the owner",
  );
  ok(
    !!(
      await as(
        B,
        "update public.member_workspace_state set data = $1::jsonb where user_id = $2 and store_key = $3 returning user_id",
        [JSON.stringify({ blueprints: [] }), A, key],
      )
    ).error,
    "another member cannot update project data",
  );

  const second = await save(
    A,
    { blueprints: [{ id: "plan-b", title: "Comparison", proposals: [] }] },
    1,
  );
  ok(
    second.rows?.[0]?.saved === true && Number(second.rows[0].current_version) === 2,
    "owner can persist edits with the current version",
  );
  const stale = await save(A, blueprint, 1);
  ok(
    stale.rows?.[0]?.saved === false && Number(stale.rows[0].current_version) === 2,
    "stale edits are rejected without overwriting the current version",
  );
  ok(
    (
      await svc(
        `select data->'blueprints'->0->>'id' as id from public.member_workspace_state where user_id = '${A}' and store_key = '${key}'`,
      )
    )[0]?.id === "plan-b",
    "a stale edit leaves the saved comparison unchanged",
  );

  ok(
    !!(
      await as(
        A,
        "insert into public.member_workspace_state (store_key, data) values ('aetheris.business-execution-v1-demo', '{}')",
      )
    ).error,
    "demo workspaces cannot be persisted",
  );
  ok(
    !!(await as(null, "select * from public.member_workspace_state where store_key = $1", [key]))
      .error,
    "visitors cannot access the workspace table",
  );
  ok(!!(await save(null, blueprint, 0)).error, "visitors cannot save blueprints or comparisons");
};
