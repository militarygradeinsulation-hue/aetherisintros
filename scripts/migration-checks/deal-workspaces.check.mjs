// 0057 + 0058 deal workspaces: private, active-member-only, RPC-only writes, buyer/provider parties
// accepted by both people, both-party approval of one immutable terms version, provider-submitted and
// buyer-accepted delivery, defined re-approval, optimistic concurrency and an append-only history.
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const INTRO = "11111111-1111-4111-8111-111111111111"; // accepted introduction between C and B (seed)
  const PENDING = "22222222-2222-4222-8222-222222222222"; // C asked A, never accepted (seed)
  const [{ id: THREAD }] = await svc(
    `insert into public.dm_threads (member_a, member_b, created_by) values ('${A}', '${B}', '${A}') returning id`,
  );
  const create = (uid, type, id, title = "Logistics audit") =>
    as(
      uid,
      `select public.create_deal_workspace($1, $2, $3, 'Secret scope', '', 1200000, 'usd', '2026-12-01', 'Hello B, shall we scope this?') r`,
      [type, id, title],
    );
  const ver = async (ws) =>
    (await svc(`select row_version v from public.deal_workspaces where id = '${ws}'`))[0].v;
  const state = async (ws) =>
    (
      await svc(`select status, scope_version sv from public.deal_workspaces where id = '${ws}'`)
    )[0];
  const call = async (uid, ws, fn, args = "") =>
    as(uid, `select public.${fn}($1, $2${args})`, [ws, await ver(ws)]);

  // Creation: only from your own conversation or an accepted introduction.
  ok(
    !!(await create(C, "dm_thread", THREAD)).error,
    "an outsider cannot open a workspace from someone else's conversation",
  );
  ok(
    !!(await create(A, "intro_request", PENDING)).error &&
      !!(await create(C, "intro_request", PENDING)).error,
    "an introduction nobody accepted cannot become a workspace",
  );
  ok(
    !!(await create(A, "intro_request", INTRO)).error,
    "nor can a member outside that introduction",
  );
  ok(!!(await create(A, "dm_thread", THREAD, "ab")).error, "the title must be real");
  ok(
    !!(
      await as(
        A,
        `select public.create_deal_workspace('dm_thread', $1, 'Audit', '', '', 5000, null, null, '')`,
        [THREAD],
      )
    ).error,
    "a budget needs a currency",
  );
  ok(
    !!(await as(null, `select public.create_deal_workspace('dm_thread', $1, 'Audit')`, [THREAD]))
      .error,
    "visitors cannot",
  );
  ok(
    !!(
      await as(
        A,
        `insert into public.deal_workspaces (source_type, source_id, title) values ('dm_thread', $1, 'Direct insert')`,
        [THREAD],
      )
    ).error,
    "tables cannot be written directly",
  );
  ok(
    (await svc(`select count(*)::int n from public.deal_workspaces`))[0].n === 0,
    "failed creations persisted nothing",
  );

  let r = await create(A, "dm_thread", THREAD);
  ok(r.rows?.[0]?.r?.created === true, "a member opens a workspace from a conversation");
  const WS = r.rows[0].r.id;
  r = await create(A, "dm_thread", THREAD);
  ok(
    r.rows?.[0]?.r?.created === false && r.rows[0].r.id === WS,
    "submitting twice returns the same workspace",
  );
  r = await create(B, "dm_thread", THREAD);
  ok(
    r.rows?.[0]?.r?.id === WS && r.rows[0].r.created === false,
    "the other person gets the existing workspace, not a second one",
  );
  ok(
    (await svc(`select count(*)::int n from public.deal_workspaces`))[0].n === 1 &&
      (await svc(`select count(*)::int n from public.deal_workspace_members`))[0].n === 2,
    "one workspace and one two-person roster exist for the source",
  );
  ok(
    !!(await svc(
      `insert into public.deal_workspaces (created_by, source_type, source_id, title) values ('${A}', 'dm_thread', '${THREAD}', 'Dup')`,
    ).then(
      () => null,
      (e) => e,
    )),
    "the database itself rejects a second workspace for a source",
  );
  ok(
    (await svc(`select actor_id from public.deal_workspace_events where kind = 'created'`))[0]
      .actor_id === A,
    "the history actor is the authenticated caller",
  );
  ok(
    (
      await svc(
        `select count(*)::int n from public.notifications where kind = 'workspace_invite' and user_id = '${B}'`,
      )
    )[0].n === 1,
    "the other person is told once",
  );

  // Reads: active members only. An accepted conversation is not consent either.
  ok(
    (await as(A, `select id from public.deal_workspaces`)).rows?.length === 1,
    "the owner reads it",
  );
  ok(
    (await as(B, `select id from public.deal_workspaces`)).rows?.length === 0,
    "a pending invitee reads no workspace",
  );
  ok(
    (await as(B, `select id from public.deal_workspace_events`)).rows?.length === 0 &&
      (await as(B, `select id from public.deal_workspace_steps`)).rows?.length === 0 &&
      (await as(B, `select version from public.deal_workspace_proposals`)).rows?.length === 0,
    "nor steps, history or proposals",
  );
  ok(
    (await as(B, `select user_id from public.deal_workspace_members`)).rows?.length === 1,
    "only their own invitation row",
  );
  r = await as(B, `select * from public.my_workspace_invitations()`);
  ok(
    r.rows?.length === 1 &&
      r.rows[0].title === "Logistics audit" &&
      r.rows[0].invited_by === A &&
      r.rows[0].invited_by_name &&
      r.rows[0].invite_message === "Hello B, shall we scope this?",
    "the invitation preview shows inviter, title and the explicit message",
  );
  ok(
    JSON.stringify(Object.keys(r.rows[0]).sort()) ===
      JSON.stringify([
        "invite_message",
        "invited_at",
        "invited_by",
        "invited_by_name",
        "title",
        "workspace_id",
      ]),
    "and nothing else: no scope, budget, due date or roles",
  );
  ok(
    (await as(C, `select id from public.deal_workspaces`)).rows?.length === 0 &&
      (await as(C, `select user_id from public.deal_workspace_members`)).rows?.length === 0,
    "outsiders see nothing",
  );
  ok(!!(await as(null, `select id from public.deal_workspaces`)).error, "visitors have no access");

  ok(
    !!(
      await as(
        A,
        `select public.create_deal_workspace('dm_thread', $1, 'Other', '', '', null, null, null, $2)`,
        [THREAD, "x".repeat(501)],
      )
    ).error,
    "an over-long invitation message is refused",
  );
  const [{ id: T2 }] = await svc(
    `insert into public.dm_threads (member_a, member_b, created_by) values ('${A}', '${C}', '${A}') returning id`,
  );

  // Pending invitee: no terms anywhere, not even through the RPC-exposed reads.
  ok(
    (await as(B, `select scope, budget_cents from public.deal_workspaces`)).rows?.length === 0,
    "a pending invitee cannot read scope or budget",
  );
  ok(
    (await as(B, `select version from public.deal_workspace_approvals`)).rows?.length === 0 &&
      (await as(B, `select version from public.deal_workspace_deliveries`)).rows?.length === 0,
    "nor approvals or deliveries",
  );
  ok(
    !!(await as(B, `select public.propose_workspace_parties($1, 1, '${B}')`, [WS])).error,
    "a pending invitee cannot assign roles",
  );

  // Revoked invitations confer nothing.
  await svc(`delete from public.deal_workspaces where source_id = '${T2}'`);
  const WSR = (await create(A, "dm_thread", T2, "Revoked deal")).rows[0].r.id;
  ok(
    !(await as(A, `select public.remove_workspace_member($1, $2)`, [WSR, C])).error,
    "the owner revokes a pending invitation",
  );
  ok(
    !!(await as(C, `select public.respond_workspace_invite($1, true)`, [WSR])).error,
    "a revoked invitation cannot be accepted",
  );
  ok(
    (await as(C, `select * from public.my_workspace_invitations()`)).rows?.length === 0,
    "and no longer previews",
  );
  ok(
    (await as(C, `select id from public.deal_workspaces`)).rows?.length === 0,
    "and reads nothing",
  );
  await svc(`delete from public.deal_workspaces where source_id = '${T2}'`);

  // Invited person cannot act until they accept; nobody else can accept for them.
  ok(
    !!(await as(B, `select public.add_workspace_step($1, 'Send NDA')`, [WS])).error,
    "an invited person cannot add steps before accepting",
  );
  ok(!!(await call(B, WS, "set_workspace_next_action", `, 'x'`)).error, "nor set the next action");
  ok(
    !!(await as(C, `select public.respond_workspace_invite($1, true)`, [WS])).error,
    "an outsider cannot accept the invitation",
  );
  ok(
    !!(await as(A, `select public.respond_workspace_invite($1, true)`, [WS])).error,
    "the owner cannot accept on behalf of the invitee",
  );
  ok(
    !!(await as(B, `update public.deal_workspace_members set status = 'active', role = 'owner'`))
      .error,
    "the roster cannot be edited directly",
  );
  ok(
    !!(
      await as(
        B,
        `insert into public.deal_workspace_members (workspace_id, user_id, role, status) values ('${WS}', '${C}', 'owner', 'active')`,
      )
    ).error,
    "nor extended directly",
  );

  // Declined: no access either, and it cannot be flipped by the decliner.
  const WSD = (await create(A, "dm_thread", T2, "Declined deal")).rows[0].r.id;
  ok(
    !(await as(C, `select public.respond_workspace_invite($1, false)`, [WSD])).error,
    "an invitee declines",
  );
  ok(
    (await as(C, `select id from public.deal_workspaces`)).rows?.length === 0 &&
      (await as(C, `select id from public.deal_workspace_events`)).rows?.length === 0,
    "a declined invitee has no access",
  );
  ok(
    !!(await as(C, `select public.respond_workspace_invite($1, true)`, [WSD])).error,
    "a decline cannot be reversed by the decliner",
  );
  ok(
    !!(await as(C, `select public.add_workspace_step($1, 'x')`, [WSD])).error,
    "a declined invitee cannot write",
  );
  ok(
    (
      await svc(
        `select count(*)::int n from public.deal_workspace_events where workspace_id = '${WSD}' and kind = 'invite_declined'`,
      )
    )[0].n === 1,
    "the decline is in the history",
  );

  ok(
    !(await as(B, `select public.respond_workspace_invite($1, true)`, [WS])).error,
    "the invited person accepts",
  );
  ok(
    !!(await as(B, `select public.respond_workspace_invite($1, true)`, [WS])).error,
    "accepting twice is refused",
  );
  ok(
    (await as(B, `select id from public.deal_workspaces`)).rows?.length === 1 &&
      (await as(B, `select id from public.deal_workspace_events`)).rows?.length >= 2,
    "after accepting they read the workspace and its history",
  );
  ok(
    (await state(WS)).status === "qualified",
    "accepting the invitation is not agreement: the stage is unchanged",
  );
  // Role matrix: counterparty cannot edit terms or move stages; owner cannot approve or accept.
  ok(
    !!(await call(B, WS, "update_workspace_details", `, 'Mine now', 'x', null, null, null`)).error,
    "a counterparty cannot change the terms",
  );
  ok(
    !!(await call(C, WS, "update_workspace_details", `, 'Mine now', 'x', null, null, null`)).error,
    "nor an outsider",
  );
  ok(
    !!(await call(B, WS, "submit_workspace_proposal", `, 'x', null, null, null`)).error,
    "a counterparty cannot submit a proposal",
  );
  ok(
    !!(await call(B, WS, "transition_workspace_status", `, 'cancelled'`)).error,
    "a counterparty cannot move the stage",
  );
  ok(
    !(
      await call(
        A,
        WS,
        "update_workspace_details",
        `, 'Logistics audit', 'Draft scope', 1200000, 'usd', '2026-12-01'`,
      )
    ).error,
    "the owner edits the draft terms",
  );
  ok((await state(WS)).sv === 2, "a draft change bumps the scope version");
  ok(
    !!(await call(A, WS, "update_workspace_details", `, 'Logistics audit', 'x', 100, null, null`))
      .error,
    "a budget without currency is refused",
  );
  ok(
    !!(await call(A, WS, "update_workspace_details", `, 'Logistics audit', 'x', -1, 'usd', null`))
      .error,
    "a negative budget is refused",
  );
  ok(
    !(await call(B, WS, "set_workspace_next_action", `, 'Share dispatch export'`)).error,
    "either active participant sets the next action",
  );
  ok(
    (await as(A, `select next_action from public.deal_workspaces where id = '${WS}'`)).rows?.[0]
      ?.next_action === "Share dispatch export",
    "and the owner sees it (persisted)",
  );
  r = await as(A, `select public.add_workspace_step($1, 'Send NDA') id`, [WS]);
  const STEP = r.rows?.[0]?.id;
  ok(
    !!STEP && !(await as(B, `select public.set_workspace_step_done($1, true)`, [STEP])).error,
    "a participant adds a step and the other ticks it",
  );
  ok(
    (await as(A, `select done_by from public.deal_workspace_steps`)).rows?.[0]?.done_by === B,
    "recorded against the real actor",
  );
  ok(
    !!(await as(A, `select public.add_workspace_step($1, '   ')`, [WS])).error,
    "blank steps are refused",
  );
  ok(
    !!(await as(C, `select public.set_workspace_step_done($1, false)`, [STEP])).error,
    "an outsider cannot change steps",
  );
  ok(
    !!(await as(B, `update public.deal_workspace_steps set done_by = '${A}'`)).error,
    "steps cannot be forged directly",
  );

  // Optimistic concurrency.
  const stale = await ver(WS);
  ok(
    !(await as(A, `select public.set_workspace_next_action($1, $2, 'Owner edit')`, [WS, stale]))
      .error,
    "a first writer succeeds",
  );
  r = await as(B, `select public.set_workspace_next_action($1, $2, 'Stale edit')`, [WS, stale]);
  ok(
    r.error && /changed since you loaded/i.test(String(r.error.message ?? r.error)),
    "a writer holding an older version is rejected with a conflict",
  );
  ok(
    (await as(A, `select next_action from public.deal_workspaces where id = '${WS}'`)).rows?.[0]
      ?.next_action === "Owner edit",
    "the stale write changed nothing",
  );
  ok(
    !!(await as(A, `select public.set_workspace_next_action($1, null, 'x')`, [WS])).error,
    "a write without a version is refused",
  );
  // ── Business roles: buyer / provider, independent of who opened the room ─────────────────
  const snap = async (ws) =>
    JSON.stringify(
      await svc(
        `select status, scope, budget_cents, currency, due_on, scope_version, resume_status, accepted_by, accepted_delivery_version, party_proposal_by, row_version from public.deal_workspaces where id = '${ws}'`,
      ),
    ) +
    JSON.stringify(
      await svc(
        `select user_id, role, status, party, party_accepted_at from public.deal_workspace_members where workspace_id = '${ws}' order by user_id`,
      ),
    ) +
    JSON.stringify(
      await svc(
        `select version, status from public.deal_workspace_proposals where workspace_id = '${ws}' order by version`,
      ),
    ) +
    JSON.stringify(
      await svc(
        `select version, status from public.deal_workspace_deliveries where workspace_id = '${ws}' order by version`,
      ),
    );
  const denied = async (ws, name, p) => {
    const before = await snap(ws);
    const x = await p();
    ok(!!x.error, name);
    ok(before === (await snap(ws)), `${name}: data unchanged`);
  };
  const status = async (ws) => (await state(ws)).status;
  const parties = (ws) =>
    svc(
      `select user_id, party, party_accepted_at from public.deal_workspace_members where workspace_id = '${ws}' and party_accepted_at is not null`,
    );

  // Nothing consequential before both people accepted their roles.
  await denied(WS, "submitting a proposal is blocked until roles are established", () =>
    call(A, WS, "submit_workspace_proposal", `, 'Audit dispatch', 1200000, 'usd', '2026-12-01'`),
  );
  await denied(WS, "so is starting work", () =>
    call(A, WS, "transition_workspace_status", `, 'in_progress'`),
  );
  await denied(WS, "so is delivering", () => call(A, WS, "submit_workspace_delivery", `, 'done'`));
  await denied(WS, "and accepting delivery", () =>
    call(B, WS, "accept_workspace_delivery", `, 1, 2`),
  );
  for (const s of ["proposal", "agreed", "in_progress", "delivered", "accepted"]) {
    ok(
      !!(await svc(`update public.deal_workspaces set status = '${s}' where id = '${WS}'`).then(
        () => null,
        (e) => e,
      )),
      `even the service role cannot enter ${s} without established roles`,
    );
  }
  ok(
    !!(await svc(
      `update public.deal_workspace_members set party = 'buyer', party_accepted_at = now() where workspace_id = '${WS}' and user_id = '${B}'`,
    ).then(
      () => null,
      (e) => e,
    )) === false,
    "sanity: a privileged writer can seed party columns while qualified",
  );
  await svc(
    `update public.deal_workspace_members set party = null, party_accepted_at = null where workspace_id = '${WS}'`,
  );
  ok((await parties(WS)).length === 0, "and the roles are reset");

  // Assignment needs both people; nobody assigns the other side alone.
  await denied(WS, "the buyer must be a participant", () =>
    call(A, WS, "propose_workspace_parties", `, '${C}'`),
  );
  await denied(WS, "an outsider cannot propose roles", () =>
    call(C, WS, "propose_workspace_parties", `, '${B}'`),
  );
  ok(
    !(await call(A, WS, "propose_workspace_parties", `, '${A}'`)).error,
    "a participant proposes who is buyer and who is provider",
  );
  ok((await parties(WS)).length === 0, "proposing assigns nothing");
  await denied(WS, "the proposer cannot accept their own proposal", () =>
    call(A, WS, "accept_workspace_parties"),
  );
  await denied(WS, "an outsider cannot accept it", () => call(C, WS, "accept_workspace_parties"));
  await denied(WS, "a role change cannot be forged on the roster", () =>
    as(
      B,
      `update public.deal_workspace_members set party = 'provider', party_accepted_at = now() where workspace_id = '${WS}'`,
    ),
  );
  ok(
    !(await call(B, WS, "decline_workspace_parties")).error && (await parties(WS)).length === 0,
    "the other person declines and nothing is assigned",
  );
  await denied(WS, "with nothing pending, accepting fails", () =>
    call(B, WS, "accept_workspace_parties"),
  );
  ok(
    !(await call(B, WS, "propose_workspace_parties", `, '${B}'`)).error,
    "either person may propose again (B as buyer)",
  );
  ok(!(await call(A, WS, "accept_workspace_parties")).error, "the other person accepts");
  r = await parties(WS);
  ok(
    r.length === 2 &&
      r.find((p) => p.user_id === B).party === "buyer" &&
      r.find((p) => p.user_id === A).party === "provider",
    "B is the buyer, A (the owner) is the provider",
  );
  await denied(WS, "accepting twice is refused", () => call(A, WS, "accept_workspace_parties"));

  // Terms: both parties approve the same immutable version.
  r = await as(
    A,
    `select public.submit_workspace_proposal($1, $2, 'Audit dispatch', 1200000, 'usd', '2026-12-01') v`,
    [WS, await ver(WS)],
  );
  const V1 = r.rows?.[0]?.v;
  ok(V1 > 2 && (await status(WS)) === "proposal", "the provider submits a versioned proposal");
  ok(
    !!(await svc(
      `update public.deal_workspace_proposals set scope = 'edited' where version = ${V1} and workspace_id = '${WS}'`,
    ).then(
      () => null,
      (e) => e,
    )),
    "a submitted version is immutable even for the service role",
  );
  ok(
    (await as(B, `select scope from public.deal_workspaces where id = '${WS}'`)).rows[0].scope ===
      "Draft scope",
    "the terms in force are unchanged by a proposal",
  );
  await denied(WS, "an outsider cannot approve", () =>
    call(C, WS, "approve_workspace_proposal", `, ${V1}`),
  );
  await denied(WS, "an unknown version cannot be approved", () =>
    call(B, WS, "approve_workspace_proposal", `, 999`),
  );
  await denied(WS, "a stale page cannot approve", () =>
    as(B, `select public.approve_workspace_proposal($1, 1, ${V1})`, [WS]),
  );
  await denied(WS, "the service role cannot reach agreed without both approvals", () =>
    svc(`update public.deal_workspaces set status = 'agreed' where id = '${WS}'`).then(
      () => ({}),
      (error) => ({ error }),
    ),
  );
  r = await call(A, WS, "approve_workspace_proposal", `, ${V1}`);
  ok(
    !r.error && (await status(WS)) === "proposal",
    "the owner/provider approves only for themselves: still not agreed",
  );
  await denied(WS, "a replayed approval is refused", () =>
    call(A, WS, "approve_workspace_proposal", `, ${V1}`),
  );
  await denied(WS, "the service role still cannot reach agreed with one approval", () =>
    svc(`update public.deal_workspaces set status = 'agreed' where id = '${WS}'`).then(
      () => ({}),
      (error) => ({ error }),
    ),
  );
  ok(
    !!(await svc(
      `insert into public.deal_workspace_approvals (workspace_id, version, user_id, party) values ('${WS}', ${V1}, '${C}', 'buyer')`,
    ).then(
      () => null,
      (e) => e,
    )),
    "an approval cannot be forged for a non-member, even by the service role",
  );
  ok(
    !!(await svc(
      `insert into public.deal_workspace_approvals (workspace_id, version, user_id, party) values ('${WS}', ${V1}, '${A}', 'buyer')`,
    ).then(
      () => null,
      (e) => e,
    )),
    "nor for someone else's role",
  );
  ok(
    (
      await svc(
        `select count(*)::int n from public.deal_workspace_approvals where workspace_id = '${WS}' and version = ${V1}`,
      )
    )[0].n >= 1,
    "approvals are recorded per person",
  );
  r = await call(B, WS, "approve_workspace_proposal", `, ${V1}`);
  ok(!r.error && (await status(WS)) === "agreed", "the buyer approves the same version: agreed");
  ok((await state(WS)).sv === V1, "the agreed terms version is the one both approved");
  ok(
    (await as(B, `select scope from public.deal_workspaces where id = '${WS}'`)).rows[0].scope ===
      "Audit dispatch",
    "and its terms apply",
  );
  ok(
    !!(await svc(`delete from public.deal_workspace_approvals where workspace_id = '${WS}'`).then(
      () => null,
      (e) => e,
    )),
    "approvals are append-only",
  );

  // Locked after agreement: no unilateral reassignment, removal or in-place edits.
  await denied(WS, "roles cannot be reassigned after agreement", () =>
    call(B, WS, "propose_workspace_parties", `, '${A}'`),
  );
  await denied(WS, "not even by a privileged write", () =>
    svc(
      `update public.deal_workspace_members set party = 'buyer' where workspace_id = '${WS}' and user_id = '${A}'`,
    ).then(
      () => ({}),
      (error) => ({ error }),
    ),
  );
  await denied(WS, "the owner cannot remove the counterparty to escape", () =>
    call(A, WS, "remove_workspace_member", `, '${B}'`),
  );
  await denied(WS, "terms cannot be edited in place", () =>
    call(A, WS, "update_workspace_details", `, 'Logistics audit', 'Bigger', 5, 'usd', null`),
  );
  await denied(WS, "nor directly", () =>
    as(A, `update public.deal_workspaces set scope = 'sneaky'`),
  );
  await denied(WS, "nor by the service role", () =>
    svc(`update public.deal_workspaces set scope = 'sneaky' where id = '${WS}'`).then(
      () => ({}),
      (error) => ({ error }),
    ),
  );

  // Work and delivery: provider submits, buyer accepts.
  await denied(WS, "the buyer cannot start the provider's work", () =>
    call(B, WS, "transition_workspace_status", `, 'in_progress'`),
  );
  ok(
    !(await call(A, WS, "transition_workspace_status", `, 'in_progress'`)).error &&
      (await status(WS)) === "in_progress",
    "the provider starts work",
  );
  await denied(WS, "the buyer cannot submit delivery", () =>
    call(B, WS, "submit_workspace_delivery", `, 'x'`),
  );
  await denied(WS, "delivery is not a plain stage move", () =>
    call(A, WS, "transition_workspace_status", `, 'delivered'`),
  );
  await denied(WS, "acceptance is not a plain stage move", () =>
    call(B, WS, "transition_workspace_status", `, 'accepted'`),
  );
  r = await as(A, `select public.submit_workspace_delivery($1, $2, 'First drop') d`, [
    WS,
    await ver(WS),
  ]);
  const D1 = r.rows?.[0]?.d;
  ok(D1 === 1 && (await status(WS)) === "delivered", "the provider submits delivery 1");
  ok(
    (
      await svc(
        `select terms_version from public.deal_workspace_deliveries where version = 1 and workspace_id = '${WS}'`,
      )
    )[0].terms_version === V1,
    "it records the terms version it was made against",
  );
  await denied(WS, "the provider cannot accept their own delivery", () =>
    call(A, WS, "accept_workspace_delivery", `, ${D1}, ${V1}`),
  );
  await denied(
    WS,
    "the owner role gives no acceptance right (service-role forged acceptance fails)",
    () =>
      svc(
        `update public.deal_workspaces set status = 'accepted', accepted_by = '${A}', accepted_delivery_version = 1 where id = '${WS}'`,
      ).then(
        () => ({}),
        (error) => ({ error }),
      ),
  );
  await denied(WS, "a stale delivery version cannot be accepted", () =>
    call(B, WS, "accept_workspace_delivery", `, 99, ${V1}`),
  );
  await denied(WS, "stale terms cannot be confirmed", () =>
    call(B, WS, "accept_workspace_delivery", `, ${D1}, ${V1 - 1}`),
  );
  await denied(WS, "an outsider cannot accept", () =>
    call(C, WS, "accept_workspace_delivery", `, ${D1}, ${V1}`),
  );

  // Re-approval after agreement: progression is blocked, not silently invalidated.
  r = await as(
    B,
    `select public.submit_workspace_proposal($1, $2, 'Bigger scope', 2000000, 'usd', null) v`,
    [WS, await ver(WS)],
  );
  const V2 = r.rows?.[0]?.v;
  const s2 = await state(WS);
  ok(
    V2 > V1 && s2.status === "proposal" && s2.sv === V1,
    "a material change opens a new version and pauses the workspace at proposal",
  );
  ok(
    (await svc(`select resume_status from public.deal_workspaces where id = '${WS}'`))[0]
      .resume_status === "delivered",
    "it remembers the stage to resume",
  );
  ok(
    (await as(A, `select scope from public.deal_workspaces where id = '${WS}'`)).rows[0].scope ===
      "Audit dispatch",
    "the approved terms stay in force until renewed approval",
  );
  await denied(WS, "delivery cannot be accepted while re-approval is pending", () =>
    call(B, WS, "accept_workspace_delivery", `, ${D1}, ${V1}`),
  );
  await denied(WS, "work cannot be re-delivered while re-approval is pending", () =>
    call(A, WS, "submit_workspace_delivery", `, 'x'`),
  );
  await denied(WS, "one side cannot approve and force it through (service role)", () =>
    svc(
      `update public.deal_workspaces set status = 'in_progress', scope_version = ${V2}, scope = 'Bigger scope' where id = '${WS}'`,
    ).then(
      () => ({}),
      (error) => ({ error }),
    ),
  );
  r = await as(
    A,
    `select public.submit_workspace_proposal($1, $2, 'Bigger scope v3', 2500000, 'usd', null) v`,
    [WS, await ver(WS)],
  );
  const V3 = r.rows?.[0]?.v;
  await denied(WS, "a replaced version can no longer be approved", () =>
    call(B, WS, "approve_workspace_proposal", `, ${V2}`),
  );
  ok(
    !(await call(B, WS, "decline_workspace_proposal", `, ${V3}`)).error,
    "the buyer declines the change",
  );
  const s3 = await state(WS);
  ok(
    s3.status === "delivered" && s3.sv === V1,
    "a declined change resumes the previous stage and terms",
  );
  ok(
    (await svc(`select resume_status from public.deal_workspaces where id = '${WS}'`))[0]
      .resume_status === null,
    "nothing is left pending",
  );
  r = await as(
    A,
    `select public.submit_workspace_proposal($1, $2, 'Final scope', 2500000, 'usd', null) v`,
    [WS, await ver(WS)],
  );
  const V4 = r.rows?.[0]?.v;
  // Concurrent approvals with the same loaded version: exactly one wins, the other must reload.
  const loaded = await ver(WS);
  const ra = await as(A, `select public.approve_workspace_proposal($1, $2, ${V4})`, [WS, loaded]);
  const rb = await as(B, `select public.approve_workspace_proposal($1, $2, ${V4})`, [WS, loaded]);
  ok(
    !!ra.error !== !!rb.error,
    "of two approvals made from one loaded version, exactly one is accepted (single-connection simulation)",
  );
  ok(
    /changed since you loaded/i.test(String(ra.error ?? rb.error ?? "")),
    "the loser gets a conflict, not a silent overwrite",
  );
  ok((await status(WS)) === "proposal", "one approval is still not agreement");
  r = ra.error
    ? await call(A, WS, "approve_workspace_proposal", `, ${V4}`)
    : await call(B, WS, "approve_workspace_proposal", `, ${V4}`);
  ok(
    !r.error && (await status(WS)) === "in_progress",
    "after reload the second party approves: work resumes, delivery against old terms is not carried over",
  );
  ok((await state(WS)).sv === V4, "the terms version is the renewed one");
  ok(
    (
      await svc(
        `select status from public.deal_workspace_deliveries where version = 1 and workspace_id = '${WS}'`,
      )
    )[0].status === "superseded",
    "the earlier delivery was superseded",
  );
  await denied(WS, "the superseded delivery cannot be accepted", () =>
    call(B, WS, "accept_workspace_delivery", `, ${D1}, ${V4}`),
  );

  r = await as(A, `select public.submit_workspace_delivery($1, $2, 'Second drop') d`, [
    WS,
    await ver(WS),
  ]);
  const D2 = r.rows?.[0]?.d;
  ok(D2 === 2, "the provider submits delivery 2 against the renewed terms");
  await denied(WS, "accepting against the old terms version is refused", () =>
    call(B, WS, "accept_workspace_delivery", `, ${D2}, ${V1}`),
  );
  ok(
    !(await call(B, WS, "reject_workspace_delivery", `, ${D2}`)).error &&
      (await status(WS)) === "in_progress",
    "the buyer can send a delivery back",
  );
  await denied(WS, "the provider cannot do that for the buyer", () =>
    call(A, WS, "reject_workspace_delivery", `, ${D2}`),
  );
  r = await as(A, `select public.submit_workspace_delivery($1, $2, 'Third drop') d`, [
    WS,
    await ver(WS),
  ]);
  const D3 = r.rows?.[0]?.d;
  ok(
    !(await call(B, WS, "accept_workspace_delivery", `, ${D3}, ${V4}`)).error &&
      (await status(WS)) === "accepted",
    "only the buyer accepts, naming delivery and terms versions",
  );
  const fin = (
    await svc(
      `select accepted_by, accepted_delivery_version adv from public.deal_workspaces where id = '${WS}'`,
    )
  )[0];
  ok(
    fin.accepted_by === B && fin.adv === D3,
    "acceptance is recorded against the real actor and delivery",
  );
  await denied(WS, "accepting again is refused", () =>
    call(B, WS, "accept_workspace_delivery", `, ${D3}, ${V4}`),
  );
  await denied(WS, "the buyer cannot close", () =>
    call(B, WS, "transition_workspace_status", `, 'closed'`),
  );
  ok(
    !(await call(A, WS, "transition_workspace_status", `, 'closed'`)).error &&
      (await status(WS)) === "closed",
    "the owner closes an accepted workspace",
  );
  ok(
    !!(await svc(
      `update public.deal_workspaces set status = 'in_progress' where id = '${WS}'`,
    ).then(
      () => null,
      (e) => e,
    )),
    "a closed workspace stays closed",
  );
  ok(
    (await as(B, `select status from public.deal_workspaces where id = '${WS}'`)).rows[0].status ===
      "closed",
    "and it persists for the other participant",
  );

  // History: authenticated actors, versions and states; no private payloads.
  const ev = await svc(
    `select kind, actor_id, prev_status, new_status, scope_version, delivery_version, detail from public.deal_workspace_events where workspace_id = '${WS}' order by created_at, id`,
  );
  const acc = ev.find((e) => e.kind === "delivery_accepted");
  ok(
    acc &&
      acc.actor_id === B &&
      acc.prev_status === "delivered" &&
      acc.new_status === "accepted" &&
      acc.scope_version === V4 &&
      acc.delivery_version === D3,
    "history records actor, versions and previous/new stage",
  );
  ok(
    !ev.some((e) =>
      /Secret scope|Send NDA|Share dispatch|Owner edit|Audit dispatch|Bigger scope|First drop/.test(
        e.detail ?? "",
      ),
    ),
    "history holds no private text",
  );
  ok(
    ev.every((e) => e.actor_id),
    "every event has an authenticated actor",
  );
  ok(
    !!(await svc(`update public.deal_workspace_events set kind = 'x'`).then(
      () => null,
      (e) => e,
    )),
    "history cannot be rewritten",
  );

  // Roles are independent of who opened the room: the non-owner can be the provider.
  const T5 = T2;
  await svc(`delete from public.deal_workspaces where source_id = '${T5}'`);
  const WS2 = (
    await as(
      C,
      `select public.create_deal_workspace('dm_thread', $1, 'Buyer-owned room', '', '', null, null, null, 'Join?') r`,
      [T5],
    )
  ).rows[0].r.id;
  ok(
    !(await as(A, `select public.respond_workspace_invite($1, true)`, [WS2])).error,
    "the invitee accepts",
  );
  ok(
    !(await call(C, WS2, "propose_workspace_parties", `, '${C}'`)).error &&
      !(await call(A, WS2, "accept_workspace_parties")).error,
    "the owner is the buyer, the invitee is the provider",
  );
  r = await as(A, `select public.submit_workspace_proposal($1, $2, 'Scope', null, null, null) v`, [
    WS2,
    await ver(WS2),
  ]);
  const W2V = r.rows?.[0]?.v;
  ok(!r.error, "the non-owner provider submits terms");
  ok(
    !(await call(C, WS2, "approve_workspace_proposal", `, ${W2V}`)).error &&
      (await status(WS2)) === "proposal",
    "the owner/buyer approves for themselves only",
  );
  ok(
    !(await call(A, WS2, "approve_workspace_proposal", `, ${W2V}`)).error &&
      (await status(WS2)) === "agreed",
    "the provider approves: agreed",
  );
  await denied(WS2, "the owner/buyer cannot start or deliver the provider's work", () =>
    call(C, WS2, "transition_workspace_status", `, 'in_progress'`),
  );
  ok(
    !(await call(A, WS2, "transition_workspace_status", `, 'in_progress'`)).error,
    "the provider starts",
  );
  await call(A, WS2, "submit_workspace_delivery", `, 'drop'`);
  await denied(WS2, "the provider cannot accept", () =>
    call(A, WS2, "accept_workspace_delivery", `, 1, ${W2V}`),
  );
  ok(
    !(await call(C, WS2, "accept_workspace_delivery", `, 1, ${W2V}`)).error &&
      (await status(WS2)) === "accepted",
    "the buyer (here the owner) accepts",
  );
  ok(
    (
      await as(
        C,
        `select count(*)::int n from public.deal_workspace_events where workspace_id = '${WS}'`,
      )
    ).rows[0].n === 0,
    "and C still reads nothing of the other workspace",
  );

  // Cancelling: owner only, never after acceptance.
  const [{ id: T6 }] = await svc(
    `insert into public.dm_threads (member_a, member_b, created_by) values ('${B}', '${C}', '${B}') returning id`,
  );
  const WS3 = (
    await as(B, `select public.create_deal_workspace('dm_thread', $1, 'Cancel me') r`, [T6])
  ).rows[0].r.id;
  await as(C, `select public.respond_workspace_invite($1, true)`, [WS3]);
  await denied(WS3, "the counterparty cannot cancel", () =>
    call(C, WS3, "transition_workspace_status", `, 'cancelled'`),
  );
  ok(
    !(await call(B, WS3, "transition_workspace_status", `, 'cancelled'`)).error &&
      (await status(WS3)) === "cancelled",
    "the owner cancels before acceptance",
  );

  // Existing records: legacy rows are moved to re-approval, no approvals or roles are invented.
  const leg = async (st, n) =>
    (
      await svc(
        `insert into public.deal_workspaces (created_by, source_type, source_id, title, scope, status) values ('${A}', 'dm_thread', gen_random_uuid(), 'Legacy ${n}', 'old', '${st}') returning id`,
      )
    )[0].id;
  const L1 = await leg("agreed", 1),
    L2 = await leg("in_progress", 2),
    L3 = await leg("delivered", 3),
    L4 = await leg("accepted", 4),
    L5 = await leg("qualified", 5);
  ok(
    (await svc(`select public.deal_workspace_reapproval_backfill() n`))[0].n === 3,
    "the backfill moves exactly the agreed / in_progress / delivered rows",
  );
  const lg = await svc(
    `select id, status, resume_status from public.deal_workspaces where id in ('${L1}','${L2}','${L3}','${L4}','${L5}')`,
  );
  const g = (id) => lg.find((x) => x.id === id);
  ok(
    g(L1).status === "proposal" &&
      g(L1).resume_status === "agreed" &&
      g(L2).resume_status === "in_progress" &&
      g(L3).resume_status === "delivered",
    "they await re-approval and remember their stage",
  );
  ok(
    g(L4).status === "accepted" && g(L5).status === "qualified",
    "accepted and qualified rows are untouched",
  );
  ok(
    (
      await svc(
        `select count(*)::int n from public.deal_workspace_approvals where workspace_id in ('${L1}','${L2}','${L3}')`,
      )
    )[0].n === 0,
    "no approvals were invented",
  );
  ok(
    (
      await svc(
        `select count(*)::int n from public.deal_workspace_members where workspace_id in ('${L1}','${L2}','${L3}') and party is not null`,
      )
    )[0].n === 0,
    "and no roles",
  );
  ok(
    (
      await svc(
        `select count(*)::int n from public.deal_workspace_events where workspace_id in ('${L1}','${L2}','${L3}') and kind = 'migrated_requires_reapproval' and actor_id is null`,
      )
    )[0].n === 3,
    "the migration is recorded in history with no actor",
  );
  ok(
    (await svc(`select public.deal_workspace_reapproval_backfill() n`))[0].n === 0,
    "running it again changes nothing",
  );
  ok(
    !!(await svc(`update public.deal_workspaces set status = 'agreed' where id = '${L1}'`).then(
      () => null,
      (e) => e,
    )),
    "a migrated row cannot be pushed back to agreed without roles and approvals",
  );
  ok(
    !!(await as(A, `select public.deal_workspace_reapproval_backfill()`)).error,
    "clients cannot run the backfill",
  );
};
