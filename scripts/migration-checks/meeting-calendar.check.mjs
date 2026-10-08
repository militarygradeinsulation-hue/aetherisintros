// 0033 scheduled meetings land in each participant's own calendar
export default async ({ ok, as, svc, A, B, C }) => {
  const at = '2026-11-02T15:00:00Z'
  const m = (await as(A, `select public.create_meeting('Board prep', array['${B}']::uuid[], $1::timestamptz, 'Review the deck', null) as id`, [at])).rows[0].id
  let r = await svc(`select user_id, title, location, starts_at, ends_at, notes from public.calendar_events where meeting_id = '${m}' order by user_id`)
  ok(r.length === 2 && r.map(e => e.user_id).sort().join() === [A, B].sort().join(), 'each participant gets their own calendar entry')
  ok(r.every(e => e.title === 'Board prep' && e.location === 'Ask Intros video' && new Date(e.starts_at).toISOString() === '2026-11-02T15:00:00.000Z'
    && new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime() === 45 * 60000 && e.notes.includes('Review the deck')), 'entries carry the time, a 45-minute slot and the agenda')
  ok((await as(B, `select id from public.calendar_events where meeting_id = $1`, [m])).rows.length === 1, 'participants see only their own entry')
  ok((await as(C, `select id from public.calendar_events where meeting_id = $1`, [m])).rows.length === 0, 'outsiders see none')

  const now = (await as(A, `select public.create_meeting('Quick call', array['${B}']::uuid[]) as id`)).rows[0].id
  ok((await svc(`select count(*)::int n from public.calendar_events where meeting_id = '${now}'`))[0].n === 0, 'meetings started now are not added to calendars')

  r = await as(C, `insert into public.calendar_events (user_id, title, starts_at, ends_at, meeting_id) values ($1, 'Fake', now(), now(), $2) returning meeting_id`, [C, m])
  ok(r.rows?.[0]?.meeting_id === null, 'members cannot link their own entries to a meeting')
  r = await as(B, `update public.calendar_events set meeting_id = $2, starts_at = $3::timestamptz where meeting_id = $1 returning meeting_id, starts_at`, [m, now, '2026-11-02T16:00:00Z'])
  ok(r.rows?.[0]?.meeting_id === m && new Date(r.rows[0].starts_at).toISOString() === '2026-11-02T16:00:00.000Z', 'members can move their entry but not relink it')
  ok((await as(B, `delete from public.calendar_events where meeting_id = $1 returning id`, [m])).rows.length === 1, 'members can remove the entry from their calendar')
}
