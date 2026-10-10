// 0057 deal workspaces: private, active-member-only, RPC-only writes, role matrix,
// versioned proposals, optimistic concurrency and an append-only history.
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const INTRO = '11111111-1111-4111-8111-111111111111' // accepted introduction between C and B (seed)
  const PENDING = '22222222-2222-4222-8222-222222222222' // C asked A, never accepted (seed)
  const [{ id: THREAD }] = await svc(`insert into public.dm_threads (member_a, member_b, created_by) values ('${A}', '${B}', '${A}') returning id`)
  const create = (uid, type, id, title = 'Logistics audit') =>
    as(uid, `select public.create_deal_workspace($1, $2, $3) r`, [type, id, title])
  const ver = async (ws) => (await svc(`select row_version v from public.deal_workspaces where id = '${ws}'`))[0].v
  const state = async (ws) => (await svc(`select status, scope_version sv from public.deal_workspaces where id = '${ws}'`))[0]
  const call = async (uid, ws, fn, args = '') => as(uid, `select public.${fn}($1, $2${args})`, [ws, await ver(ws)])

  // Creation: only from your own conversation or an accepted introduction.
  ok(!!(await create(C, 'dm_thread', THREAD)).error, 'an outsider cannot open a workspace from someone else\'s conversation')
  ok(!!(await create(A, 'intro_request', PENDING)).error && !!(await create(C, 'intro_request', PENDING)).error, 'an introduction nobody accepted cannot become a workspace')
  ok(!!(await create(A, 'intro_request', INTRO)).error, 'nor can a member outside that introduction')
  ok(!!(await create(A, 'dm_thread', THREAD, 'ab')).error, 'the title must be real')
  ok(!!(await as(A, `select public.create_deal_workspace('dm_thread', $1, 'Audit', '', '', 5000, null)`, [THREAD])).error, 'a budget needs a currency')
  ok(!!(await as(null, `select public.create_deal_workspace('dm_thread', $1, 'Audit')`, [THREAD])).error, 'visitors cannot')
  ok(!!(await as(A, `insert into public.deal_workspaces (source_type, source_id, title) values ('dm_thread', $1, 'Direct insert')`, [THREAD])).error, 'tables cannot be written directly')
  ok((await svc(`select count(*)::int n from public.deal_workspaces`))[0].n === 0, 'failed creations persisted nothing')

  let r = await create(A, 'dm_thread', THREAD)
  ok(r.rows?.[0]?.r?.created === true, 'a member opens a workspace from a conversation')
  const WS = r.rows[0].r.id
  r = await create(A, 'dm_thread', THREAD)
  ok(r.rows?.[0]?.r?.created === false && r.rows[0].r.id === WS, 'submitting twice returns the same workspace')
  r = await create(B, 'dm_thread', THREAD)
  ok(r.rows?.[0]?.r?.id === WS && r.rows[0].r.created === false, 'the other person gets the existing workspace, not a second one')
  ok((await svc(`select count(*)::int n from public.deal_workspaces`))[0].n === 1 && (await svc(`select count(*)::int n from public.deal_workspace_members`))[0].n === 2, 'one workspace and one two-person roster exist for the source')
  ok(!!(await svc(`insert into public.deal_workspaces (created_by, source_type, source_id, title) values ('${A}', 'dm_thread', '${THREAD}', 'Dup')`).then(() => null, e => e)), 'the database itself rejects a second workspace for a source')
  ok((await svc(`select actor_id from public.deal_workspace_events where kind = 'created'`))[0].actor_id === A, 'the history actor is the authenticated caller')
  ok((await svc(`select count(*)::int n from public.notifications where kind = 'workspace_invite' and user_id = '${B}'`))[0].n === 1, 'the other person is told once')

  // Reads: active members only. An accepted conversation is not consent either.
  ok((await as(A, `select id from public.deal_workspaces`)).rows?.length === 1, 'the owner reads it')
  ok((await as(B, `select id from public.deal_workspaces`)).rows?.length === 0, 'a pending invitee reads no workspace')
  ok((await as(B, `select id from public.deal_workspace_events`)).rows?.length === 0 && (await as(B, `select id from public.deal_workspace_steps`)).rows?.length === 0 && (await as(B, `select version from public.deal_workspace_proposals`)).rows?.length === 0, 'nor steps, history or proposals')
  ok((await as(B, `select user_id from public.deal_workspace_members`)).rows?.length === 1, 'only their own invitation row')
  r = await as(B, `select * from public.my_workspace_invitations()`)
  ok(r.rows?.length === 1 && r.rows[0].title === 'Logistics audit' && !('scope' in r.rows[0]), 'the invitation preview shows the title only, no terms')
  ok((await as(C, `select id from public.deal_workspaces`)).rows?.length === 0 && (await as(C, `select user_id from public.deal_workspace_members`)).rows?.length === 0, 'outsiders see nothing')
  ok(!!(await as(null, `select id from public.deal_workspaces`)).error, 'visitors have no access')

  // Invited person cannot act until they accept; nobody else can accept for them.
  ok(!!(await as(B, `select public.add_workspace_step($1, 'Send NDA')`, [WS])).error, 'an invited person cannot add steps before accepting')
  ok(!!(await call(B, WS, 'set_workspace_next_action', `, 'x'`)).error, 'nor set the next action')
  ok(!!(await as(C, `select public.respond_workspace_invite($1, true)`, [WS])).error, 'an outsider cannot accept the invitation')
  ok(!!(await as(A, `select public.respond_workspace_invite($1, true)`, [WS])).error, 'the owner cannot accept on behalf of the invitee')
  ok(!!(await as(B, `update public.deal_workspace_members set status = 'active', role = 'owner'`)).error, 'the roster cannot be edited directly')
  ok(!!(await as(B, `insert into public.deal_workspace_members (workspace_id, user_id, role, status) values ('${WS}', '${C}', 'owner', 'active')`)).error, 'nor extended directly')

  // Declined: no access either, and it cannot be flipped by the decliner.
  const [{ id: T2 }] = await svc(`insert into public.dm_threads (member_a, member_b, created_by) values ('${A}', '${C}', '${A}') returning id`)
  const WSD = (await create(A, 'dm_thread', T2, 'Declined deal')).rows[0].r.id
  ok(!(await as(C, `select public.respond_workspace_invite($1, false)`, [WSD])).error, 'an invitee declines')
  ok((await as(C, `select id from public.deal_workspaces`)).rows?.length === 0 && (await as(C, `select id from public.deal_workspace_events`)).rows?.length === 0, 'a declined invitee has no access')
  ok(!!(await as(C, `select public.respond_workspace_invite($1, true)`, [WSD])).error, 'a decline cannot be reversed by the decliner')
  ok(!!(await as(C, `select public.add_workspace_step($1, 'x')`, [WSD])).error, 'a declined invitee cannot write')
  ok((await svc(`select count(*)::int n from public.deal_workspace_events where workspace_id = '${WSD}' and kind = 'invite_declined'`))[0].n === 1, 'the decline is in the history')

  ok(!(await as(B, `select public.respond_workspace_invite($1, true)`, [WS])).error, 'the invited person accepts')
  ok(!!(await as(B, `select public.respond_workspace_invite($1, true)`, [WS])).error, 'accepting twice is refused')
  ok((await as(B, `select id from public.deal_workspaces`)).rows?.length === 1 && (await as(B, `select id from public.deal_workspace_events`)).rows?.length >= 2, 'after accepting they read the workspace and its history')
  ok((await state(WS)).status === 'qualified', 'accepting the invitation is not agreement: the stage is unchanged')

  // Role matrix: counterparty cannot edit terms or move stages; owner cannot approve or accept.
  ok(!!(await call(B, WS, 'update_workspace_details', `, 'Mine now', 'x', null, null, null`)).error, 'a counterparty cannot change the terms')
  ok(!!(await call(C, WS, 'update_workspace_details', `, 'Mine now', 'x', null, null, null`)).error, 'nor an outsider')
  ok(!!(await call(B, WS, 'submit_workspace_proposal', `, 'x', null, null, null`)).error, 'a counterparty cannot submit a proposal')
  ok(!!(await call(B, WS, 'transition_workspace_status', `, 'cancelled'`)).error, 'a counterparty cannot move the stage')
  ok(!(await call(A, WS, 'update_workspace_details', `, 'Logistics audit', 'Draft scope', 1200000, 'usd', '2026-12-01'`)).error, 'the owner edits the draft terms')
  ok((await state(WS)).sv === 2, 'a draft change bumps the scope version')
  ok(!!(await call(A, WS, 'update_workspace_details', `, 'Logistics audit', 'x', 100, null, null`)).error, 'a budget without currency is refused')
  ok(!!(await call(A, WS, 'update_workspace_details', `, 'Logistics audit', 'x', -1, 'usd', null`)).error, 'a negative budget is refused')
  ok(!(await call(B, WS, 'set_workspace_next_action', `, 'Share dispatch export'`)).error, 'either active participant sets the next action')
  ok((await as(A, `select next_action from public.deal_workspaces where id = '${WS}'`)).rows?.[0]?.next_action === 'Share dispatch export', 'and the owner sees it (persisted)')
  r = await as(A, `select public.add_workspace_step($1, 'Send NDA') id`, [WS])
  const STEP = r.rows?.[0]?.id
  ok(!!STEP && !(await as(B, `select public.set_workspace_step_done($1, true)`, [STEP])).error, 'a participant adds a step and the other ticks it')
  ok((await as(A, `select done_by from public.deal_workspace_steps`)).rows?.[0]?.done_by === B, 'recorded against the real actor')
  ok(!!(await as(A, `select public.add_workspace_step($1, '   ')`, [WS])).error, 'blank steps are refused')
  ok(!!(await as(C, `select public.set_workspace_step_done($1, false)`, [STEP])).error, 'an outsider cannot change steps')
  ok(!!(await as(B, `update public.deal_workspace_steps set done_by = '${A}'`)).error, 'steps cannot be forged directly')

  // Optimistic concurrency.
  const stale = await ver(WS)
  ok(!(await as(A, `select public.set_workspace_next_action($1, $2, 'Owner edit')`, [WS, stale])).error, 'a first writer succeeds')
  r = await as(B, `select public.set_workspace_next_action($1, $2, 'Stale edit')`, [WS, stale])
  ok(r.error && /changed since you loaded/i.test(String(r.error.message ?? r.error)), 'a writer holding an older version is rejected with a conflict')
  ok((await as(A, `select next_action from public.deal_workspaces where id = '${WS}'`)).rows?.[0]?.next_action === 'Owner edit', 'the stale write changed nothing')
  ok(!!(await as(A, `select public.set_workspace_next_action($1, null, 'x')`, [WS])).error, 'a write without a version is refused')

  // Lifecycle: proposal -> approval by counterparty -> work -> delivery -> acceptance by recipient.
  ok(!!(await call(A, WS, 'transition_workspace_status', `, 'agreed'`)).error, 'the owner cannot declare agreement')
  ok(!!(await call(A, WS, 'transition_workspace_status', `, 'proposal'`)).error, 'a proposal is submitted, not just a stage label')
  ok(!!(await call(A, WS, 'transition_workspace_status', `, 'delivered'`)).error, 'stages cannot be skipped')
  ok(!!(await as(A, `update public.deal_workspaces set status = 'accepted'`)).error, 'status cannot be written directly')
  ok(!!(await call(A, WS, 'transition_workspace_status', `, 'bogus'`)).error, 'unknown stages are refused')
  ok(!!(await call(A, WS, 'submit_workspace_proposal', `, '  ', null, null, null`)).error, 'a proposal needs a scope')
  r = await as(A, `select public.submit_workspace_proposal($1, $2, 'Audit dispatch', 1200000, 'usd', '2026-12-01') v`, [WS, await ver(WS)])
  const V1 = r.rows?.[0]?.v
  ok(V1 > 1, 'the owner submits a versioned proposal')
  ok((await state(WS)).status === 'proposal', 'the stage becomes proposal')
  ok(!!(await call(A, WS, 'approve_workspace_proposal', `, ${V1}`)).error, 'the owner cannot approve their own proposal')
  ok(!!(await call(C, WS, 'approve_workspace_proposal', `, ${V1}`)).error, 'an outsider cannot approve')
  ok(!!(await call(B, WS, 'approve_workspace_proposal', `, 999`)).error, 'an unknown version cannot be approved')
  ok(await svc(`update public.deal_workspaces set status = 'agreed' where id = '${WS}'`).then(() => false, () => true), 'even the service role cannot reach agreed without the counterparty approval')
  r = await call(B, WS, 'approve_workspace_proposal', `, ${V1}`)
  ok(!r.error && (await state(WS)).status === 'agreed', 'the counterparty approves and the workspace is agreed')
  ok((await svc(`select decided_by from public.deal_workspace_proposals where version = ${V1}`))[0].decided_by === B, 'the approver is recorded')
  ok(!(await call(A, WS, 'transition_workspace_status', `, 'in_progress'`)).error, 'then work starts')
  ok(!!(await call(B, WS, 'transition_workspace_status', `, 'delivered'`)).error, 'the counterparty cannot declare delivery')

  // Material change after agreement: versioned and re-approved.
  ok(!!(await call(A, WS, 'update_workspace_details', `, 'Logistics audit', 'Bigger scope', 2000000, 'usd', null`)).error, 'scope cannot be edited in place after agreement')
  ok(!!(await as(A, `update public.deal_workspaces set scope = 'sneaky'`)).error, 'nor directly')
  r = await as(A, `select public.submit_workspace_proposal($1, $2, 'Bigger scope', 2000000, 'usd', null) v`, [WS, await ver(WS)])
  const V2 = r.rows?.[0]?.v
  ok(V2 > V1, 'the owner submits a new proposal version')
  ok((await as(B, `select scope from public.deal_workspaces where id = '${WS}'`)).rows?.[0]?.scope === 'Audit dispatch', 'the approved terms stay in force until re-approval')
  ok(!!(await call(B, WS, 'approve_workspace_proposal', `, ${V1}`)).error, 'the superseded version cannot be approved')
  ok(!(await call(B, WS, 'decline_workspace_proposal', `, ${V2}`)).error, 'the counterparty can decline a change')
  ok((await as(A, `select scope from public.deal_workspaces where id = '${WS}'`)).rows?.[0]?.scope === 'Audit dispatch', 'a declined change alters nothing')
  r = await as(A, `select public.submit_workspace_proposal($1, $2, 'Bigger scope', 2000000, 'usd', null) v`, [WS, await ver(WS)])
  const V3 = r.rows?.[0]?.v
  ok(!(await call(B, WS, 'approve_workspace_proposal', `, ${V3}`)).error, 'and approve a resubmitted one')
  ok((await as(A, `select scope, budget_cents from public.deal_workspaces where id = '${WS}'`)).rows?.[0]?.scope === 'Bigger scope', 'renewed approval applies the new terms')

  ok(!!(await call(A, WS, 'accept_workspace_delivery')).error, 'nothing can be accepted before delivery')
  ok(!(await call(A, WS, 'transition_workspace_status', `, 'delivered'`)).error, 'the owner marks delivered')
  ok(!!(await call(A, WS, 'accept_workspace_delivery')).error, 'the owner cannot accept their own delivery')
  ok(!!(await call(C, WS, 'accept_workspace_delivery')).error, 'an outsider cannot accept')
  ok(await svc(`update public.deal_workspaces set status = 'accepted', accepted_by = '${A}' where id = '${WS}'`).then(() => false, () => true), 'even the service role cannot record the owner as the recipient')
  ok(!(await call(B, WS, 'accept_workspace_delivery')).error, 'the designated recipient accepts')
  const fin = (await svc(`select status, accepted_by from public.deal_workspaces where id = '${WS}'`))[0]
  ok(fin.status === 'accepted' && fin.accepted_by === B, 'acceptance is persisted with the real actor')
  ok(!!(await call(A, WS, 'transition_workspace_status', `, 'cancelled'`)).error, 'an accepted workspace cannot be cancelled')
  ok(!(await call(A, WS, 'transition_workspace_status', `, 'closed'`)).error, 'and is closed by the owner')
  ok(!!(await call(A, WS, 'set_workspace_next_action', `, 'More'`)).error, 'a closed workspace takes no more changes')
  ok(!!(await call(A, WS, 'transition_workspace_status', `, 'qualified'`)).error, 'a closed workspace cannot reopen')
  ok(!!(await as(A, `select public.add_workspace_step($1, 'Late step')`, [WS])).error, 'nor take new steps')
  ok(await svc(`update public.deal_workspaces set status = 'qualified' where id = '${WS}'`).then(() => false, () => true), 'even the service role cannot walk the lifecycle backwards')

  // History: append-only, participant-visible, with actor, time, previous/new state and scope version.
  const ev = (await as(B, `select kind, actor_id, created_at, prev_status, new_status, scope_version from public.deal_workspace_events where kind = 'status' or kind like 'proposal%' or kind = 'delivery_accepted' order by created_at`)).rows
  ok(ev.length >= 6 && ev.every(e => e.actor_id && e.created_at && e.scope_version >= 1), 'participants read the history with actor, timestamp and scope version')
  ok(ev.some(e => e.kind === 'delivery_accepted' && e.actor_id === B && e.prev_status === 'delivered' && e.new_status === 'accepted'), 'it records previous and new state')
  ok(!!(await as(A, `update public.deal_workspace_events set detail = 'x'`)).error, 'history is not rewritable')
  ok(!!(await as(A, `delete from public.deal_workspace_events`)).error, 'or deletable')
  ok(await svc(`update public.deal_workspace_events set actor_id = '${A}'`).then(() => false, () => true), 'even by the service role')
  ok(!!(await as(A, `insert into public.deal_workspace_events (workspace_id, actor_id, kind) values ('${WS}', '${B}', 'forged')`)).error, 'and actors cannot be forged by inserting events')

  // Reload persistence: separate fresh reads see what was written.
  ok((await as(A, `select count(*)::int n from public.deal_workspace_steps where workspace_id = '${WS}'`)).rows?.[0]?.n === 1, 'steps persist across reads')

  // Introduction source, membership changes, private CRM link.
  r = await create(C, 'intro_request', INTRO, 'Fractional CFO engagement')
  const WS2 = r.rows?.[0]?.r?.id
  ok(!!WS2, 'an accepted introduction becomes a workspace')
  ok((await svc(`select count(*)::int n from public.deal_workspace_members where workspace_id = '${WS2}' and status = 'active'`))[0].n === 1, 'the accepted introduction is not project consent: the other side is only invited')
  ok((await as(A, `select id from public.deal_workspaces where id = '${WS2}'`)).rows?.length === 0, 'unrelated members cannot read it')
  ok(!!(await as(C, `select public.invite_workspace_member($1, $2)`, [WS2, A])).error, 'the owner cannot add someone outside the introduction')
  ok(!!(await as(B, `select public.invite_workspace_member($1, $2)`, [WS2, A])).error, 'an invitee cannot invite anyone')
  ok(!(await as(B, `select public.respond_workspace_invite($1, false)`, [WS2])).error, 'the invitee can decline')
  ok(!!(await as(C, `select public.invite_workspace_member($1, $2)`, [WS2, B])).error === false, 'the owner re-invites the other person')
  ok(!(await as(B, `select public.respond_workspace_invite($1, true)`, [WS2])).error, 'who accepts')
  ok(!!(await as(B, `select public.remove_workspace_member($1, $2)`, [WS2, C])).error, 'a counterparty cannot remove the owner')
  ok(!!(await as(A, `select public.remove_workspace_member($1, $2)`, [WS2, B])).error, 'an outsider cannot remove anyone')
  ok(!(await as(C, `select public.remove_workspace_member($1, $2)`, [WS2, B])).error, 'the owner removes the counterparty')
  ok((await as(B, `select id from public.deal_workspaces where id = '${WS2}'`)).rows?.length === 0 && (await as(B, `select id from public.deal_workspace_steps where workspace_id = '${WS2}'`)).rows?.length === 0, 'who then loses access to it and its steps')
  ok(!!(await as(B, `select public.respond_workspace_invite($1, true)`, [WS2])).error, 'a removed member cannot rejoin by themselves')

  await svc(`insert into public.crm_opportunities (id, owner_id) values ('33333333-3333-4333-8333-333333333333', '${C}')`)
  ok(!(await as(C, `select public.link_workspace_opportunity($1, '33333333-3333-4333-8333-333333333333')`, [WS2])).error, 'the owner links their own CRM opportunity')
  ok(!!(await as(C, `select public.link_workspace_opportunity($1, '44444444-4444-4444-8444-444444444444')`, [WS2])).error, 'but not one they do not own')
  ok((await as(A, `select crm_opportunity_id from public.deal_workspace_crm_links`)).rows?.length === 0, 'the link is private to its owner')
  ok((await as(C, `select crm_opportunity_id from public.deal_workspace_crm_links`)).rows?.length === 1, 'and visible to them')
  ok(!!(await as(C, `insert into public.deal_workspace_crm_links (workspace_id, crm_opportunity_id) values ('${WS2}', '33333333-3333-4333-8333-333333333333')`)).error, 'links cannot be written directly')
  ok(!!(await as(C, `truncate public.deal_workspaces`)).error, 'members cannot truncate')

  // Concurrent creation of one source resolves to one workspace.
  const [{ id: T3 }] = await svc(`insert into public.dm_threads (member_a, member_b, created_by) values ('${B}', '${C}', '${B}') returning id`)
  const both = await Promise.all([create(B, 'dm_thread', T3, 'Race'), create(C, 'dm_thread', T3, 'Race')])
  ok(both.every(x => !x.error) && both[0].rows[0].r.id === both[1].rows[0].r.id, 'racing creators converge on one workspace')
  ok((await svc(`select count(*)::int n from public.deal_workspaces where source_id = '${T3}'`))[0].n === 1, 'exactly one row exists')
}
