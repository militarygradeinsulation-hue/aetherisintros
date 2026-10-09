// 0050 member events: curated events, RSVPs with capacity and waitlist, invites, host edits, reminders
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  await svc(`update public.profiles set name = 'Ada Archer', email = 'ada@example.com' where id = '${A}'`)
  await svc(`update public.profiles set name = 'Cy Cole' where id = '${C}'`)
  const create = async (cols, vals) => {
    const r = await as(ADMIN, `insert into public.member_events (title, starts_at, ends_at, timezone, city, ${cols}) values ($1, now() + interval '2 days', now() + interval '2 days 3 hours', 'Europe/London', 'London', ${vals}) returning id`, ['Operators dinner'])
    return r.rows?.[0]?.id
  }
  const mine = async (uid, id) => ((await as(uid, `select public.list_member_events() l`)).rows?.[0]?.l ?? []).find(e => e.id === id)
  const rsvp = async (uid, id, choice) => (await as(uid, `select public.rsvp_event($1, $2) s`, [id, choice]))
  const statusOf = async (id, uid) => (await svc(`select status from public.event_rsvps where event_id = '${id}' and user_id = '${uid}'`))[0]?.status
  const notes = async (uid, kind) => (await svc(`select count(*)::int n from public.notifications where user_id = '${uid}' and kind = '${kind}'`))[0].n

  // Creating events: admins only.
  ok(!!(await as(A, `insert into public.member_events (title, starts_at, ends_at, city) values ('My party', now() + interval '1 day', now() + interval '1 day 2 hours', 'Paris')`)).error, 'members cannot create events')
  ok(!!(await as(A, `select public.rsvp_event(gen_random_uuid(), 'going')`)).error, 'members cannot reply to an event that does not exist')
  const E1 = await create(`venue, capacity, status, host_id`, `'1 Secret Street', 1, 'published', '${B}'`)
  ok(!!E1, 'admins create and publish an event')
  ok(!!(await as(ADMIN, `insert into public.member_events (title, starts_at, ends_at, format, join_url) values ('Virtual hour', now() + interval '1 day', now() + interval '1 day 1 hour', 'virtual', 'http://insecure.example.com')`)).error, 'join links must be https')
  ok(!!(await as(ADMIN, `insert into public.member_events (title, starts_at, ends_at, timezone, city) values ('Bad zone', now() + interval '1 day', now() + interval '1 day 1 hour', 'Mars/Olympus', 'Rome')`)).error, 'the time zone must be real')
  ok(!!(await as(ADMIN, `insert into public.member_events (title, starts_at, ends_at, city) values ('Backwards', now() + interval '1 day', now() + interval '20 hours', 'Rome')`)).error, 'events must end after they start')
  const DRAFT = await create(`status`, `'draft'`)
  ok((await as(A, `select id from public.member_events where id = $1`, [DRAFT])).rows?.length === 0, 'drafts are hidden from members')
  ok(!!(await rsvp(A, DRAFT, 'going')).error, 'members cannot reply to a draft')
  ok((await as(A, `select id from public.member_events where id = $1`, [E1])).rows?.length === 1, 'published events are visible to members')
  ok(!!(await as(null, `select public.list_member_events()`)).error, 'signed-out visitors see nothing')

  // Capacity and the waitlist.
  ok((await rsvp(A, E1, 'going')).rows?.[0]?.s === 'going', 'the first reply takes the only place')
  ok((await rsvp(B, E1, 'going')).rows?.[0]?.s === 'waitlist', 'a full room puts the next reply on the waitlist')
  ok((await rsvp(C, E1, 'going')).rows?.[0]?.s === 'waitlist', 'and the one after')
  ok((await rsvp(A, E1, 'going')).rows?.[0]?.s === 'going', 'replying going again changes nothing')
  ok((await mine(C, E1))?.waitlist_position === 2, 'waitlisted members see their place in the queue')
  ok(!!(await as(B, `insert into public.event_rsvps (event_id, user_id, status) values ($1, $2, 'going')`, [E1, C])).error, 'replies cannot be written directly')
  ok(!!(await as(B, `update public.event_rsvps set status = 'going' where user_id = '${B}'`)).error, 'nor can a waitlisted member move themselves up')
  ok((await statusOf(E1, B)) === 'waitlist', 'the waitlist holds')

  // Address and link only for people going.
  ok(!!(await as(A, `select venue from public.member_events`)).error, 'the venue cannot be read from the table')
  ok(!!(await as(A, `select join_url from public.member_events`)).error, 'nor the join link')
  ok((await mine(A, E1))?.venue === '1 Secret Street', 'members going see the venue')
  ok((await mine(C, E1))?.venue == null, 'waitlisted members do not')
  ok((await mine(B, E1))?.venue === '1 Secret Street', 'the host does')

  // Attendee list.
  let r = await as(A, `select public.event_attendees($1) a`, [E1])
  ok(r.rows?.[0]?.a?.length === 1 && r.rows[0].a[0].name === 'Ada Archer' && !('status' in r.rows[0].a[0]), 'attendees see the names of people going')
  ok(!!(await as(C, `select public.event_attendees($1)`, [E1])).error, 'waitlisted members do not see the list')
  r = await as(B, `select public.event_attendees($1) a`, [E1])
  ok(r.rows?.[0]?.a?.length === 3 && r.rows[0].a.every(x => x.email == null), 'the host sees everyone who replied, without emails')
  r = await as(ADMIN, `select public.event_attendees($1) a`, [E1])
  ok(r.rows?.[0]?.a?.some(x => x.email === 'ada@example.com'), 'admins also see emails for the export')
  ok((await as(C, `select user_id from public.event_rsvps`)).rows?.length === 1, "members read only their own reply rows")

  // Dropping out promotes the earliest waitlisted member, who is told.
  ok((await rsvp(A, E1, 'declined')).rows?.[0]?.s === 'declined', 'a member drops out')
  ok((await statusOf(E1, B)) === 'going' && (await statusOf(E1, C)) === 'waitlist', 'the earliest waitlisted member moves up')
  ok((await notes(B, 'event_promoted')) === 1 && (await notes(C, 'event_promoted')) === 0, 'and only they are told')
  ok((await rsvp(A, E1, 'going')).rows?.[0]?.s === 'waitlist', 'coming back joins the end of the waitlist')
  ok((await mine(A, E1))?.waitlist_position === 2, 'behind those already waiting')
  ok(!(await as(ADMIN, `update public.member_events set capacity = 3 where id = $1`, [E1])).error, 'admins add places')
  ok((await statusOf(E1, C)) === 'going' && (await statusOf(E1, A)) === 'going', 'more room moves the waitlist up')

  // Hosts edit only their own event, and only its description.
  ok(!(await as(B, `update public.member_events set description = 'Bring one question.' where id = $1`, [E1])).error, 'the host edits the description')
  ok((await svc(`select description from public.member_events where id = '${E1}'`))[0].description === 'Bring one question.', 'and it is saved')
  ok(!!(await as(B, `update public.member_events set title = 'My dinner' where id = $1`, [E1])).error, 'but cannot change anything else')
  ok(!!(await as(B, `update public.member_events set capacity = 100 where id = $1`, [E1])).error, 'such as the capacity')
  await as(C, `update public.member_events set description = 'hijack' where id = '${E1}'`)
  ok((await svc(`select description from public.member_events where id = '${E1}'`))[0].description === 'Bring one question.', 'other members cannot edit it')
  const OTHER = await create(`status`, `'published'`)
  await as(B, `update public.member_events set description = 'not mine' where id = '${OTHER}'`)
  ok((await svc(`select description from public.member_events where id = '${OTHER}'`))[0].description === '', 'hosts cannot edit events they do not host')

  // Invite-only events.
  const INV = await create(`visibility, status`, `'invite_only', 'published'`)
  ok(!(await as(ADMIN, `insert into public.event_invites (event_id, user_id) values ($1, $2)`, [INV, A])).error, 'admins invite a member')
  ok(!!(await as(A, `insert into public.event_invites (event_id, user_id) values ($1, $2)`, [INV, C])).error, 'members cannot invite')
  ok((await notes(A, 'event_invite')) === 1, 'the invitee is told')
  ok((await as(C, `select id from public.member_events where id = $1`, [INV])).rows?.length === 0 && !(await mine(C, INV)), 'others cannot see the event')
  ok(!!(await rsvp(C, INV, 'going')).error, 'nor reply to it')
  ok(!!(await mine(A, INV)) && (await rsvp(A, INV, 'going')).rows?.[0]?.s === 'going', 'the invitee sees it and replies')
  ok(!(await as(ADMIN, `delete from public.event_invites where event_id = $1 and user_id = $2`, [INV, A])).error, 'admins withdraw an invite')
  ok((await statusOf(INV, A)) === undefined && !(await mine(A, INV)), 'which withdraws the reply and hides the event')
  const LATER = await create(`visibility, status`, `'invite_only', 'draft'`)
  await as(ADMIN, `insert into public.event_invites (event_id, user_id) values ('${LATER}', '${C}')`)
  ok((await notes(C, 'event_invite')) === 0, 'invites to a draft wait until it is published')
  await as(ADMIN, `update public.member_events set status = 'published' where id = '${LATER}'`)
  await as(ADMIN, `update public.member_events set description = 'Updated' where id = '${LATER}'`)
  ok((await notes(C, 'event_invite')) === 1, 'then the invitee is told once')

  // Reminders, once per reply, about 24 hours ahead.
  const SOON = (await as(ADMIN, `insert into public.member_events (title, starts_at, ends_at, format, status) values ('Virtual hour', now() + interval '10 hours', now() + interval '11 hours', 'virtual', 'published') returning id`)).rows?.[0]?.id
  await rsvp(A, SOON, 'going'); await rsvp(B, SOON, 'declined')
  ok(!!(await as(A, `select public.send_event_reminders()`)).error, 'members cannot send reminders')
  ok((await svc(`select public.send_event_reminders() n`))[0].n === 1, 'the reminder job tells the member going (not the one who declined, nor events days away)')
  ok((await svc(`select public.send_event_reminders() n`))[0].n === 0 && (await notes(A, 'event_reminder')) === 1, 'and never twice')

  // Cancelling tells everyone going or waitlisted.
  await rsvp(C, OTHER, 'declined')
  ok(!(await as(ADMIN, `update public.member_events set status = 'cancelled' where id = $1`, [E1])).error, 'admins cancel an event')
  ok((await notes(A, 'event_cancelled')) === 1 && (await notes(B, 'event_cancelled')) === 1 && (await notes(C, 'event_cancelled')) === 1, 'everyone going is told')
  ok(!!(await rsvp(A, E1, 'going')).error, 'cancelled events take no replies')
  ok(!!(await as(ADMIN, `delete from public.member_events where id = $1`, [E1])).error || (await svc(`select count(*)::int n from public.member_events where id = '${E1}'`))[0].n === 1, 'published events are cancelled, not deleted')
  ok(!(await as(ADMIN, `delete from public.member_events where id = $1`, [DRAFT])).error && (await svc(`select count(*)::int n from public.member_events where id = '${DRAFT}'`))[0].n === 0, 'drafts can be deleted')

  // Past events take no new replies.
  await svc(`insert into public.member_events (id, title, starts_at, ends_at, city, status) values ('99999999-9999-4999-8999-999999999999', 'Last month', now() - interval '30 days', now() - interval '30 days' + interval '2 hours', 'Oslo', 'published')`)
  ok(!!(await rsvp(A, '99999999-9999-4999-8999-999999999999', 'going')).error, 'past events take no new replies')
}
