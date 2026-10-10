// 0058 deal rooms: private rooms from intros, ask replies, threads and CRM opportunities;
// invitations, proposals, milestones, stage transitions and the outcome spine on close.
export default async ({ ok, as, svc, A, B, C }) => {
  const INTRO = '11111111-1111-4111-8111-111111111111' // C asked, B accepted (seeded)
  await svc(`update public.intro_requests set reason = 'Need a fractional CFO for the raise' where id = '${INTRO}'`)
  await svc(`update public.profiles set name = 'Cara' where id = '${C}'`)
  const one = async (uid, sql, params) => (await as(uid, sql, params)).rows?.[0]
  const err = async (uid, sql, params) => (await as(uid, sql, params)).error ?? ''

  ok(!!(await err(null, `select public.create_deal_room('manual', null, 'Anon room')`)), 'visitors cannot open a deal room')
  ok(!!(await err(A, `select public.create_deal_room('intro', $1, 'Not mine', '', 'buyer', null)`, [INTRO])), 'someone outside an introduction cannot open a room from it')
  ok(/only invite the other person/.test(await err(C, `select public.create_deal_room('intro', $1, 'Pilot', '', 'buyer', $2)`, [INTRO, A])), 'from an introduction only its other participant can be invited')
  ok(!!(await err(B, `select public.create_deal_room('intro', '22222222-2222-4222-8222-222222222222', 'Unaccepted', '', 'buyer', null)`)), 'an unaccepted introduction cannot become a room')

  const R = (await one(C, `select public.create_deal_room('intro', $1, 'CFO search', '', 'buyer', $2) as id`, [INTRO, B]))?.id
  ok(!!R, 'a participant opens a room from an accepted introduction and invites the other side')
  const room = (await svc(`select * from public.deal_rooms where id = '${R}'`))[0]
  ok(room?.need === 'Need a fractional CFO for the raise' && room.stage === 'interested' && room.created_by === C, 'the need is snapshotted from the introduction; the room starts at interested')
  ok((await svc(`select role, accepted_at is not null acc from public.deal_room_members where room_id = '${R}' and user_id = '${C}'`))[0]?.role === 'owner', 'the creator is the owner')
  ok((await svc(`select role, accepted_at from public.deal_room_members where room_id = '${R}' and user_id = '${B}'`))[0]?.accepted_at === null, 'the counterpart is invited, pending')
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${B}' and kind = 'deal_invite'`))[0].n === 1, 'the invitee is told')
  ok((await one(C, `select public.create_deal_room('intro', $1, 'Again', '', 'buyer', null) as id`, [INTRO]))?.id === R, 'opening the same source again returns the existing room')

  // Privacy.
  ok((await as(A, `select id from public.deal_rooms`)).rows?.length === 0, 'non-members cannot read the room')
  ok((await as(A, `select user_id from public.deal_room_members`)).rows?.length === 0, 'non-members cannot read the roster')
  ok((await as(A, `select id from public.deal_events`)).rows?.length === 0, 'non-members cannot read the timeline')
  ok((await as(B, `select title from public.deal_rooms`)).rows?.[0]?.title === 'CFO search', 'the invitee can read the room to decide')
  ok((await as(B, `select id from public.deal_events`)).rows?.length === 0, 'but not its timeline before accepting')
  ok(!!(await err(B, `select public.submit_deal_proposal($1, 'Early terms', 1000)`, [R])), 'an invitee cannot act before accepting')
  ok(!!(await err(null, `select id from public.deal_rooms`)), 'visitors read nothing')

  // Direct writes are closed.
  ok(!!(await err(C, `insert into public.deal_rooms (title) values ('Direct')`)), 'rooms are created only through create_deal_room')
  ok(!!(await err(C, `insert into public.deal_room_members (room_id, user_id, role) values ($1, $2, 'guest')`, [R, A])), 'members are added only through invite_deal_member')
  ok(!!(await err(C, `insert into public.deal_proposals (room_id, version, summary) values ($1, 9, 'Sneaky')`, [R])), 'proposals are written only through the functions')
  ok(!!(await err(C, `update public.deal_rooms set stage = 'closed', outcome = 'won' where id = $1`, [R])), 'the stage cannot be set directly')

  // Invitations: only the owner invites.
  ok(!!(await err(B, `select public.invite_deal_member($1, $2, 'guest')`, [R, A])), 'an invitee cannot invite')
  ok(!!(await err(A, `select public.invite_deal_member($1, $2, 'guest')`, [R, A])), 'an outsider cannot invite themselves')
  ok(!(await err(B, `select public.respond_deal_invite($1, true)`, [R])), 'the invitee accepts')
  ok((await as(B, `select kind from public.deal_events where kind = 'member_joined'`)).rows?.length === 1, 'and now reads the timeline')
  ok(!!(await err(B, `select public.invite_deal_member($1, $2, 'guest')`, [R, A])), 'a member who is not the owner cannot invite')

  // Proposals.
  const P1 = (await one(B, `select public.submit_deal_proposal($1, 'Twelve weeks, two days a week', 48000) as id`, [R]))?.id
  ok(!!P1 && (await svc(`select stage from public.deal_rooms where id = '${R}'`))[0].stage === 'proposal', 'the first proposal moves the room to proposal')
  const P2 = (await one(B, `select public.submit_deal_proposal($1, 'Ten weeks, two days a week', 40000) as id`, [R]))?.id
  ok((await svc(`select status from public.deal_proposals where id = '${P1}'`))[0].status === 'superseded', 'a new version supersedes the open one')
  ok(/own proposal/.test(await err(B, `select public.decide_proposal($1, true)`, [P2])), 'the author cannot accept their own proposal')
  ok(!!(await err(A, `select public.decide_proposal($1, true)`, [P2])), 'an outsider cannot decide a proposal')
  ok(/cannot move/.test(await err(C, `select public.advance_deal_stage($1, 'in_progress')`, [R])), 'illegal transitions are rejected (proposal → in progress)')
  ok(/accepting a proposal/.test(await err(C, `select public.advance_deal_stage($1, 'agreed')`, [R])), 'terms are agreed only by accepting a proposal')
  ok(!(await err(C, `select public.decide_proposal($1, true)`, [P2])), 'the other side accepts the proposal')
  ok((await svc(`select stage from public.deal_rooms where id = '${R}'`))[0].stage === 'agreed', 'accepting moves the room to agreed')
  ok(!!(await err(C, `select public.decide_proposal($1, false)`, [P2])), 'a decided proposal cannot be decided again')
  ok(!!(await err(B, `select public.submit_deal_proposal($1, 'Late change', 1)`, [R])), 'no new proposals after terms are agreed')

  // Stage rules.
  ok(/cannot move/.test(await err(C, `select public.advance_deal_stage($1, 'closed', '', 'won')`, [R])), 'agreed cannot jump to closed')
  ok(/cannot move/.test(await err(B, `select public.advance_deal_stage($1, 'delivered')`, [R])), 'agreed cannot jump to delivered')
  ok(/cannot move/.test(await err(C, `select public.advance_deal_stage($1, 'disputed')`, [R])), 'agreed cannot be disputed before work starts')
  ok(!(await err(C, `select public.advance_deal_stage($1, 'in_progress', 'Kick-off done')`, [R])), 'agreed → in progress')

  // Milestones: provider submits, buyer accepts.
  const M = (await one(C, `select public.add_deal_milestone($1, 'Board pack draft', '2026-11-01') as id`, [R]))?.id
  ok(!!M, 'a party adds a milestone')
  ok(!!(await err(A, `select public.add_deal_milestone($1, 'Intruder')`, [R])), 'outsiders cannot add milestones')
  ok(/provider submits/.test(await err(C, `select public.submit_deal_milestone($1)`, [M])), 'the buyer cannot submit the provider’s milestone')
  ok(!(await err(B, `select public.submit_deal_milestone($1, 'Draft attached')`, [M])), 'the provider submits it')
  ok(!!(await err(B, `select public.review_deal_milestone($1, true)`, [M])), 'the provider cannot accept their own submission')
  ok(!(await err(C, `select public.review_deal_milestone($1, false, 'Add the cash bridge')`, [M])), 'the buyer requests changes')
  ok((await svc(`select status from public.deal_milestones where id = '${M}'`))[0].status === 'changes_requested', 'changes requested is recorded')
  ok(!(await err(B, `select public.submit_deal_milestone($1)`, [M])), 'the provider resubmits')
  ok(!(await err(C, `select public.review_deal_milestone($1, true)`, [M])), 'the buyer accepts')
  ok((await svc(`select status, accepted_at is not null acc from public.deal_milestones where id = '${M}'`))[0].acc === true, 'the milestone is accepted')

  // Details, notes and links.
  ok(!(await err(C, `update public.deal_rooms set scope = 'Raise readiness', budget_low = 30000, budget_high = 50000 where id = $1`, [R])), 'parties edit scope and budget')
  ok((await svc(`select detail from public.deal_events where room_id = '${R}' and kind = 'details_updated'`))[0]?.detail?.fields?.join() === 'scope,budget', 'the edit is on the timeline')
  ok((await as(A, `update public.deal_rooms set scope = 'x' where id = $1 returning id`, [R])).rows?.length === 0, 'outsiders cannot edit')
  ok(!!(await err(C, `update public.deal_rooms set budget_low = 60000, budget_high = 50000 where id = $1`, [R])), 'budget low cannot exceed high')
  ok(!(await err(B, `insert into public.deal_events (room_id, kind, detail) values ($1, 'note', '{"text":"Call booked"}')`, [R])), 'members add notes')
  ok(!(await err(B, `insert into public.deal_events (room_id, kind, detail) values ($1, 'link', '{"url":"https://example.com/pack.pdf","label":"Pack"}')`, [R])), 'members add links')
  ok(!!(await err(B, `insert into public.deal_events (room_id, kind, detail) values ($1, 'link', '{"url":"javascript:alert(1)"}')`, [R])), 'only web links are accepted')
  ok(!!(await err(A, `insert into public.deal_events (room_id, kind, detail) values ($1, 'note', '{"text":"hi"}')`, [R])), 'outsiders cannot add notes')
  ok(!!(await err(B, `insert into public.deal_events (room_id, kind, detail) values ($1, 'stage_changed', '{}')`, [R])), 'members cannot forge system events')
  ok(!!(await err(B, `update public.deal_events set detail = '{}' where room_id = $1`, [R])), 'the timeline cannot be edited')
  ok(!!(await err(C, `delete from public.deal_events where room_id = $1`, [R])), 'the timeline cannot be deleted')

  // Guests read but cannot move the deal.
  ok(!(await err(C, `select public.invite_deal_member($1, $2, 'guest')`, [R, A])), 'the owner invites a guest')
  ok(!(await err(A, `select public.respond_deal_invite($1, true)`, [R])), 'the guest accepts')
  ok((await as(A, `select id from public.deal_proposals`)).rows?.length === 2, 'the guest reads the room')
  ok(!!(await err(A, `select public.advance_deal_stage($1, 'cancelled')`, [R])), 'a guest cannot move the deal')
  ok(!(await err(C, `select public.remove_deal_member($1, $2)`, [R, A])), 'the owner removes the guest')
  ok((await as(A, `select id from public.deal_rooms`)).rows?.length === 0, 'a removed member no longer reads the room')
  ok(!!(await err(B, `select public.remove_deal_member($1, $2)`, [R, C])), 'only the owner removes people')

  // Delivery and close.
  ok(/provider marks/.test(await err(C, `select public.advance_deal_stage($1, 'delivered')`, [R])), 'the buyer cannot mark the provider’s work delivered')
  ok(!(await err(B, `select public.advance_deal_stage($1, 'delivered')`, [R])), 'the provider marks it delivered')
  ok(/buyer confirms/.test(await err(B, `select public.advance_deal_stage($1, 'closed', '', 'won')`, [R])), 'the provider cannot close a delivered deal')
  ok(/won or lost/.test(await err(C, `select public.advance_deal_stage($1, 'closed')`, [R])), 'closing needs an outcome')
  ok(!(await err(C, `select public.advance_deal_stage($1, 'closed', 'Great work', 'won', 'vendor')`, [R])), 'the buyer closes it as won')
  const closed = (await svc(`select stage, outcome from public.deal_rooms where id = '${R}'`))[0]
  ok(closed.stage === 'closed' && closed.outcome === 'won', 'the room is closed, won')
  const oc = await svc(`select author_id, stage, outcome_category, value_band, shareable from public.intro_outcomes where intro_request_id = '${INTRO}'`)
  ok(oc.length === 1 && oc[0].author_id === C && oc[0].stage === 'outcome' && oc[0].outcome_category === 'vendor' && oc[0].value_band === '10k_100k' && oc[0].shareable === false,
    'closing records the closer’s private outcome on the introduction (banded from the agreed amount)')
  ok(/cannot move/.test(await err(C, `select public.advance_deal_stage($1, 'cancelled')`, [R])), 'a closed room cannot be reopened or cancelled')
  ok((await as(C, `update public.deal_rooms set scope = 'later' where id = $1 returning id`, [R])).rows?.length === 0, 'a closed room cannot be edited')

  // Ask replies and threads.
  const reply = (await svc(`select id from public.ask_responses where ask_id = 'ask-old' and user_id = '${B}'`))[0].id
  ok(/only invite the other person/.test(await err(A, `select public.create_deal_room('ask', $1, 'CFO via ask', '', 'buyer', $2)`, [reply, C])), 'from a reply only the replier (or asker) can be invited')
  const R2 = (await one(A, `select public.create_deal_room('ask', $1, 'CFO via ask', '', 'buyer', $2) as id`, [reply, B]))?.id
  ok(!!R2 && /Ask: Looking for a CFO/.test((await svc(`select need from public.deal_rooms where id = '${R2}'`))[0].need), 'the asker opens a room from a reply, with the ask and reply as context')
  ok(!!(await err(C, `select public.create_deal_room('ask', $1, 'Not my reply', '', 'buyer', null)`, [reply])), 'a third person cannot use someone else’s reply')
  ok(!(await err(B, `select public.respond_deal_invite($1, false)`, [R2])), 'an invitee declines')
  ok((await as(B, `select id from public.deal_rooms where id = $1`, [R2])).rows?.length === 0, 'and no longer sees the room')
  ok((await svc(`select outcome from public.deal_rooms where id = '${R2}'`))[0].outcome === null, 'declining does not change the deal')
  ok(!(await err(A, `select public.advance_deal_stage($1, 'cancelled', 'No longer needed')`, [R2])), 'an open room can be cancelled')
  ok((await svc(`select outcome from public.deal_rooms where id = '${R2}'`))[0].outcome === 'withdrawn', 'a cancelled room is recorded as withdrawn')

  const T = (await svc(`insert into public.dm_threads (member_a, member_b, created_by, intro_context) values ('${A}', '${C}', '${A}', 'Met at the Austin dinner') returning id`))[0].id
  const R3 = (await one(C, `select public.create_deal_room('thread', $1, 'Austin follow-up', '', 'provider', $2) as id`, [T, A]))?.id
  ok(!!R3 && (await svc(`select role from public.deal_room_members where room_id = '${R3}' and user_id = '${A}'`))[0].role === 'buyer', 'a thread participant opens a room as provider and the other is invited as buyer')
  ok(!!(await err(B, `select public.create_deal_room('thread', $1, 'Not my thread', '', 'buyer', null)`, [T])), 'someone outside the conversation cannot use it')
  ok(!!(await err(C, `select public.create_deal_room('opportunity', $1, 'Not a CRM row', '', 'buyer', null)`, [T])), 'only your own CRM opportunities can be a source')
  const O = (await svc(`insert into public.crm_opportunities (owner_id) values ('${C}') returning id`))[0].id
  ok(!!(await one(C, `select public.create_deal_room('opportunity', $1, 'Renewal', 'Renew the audit', 'provider', $2) as id`, [O, B]))?.id, 'an owner opens a room from their CRM opportunity and invites anyone')
  ok(!!(await err(B, `select public.create_deal_room('opportunity', $1, 'Theirs', '', 'buyer', null)`, [O])), 'but not from someone else’s')
  ok(!!(await err(C, `select public.create_deal_room('manual', 'x', 'Bad', '', 'buyer', null)`)), 'a room from scratch takes no source id')
  ok(!!(await one(C, `select public.create_deal_room('manual', null, 'Board advisory', '', 'buyer', null) as id`))?.id, 'a room can start from scratch')
  ok((await svc(`select public.deal_transition_allowed('interested', 'closed') a`))[0].a === false && (await svc(`select public.deal_transition_allowed('disputed', 'in_progress') a`))[0].a === true, 'the transition table matches the rules')
}
